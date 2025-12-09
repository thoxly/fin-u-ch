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
// import subscriptionService from '../subscription/subscription.service';
import promoCodeService from '../subscription/promo-code.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

export interface RegisterDTO {
  email: string;
  password: string;
  companyName: string;
  promoCode?: string; // Опциональный промокод для Beta-доступа
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

        // Создаем подписку START по умолчанию
        await tx.subscription.create({
          data: {
            companyId: company.id,
            plan: SubscriptionPlan.START,
            status: SubscriptionStatus.ACTIVE,
            promoCode: null,
          },
        });

        logger.info('Default START subscription created', {
          companyId: company.id,
        });

        // Генерируем персональный промокод для пользователя (для бета-программы)
        const personalPromoCode =
          await promoCodeService.generatePersonalPromoCode(user.id);
        logger.info('Personal promo code generated for user', {
          userId: user.id,
          promoCode: personalPromoCode,
        });

        return { user, company, personalPromoCode };
      });

      // Применяем промокод, если он указан
      let appliedPromoCode: string | null = null;
      if (data.promoCode) {
        try {
          logger.info('Applying promo code during registration', {
            companyId: result.company.id,
            promoCode: data.promoCode,
          });

          const promoResult = await promoCodeService.applyPromoCode(
            result.company.id,
            data.promoCode
          );

          appliedPromoCode = promoResult.promoCode.code;
          logger.info('Promo code applied successfully during registration', {
            companyId: result.company.id,
            promoCode: appliedPromoCode,
            plan: promoResult.subscription.plan,
          });
        } catch (error) {
          logger.warn('Failed to apply promo code during registration', {
            companyId: result.company.id,
            promoCode: data.promoCode,
            error: error instanceof Error ? error.message : String(error),
          });
          // Не прерываем регистрацию, если промокод невалиден
          // Просто логируем предупреждение
        }
      }

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
              _count?: { userRoles: number };
            }) => ({
              id: r.id,
              name: r.name,
              category: r.category,
              isSystem: r.isSystem,
              usersCount: r._count?.userRoles || 0,
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
      console.error('[AuthService.register] ОШИБКА при регистрации:', {
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
            _count?: { userRoles: number };
          }) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            isSystem: r.isSystem,
            usersCount: r._count?.userRoles || 0,
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

  async acceptInvitation(
    token: string,
    password: string
  ): Promise<TokensResponse> {
    validateRequired({ token, password });
    validatePassword(password);

    const validation = await tokenService.validateToken(
      token,
      'user_invitation'
    );

    if (!validation.valid || !validation.userId) {
      logger.warn(
        'Invitation acceptance attempted with invalid or expired token',
        {
          error: validation.error,
        }
      );
      throw new AppError(validation.error || 'Invalid or expired token', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: validation.userId },
      select: {
        id: true,
        email: true,
        companyId: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isActive) {
      throw new AppError('Invitation already accepted', 400);
    }

    const roleIds: string[] = (validation.metadata?.roleIds as string[]) || [];
    const companyId = validation.metadata?.companyId as string | undefined;
    const invitedBy = validation.metadata?.invitedBy as string | undefined;

    // Проверяем, что компания из токена совпадает с компанией пользователя
    if (companyId && companyId !== user.companyId) {
      logger.warn('Company mismatch in invitation token', {
        userId: user.id,
        tokenCompanyId: companyId,
        userCompanyId: user.companyId,
      });
      throw new AppError('Invalid invitation token', 400);
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      // Обновляем пароль, активируем пользователя и подтверждаем email
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          isActive: true,
          isEmailVerified: true,
        },
      });

      // Назначаем роли, если они были указаны в приглашении
      if (roleIds.length > 0) {
        // Удаляем старые роли (если есть)
        await tx.userRole.deleteMany({
          where: { userId: user.id },
        });

        // Создаём новые роли
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: user.id,
            roleId,
            assignedBy: invitedBy || user.id, // Используем ID пригласившего, если есть
          })),
        });
      }

      // Помечаем токен как использованный
      await tokenService.markTokenAsUsed(token);
    });

    logger.info('Invitation accepted successfully', {
      userId: user.id,
      email: user.email,
      roleIds,
    });

    // Генерируем токены для автоматического входа
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
}

export default new AuthService();
