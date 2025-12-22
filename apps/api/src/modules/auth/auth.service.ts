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
import rolesService from '../roles/roles.service';
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
    try {
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
        throw new AppError('Пользователь с таким email уже существует', 409);
      }

      // Create company and user in a transaction
      const passwordHash = await hashPassword(data.password);

      const result = await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            name: data.companyName,
          },
        });

        logger.info('Company created during registration', {
          companyId: company.id,
          name: company.name,
          currencyBase: company.currencyBase,
          createdAt: company.createdAt,
        });

        // Проверяем, является ли это первым пользователем компании
        const usersCount = await tx.user.count({
          where: { companyId: company.id },
        });

        const isFirstUser = usersCount === 0;

        logger.debug('Checking if first user of company', {
          companyId: company.id,
          usersCount,
          isFirstUser,
        });

        const user = await tx.user.create({
          data: {
            email: data.email,
            passwordHash,
            companyId: company.id,
            isSuperAdmin: isFirstUser, // Первый пользователь компании автоматически становится супер-администратором
            isEmailVerified: false,
          },
        });

        logger.info('User created during registration', {
          userId: user.id,
          email: user.email,
          companyId: user.companyId,
          isActive: user.isActive,
          isSuperAdmin: user.isSuperAdmin,
          createdAt: user.createdAt,
          isFirstUser,
        });

        if (isFirstUser) {
          logger.info('First user assigned as super admin', {
            userId: user.id,
            email: user.email,
            companyId: company.id,
          });
        }

        // Создаем начальные данные для компании (передаём userId первого пользователя)
        try {
          await seedInitialData(tx, company.id, user.id);
        } catch (error) {
          logger.error('Failed to seed initial data', {
            companyId: company.id,
            error,
          });
          throw new AppError('Failed to initialize company data', 500);
        }

        return { user, company };
      });

      // Получаем активные роли компании после регистрации
      try {
        const roles = await rolesService.getAllRoles(result.company.id);
        logger.debug('Active company roles after registration', {
          companyId: result.company.id,
          rolesCount: roles.length,
          roles: roles.map(
            (r: {
              id: string;
              name: string;
              category: string;
              isSystem: boolean;
              _count?: { user_roles: number };
            }) => ({
              id: r.id,
              name: r.name,
              category: r.category,
              isSystem: r.isSystem,
              usersCount: r._count?.user_roles || 0,
            })
          ),
        });
      } catch (error) {
        logger.warn(
          'Failed to get roles after registration (roles may not be created yet)',
          {
            companyId: result.company.id,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }

      const accessToken = generateAccessToken({
        userId: result.user.id,
        email: result.user.email,
      });

      const refreshToken = generateRefreshToken({
        userId: result.user.id,
        email: result.user.email,
      });

      // Отправляем письмо подтверждения email
      try {
        logger.info('Creating verification token for user', {
          userId: result.user.id,
          email: result.user.email,
        });

        const verificationToken = await tokenService.createToken({
          userId: result.user.id,
          type: 'email_verification',
        });

        logger.info('Verification token created, sending email', {
          userId: result.user.id,
          email: result.user.email,
          tokenLength: verificationToken.length,
        });

        await sendVerificationEmail(result.user.email, verificationToken);

        logger.info('Verification email sent successfully', {
          userId: result.user.id,
          email: result.user.email,
        });
      } catch (error) {
        logger.error('Failed to send verification email', {
          userId: result.user.id,
          email: result.user.email,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Не блокируем регистрацию, если письмо не отправилось
      }

      logger.info('[AuthService.register] Регистрация успешна', {
        userId: result.user.id,
        email: result.user.email,
      });
      return {
        accessToken,
        refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          companyId: result.user.companyId,
        },
      };
    } catch (error) {
      logger.error('[AuthService.register] ОШИБКА при регистрации:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        email: data.email,
      });
      throw error;
    }
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

    // Получаем активные роли компании при авторизации
    try {
      const roles = await rolesService.getAllRoles(user.companyId);
      logger.debug('Active company roles during login', {
        companyId: user.companyId,
        userId: user.id,
        rolesCount: roles.length,
        roles: roles.map(
          (r: {
            id: string;
            name: string;
            category: string;
            isSystem: boolean;
            _count?: { user_roles: number };
          }) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            isSystem: r.isSystem,
            usersCount: r._count?.user_roles || 0,
          })
        ),
      });
    } catch (error) {
      logger.warn('Failed to get roles during login', {
        companyId: user.companyId,
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
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
