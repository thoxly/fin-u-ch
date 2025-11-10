import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { hashPassword, verifyPassword } from '../../utils/hash';
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '../../utils/validation';
import {
  sendPasswordChangedEmail,
  sendEmailChangeOldVerificationEmail,
  sendEmailChangeVerificationEmail,
} from '../../services/mail/mail.service';
import tokenService from '../../services/mail/token.service';
import logger from '../../config/logger';

export class UsersService {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        isActive: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            currencyBase: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      ...user,
      companyName: user.company.name,
    };
  }

  async getAll(companyId: string) {
    return prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateMe(
    userId: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      isActive?: boolean;
    }
  ) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        isActive: true,
        company: {
          select: {
            id: true,
            name: true,
            currencyBase: true,
          },
        },
      },
    });

    return {
      ...updatedUser,
      companyName: updatedUser.company.name,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    validateRequired({ currentPassword, newPassword });
    validatePassword(newPassword);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isPasswordValid = await verifyPassword(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Отправляем уведомление об изменении пароля
    try {
      await sendPasswordChangedEmail(user.email);
    } catch (error) {
      logger.error('Failed to send password changed email', {
        userId,
        error,
      });
      // Не блокируем смену пароля, если письмо не отправилось
    }

    logger.info(`Password changed for user ${userId}`);
  }

  async requestEmailChange(userId: string, newEmail: string) {
    validateEmail(newEmail);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.email === newEmail) {
      throw new AppError('New email is the same as current email', 400);
    }

    // Проверяем, не занят ли новый email
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    // Используем транзакцию для атомарности процесса смены email
    let oldEmailToken: string | null = null;
    try {
      // Создаем токен (tokenService создает его в БД)
      oldEmailToken = await tokenService.createToken({
        userId: user.id,
        type: 'email_change_old',
        metadata: { newEmail },
      });

      // Отправляем письмо на старый email для подтверждения
      // Если отправка не удастся, удалим токен
      try {
        await sendEmailChangeOldVerificationEmail(
          user.email,
          newEmail,
          oldEmailToken
        );
        logger.info('Email change verification sent to old email', {
          userId,
        });
      } catch (emailError) {
        // Если отправка email не удалась, удаляем созданный токен
        if (oldEmailToken) {
          try {
            await tokenService.markTokenAsUsed(oldEmailToken);
          } catch (deleteError) {
            logger.error('Failed to cleanup token after email send failure', {
              userId,
              error: deleteError,
            });
          }
        }
        throw emailError;
      }
    } catch (error) {
      logger.error('Failed to send email change verification', {
        userId,
        error,
      });
      throw new AppError('Failed to send verification email', 500);
    }
  }

  async confirmOldEmailForChange(token: string): Promise<void> {
    const validation = await tokenService.validateToken(
      token,
      'email_change_old'
    );

    if (!validation.valid || !validation.userId) {
      throw new AppError(validation.error || 'Invalid token', 400);
    }

    const newEmail = validation.metadata?.newEmail as string | undefined;

    if (!newEmail) {
      throw new AppError('New email not found in token', 400);
    }

    validateEmail(newEmail);

    // Проверяем, не занят ли новый email
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    // Используем транзакцию для атомарности процесса
    let newEmailToken: string | null = null;
    try {
      await prisma.$transaction(async (tx) => {
        // Помечаем токен старого email как использованный в транзакции
        await tx.emailToken.update({
          where: { token },
          data: { used: true },
        });
      });

      // Создаем токен для нового email
      newEmailToken = await tokenService.createToken({
        userId: validation.userId,
        type: 'email_change_new',
        metadata: { newEmail },
      });

      // Отправляем письмо на новый email для подтверждения
      // Если отправка не удастся, удалим токен
      try {
        await sendEmailChangeVerificationEmail(newEmail, newEmailToken);
        logger.info('Email change verification sent to new email', {
          userId: validation.userId,
        });
      } catch (emailError) {
        // Если отправка email не удалась, удаляем созданный токен
        if (newEmailToken) {
          try {
            await tokenService.markTokenAsUsed(newEmailToken);
          } catch (deleteError) {
            logger.error('Failed to cleanup token after email send failure', {
              userId: validation.userId,
              error: deleteError,
            });
          }
        }
        throw emailError;
      }
    } catch (error) {
      logger.error('Failed to send email change verification to new email', {
        userId: validation.userId,
        error,
      });
      throw new AppError(
        'Failed to send verification email to new address',
        500
      );
    }
  }

  async confirmEmailChangeWithEmail(token: string): Promise<void> {
    const validation = await tokenService.validateToken(
      token,
      'email_change_new'
    );

    if (!validation.valid || !validation.userId) {
      throw new AppError(validation.error || 'Invalid token', 400);
    }

    const newEmail = validation.metadata?.newEmail as string | undefined;

    if (!newEmail) {
      throw new AppError('New email not found in token', 400);
    }

    validateEmail(newEmail);

    // Проверяем, не занят ли новый email
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser) {
      throw new AppError('Email already in use', 409);
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: validation.userId },
        data: {
          email: newEmail,
          isEmailVerified: true, // Новый email считается подтвержденным
        },
      });

      await tokenService.markTokenAsUsed(token);
    });

    logger.info('Email changed successfully', {
      userId: validation.userId,
    });
  }
}

export default new UsersService();
