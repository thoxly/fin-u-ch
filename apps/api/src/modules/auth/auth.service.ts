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

      console.log('Создана компания при регистрации:', {
        id: company.id,
        name: company.name,
        currencyBase: company.currencyBase,
        createdAt: company.createdAt,
      });

      // Проверяем, является ли это первым пользователем компании
      const usersCount = await tx.user.count({
        where: { companyId: company.id },
      });

      const isFirstUser = usersCount === 0;

      console.log(
        '[AuthService.register] Проверка первого пользователя компании:',
        {
          companyId: company.id,
          usersCount,
          isFirstUser,
        }
      );

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          companyId: company.id,
          isSuperAdmin: isFirstUser, // Первый пользователь компании автоматически становится супер-администратором
        },
      });

      console.log('Создан пользователь при регистрации:', {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        createdAt: user.createdAt,
        isFirstUser,
      });

      if (isFirstUser) {
        console.log(
          '[AuthService.register] Первый пользователь компании назначен супер-администратором:',
          {
            userId: user.id,
            email: user.email,
            companyId: company.id,
          }
        );
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
    console.log(
      '[AuthService.register] Получение активных ролей компании после регистрации',
      {
        companyId: result.company.id,
      }
    );
    try {
      const roles = await rolesService.getAllRoles(result.company.id);
      console.log(
        '[AuthService.register] Активные роли компании после регистрации:',
        {
          companyId: result.company.id,
          rolesCount: roles.length,
          roles: roles.map((r: any) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            isSystem: r.isSystem,
            usersCount: r._count?.userRoles || 0,
          })),
        }
      );
    } catch (error) {
      console.log(
        '[AuthService.register] Ошибка при получении ролей (возможно, роли еще не созданы):',
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

    // Получаем активные роли компании при авторизации
    console.log(
      '[AuthService.login] Получение активных ролей компании при авторизации',
      {
        companyId: user.companyId,
        userId: user.id,
      }
    );
    try {
      const roles = await rolesService.getAllRoles(user.companyId);
      console.log(
        '[AuthService.login] Активные роли компании при авторизации:',
        {
          companyId: user.companyId,
          userId: user.id,
          rolesCount: roles.length,
          roles: roles.map((r: any) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            isSystem: r.isSystem,
            usersCount: r._count?.userRoles || 0,
          })),
        }
      );
    } catch (error) {
      console.log('[AuthService.login] Ошибка при получении ролей:', {
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
}

export default new AuthService();
