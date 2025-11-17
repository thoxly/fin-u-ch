import prisma from '../../config/db';
import { hashPassword, verifyPassword } from '../../utils/hash';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '../../utils/validation';
import { AppError } from '../../middlewares/error';
import { seedInitialData } from './seed-initial-data';
import logger from '../../config/logger';
import { sendVerificationEmail } from '../../services/mail/mail.service';
import tokenService from '../../services/mail/token.service';

export interface RegisterDTO {
  email: string;
  password: string;
  companyName: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    companyId: string;
  };
}

export class AuthService {
  async register(data: RegisterDTO): Promise<TokensResponse> {
    validateRequired({
      email: data.email,
      password: data.password,
      companyName: data.companyName,
    });
    validateEmail(data.email);
    validatePassword(data.password);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Create company and user in a transaction
    const passwordHash = await hashPassword(data.password);

    // Используем правильный тип для транзакции
    type TransactionClient = Omit<
      typeof prisma,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >;

    let result;
    try {
      result = await prisma.$transaction(async (tx: TransactionClient) => {
        const company = await tx.company.create({
          data: {
            name: data.companyName,
          },
        });

        const user = await tx.user.create({
          data: {
            email: data.email,
            passwordHash,
            companyId: company.id,
            isEmailVerified: false,
          },
        });

        // Создаем начальные данные для компании
        try {
          await seedInitialData(tx, company.id);
        } catch (error) {
          logger.error('Failed to seed initial data', {
            companyId: company.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          throw error; // Пробрасываем ошибку для отката транзакции
        }

        return { user, company };
      });
    } catch (error: unknown) {
      // Обработка ошибок Prisma
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        // Unique constraint violation - race condition
        logger.error('Race condition detected during user registration', {
          email: data.email,
          error: error.message,
        });
        throw new AppError('User with this email already exists', 409);
      }

      // Логируем детали ошибки
      logger.error('Failed to create user and company', {
        email: data.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code:
          error && typeof error === 'object' && 'code' in error
            ? error.code
            : undefined,
      });

      // Если это уже AppError, пробрасываем как есть
      if (error instanceof AppError) {
        throw error;
      }

      // Иначе общая ошибка
      throw new AppError('Failed to register user. Please try again.', 500);
    }

    const accessToken = generateAccessToken({
      userId: result.user.id,
      email: result.user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: result.user.id,
      email: result.user.email,
    });

    // Send email verification email
    try {
      const verificationToken = await tokenService.createToken({
        userId: result.user.id,
        type: 'email_verification',
      });
      await sendVerificationEmail(result.user.email, verificationToken);
    } catch (error) {
      logger.error('Failed to send verification email', {
        userId: result.user.id,
        error,
      });
      // Don't block registration if email sending fails
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        companyId: result.user.companyId,
      },
    };
  }

  async login(data: LoginDTO): Promise<TokensResponse> {
    validateRequired({ email: data.email, password: data.password });
    validateEmail(data.email);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('User account is inactive', 403);
    }

    const isPasswordValid = await verifyPassword(
      data.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
      },
    };
  }

  async refresh(refreshToken: string): Promise<TokensResponse> {
    try {
      const payload = await import('../../utils/jwt').then((m) =>
        m.verifyToken(refreshToken)
      );

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token', 401);
      }

      const newAccessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      const newRefreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          companyId: user.companyId,
        },
      };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const validation = await tokenService.validateToken(
      token,
      'email_verification'
    );

    if (!validation.valid || !validation.userId) {
      throw new AppError(validation.error || 'Invalid token', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: validation.userId },
        data: { isEmailVerified: true },
      });

      await tokenService.markTokenAsUsed(token);
    });

    logger.info(`Email verified for user ${validation.userId}`);
  }

  async resendVerificationEmail(email: string): Promise<void> {
    validateEmail(email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Не раскрываем, существует ли пользователь
      return;
    }

    if (user.isEmailVerified) {
      throw new AppError('Email already verified', 400);
    }

    if (!user.isActive) {
      throw new AppError('User account is inactive', 403);
    }

    try {
      const verificationToken = await tokenService.createToken({
        userId: user.id,
        type: 'email_verification',
      });
      await sendVerificationEmail(user.email, verificationToken);
      logger.info(`Verification email resent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to resend verification email', {
        userId: user.id,
        error,
      });
      throw new AppError('Failed to send verification email', 500);
    }
  }
}

export default new AuthService();
