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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
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
        },
      });

      // Создаем начальные данные для компании
      try {
        await seedInitialData(tx, company.id);
      } catch (error) {
        logger.error('Failed to seed initial data', {
          companyId: company.id,
          error,
        });
        throw new AppError('Failed to initialize company data', 500);
      }

      return { user, company };
    });

    const accessToken = generateAccessToken({
      userId: result.user.id,
      email: result.user.email,
    });

    const refreshToken = generateRefreshToken({
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
}

export default new AuthService();
