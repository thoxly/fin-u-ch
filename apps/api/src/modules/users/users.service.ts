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

// Вспомогательные функции для смены email
async function validateEmailChange(
  userId: string,
  newEmail: string,
  companyId: string
): Promise<{ user: { id: string; email: string } }> {
  validateEmail(newEmail);

  // Проверяем, что пользователь принадлежит к указанной компании
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      companyId: companyId,
    },
    select: { id: true, email: true, companyId: true },
  });

  if (!user) {
    throw new AppError('User not found or access denied', 404);
  }

  if (user.email === newEmail) {
    throw new AppError('New email is the same as current email', 400);
  }

  // Проверяем, что email не занят в рамках текущей компании
  // Используем findFirst с фильтром по companyId для предотвращения утечки данных между компаниями
  const existingUser = await prisma.user.findFirst({
    where: {
      email: newEmail,
      companyId: companyId,
    },
    select: { id: true, companyId: true },
  });

  if (existingUser) {
    // Если email занят другим пользователем из той же компании, это ошибка
    if (existingUser.id !== userId) {
      throw new AppError('Email already in use', 409);
    }
  }

  return { user };
}

async function createOldEmailToken(
  userId: string,
  newEmail: string
): Promise<string> {
  return await tokenService.createToken({
    userId,
    type: 'email_change_old',
    metadata: { newEmail },
  });
}

async function sendOldEmailVerification(
  oldEmail: string,
  newEmail: string,
  token: string,
  userId: string
): Promise<void> {
  try {
    await sendEmailChangeOldVerificationEmail(oldEmail, newEmail, token);
    logger.info('Email change verification sent to old email', { userId });
  } catch (error) {
    // Если отправка email не удалась, удаляем созданный токен
    try {
      await tokenService.markTokenAsUsed(token);
    } catch (cleanupError) {
      logger.error('Failed to cleanup token after email send failure', {
        userId,
        error: cleanupError,
      });
    }
    throw error;
  }
}

async function createNewEmailToken(
  userId: string,
  newEmail: string
): Promise<string> {
  return await tokenService.createToken({
    userId,
    type: 'email_change_new',
    metadata: { newEmail },
  });
}

async function sendNewEmailVerification(
  newEmail: string,
  token: string,
  userId: string
): Promise<void> {
  try {
    await sendEmailChangeVerificationEmail(newEmail, token);
    logger.info('Email change verification sent to new email', { userId });
  } catch (error) {
    // Если отправка email не удалась, удаляем созданный токен
    try {
      await tokenService.markTokenAsUsed(token);
    } catch (cleanupError) {
      logger.error('Failed to cleanup token after email send failure', {
        userId,
        error: cleanupError,
      });
    }
    throw error;
  }
}

export class UsersService {
  async getMe(userId: string, companyId: string) {
    // Проверяем, что пользователь принадлежит к указанной компании
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId,
      },
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
      throw new AppError('User not found or access denied', 404);
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
    companyId: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      isActive?: boolean;
    }
  ) {
    // Проверяем, что пользователь принадлежит к указанной компании перед обновлением
    const userCheck = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId,
      },
      select: { id: true, email: true },
    });

    if (!userCheck) {
      throw new AppError('User not found or access denied', 404);
    }

    // Если обновляется email, проверяем уникальность в рамках компании
    // Используем findFirst с фильтром по companyId для предотвращения утечки данных между компаниями
    if (data.email && data.email !== userCheck.email) {
      validateEmail(data.email);

      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          companyId: companyId,
        },
        select: { id: true, companyId: true },
      });

      if (existingUser) {
        // Если email занят другим пользователем из той же компании, это ошибка
        if (existingUser.id !== userId) {
          throw new AppError('Email already in use', 409);
        }
      }
    }

    // Обновляем пользователя (Prisma update поддерживает только уникальные поля в WHERE)
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
    companyId: string,
    currentPassword: string,
    newPassword: string
  ) {
    validateRequired({ currentPassword, newPassword });
    validatePassword(newPassword);

    // Проверяем, что пользователь принадлежит к указанной компании
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId,
      },
    });

    if (!user) {
      throw new AppError('User not found or access denied', 404);
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

  async requestEmailChange(
    userId: string,
    companyId: string,
    newEmail: string
  ) {
    const { user } = await validateEmailChange(userId, newEmail, companyId);

    try {
      const oldEmailToken = await createOldEmailToken(user.id, newEmail);
      await sendOldEmailVerification(
        user.email,
        newEmail,
        oldEmailToken,
        userId
      );
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

    // Получаем companyId пользователя для проверки безопасности
    const user = await prisma.user.findUnique({
      where: { id: validation.userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const newEmail = validation.metadata?.newEmail as string | undefined;

    if (!newEmail) {
      throw new AppError('New email not found in token', 400);
    }

    await validateEmailChange(validation.userId, newEmail, user.companyId);

    try {
      // Помечаем токен старого email как использованный в транзакции
      await prisma.$transaction(async (tx) => {
        await tx.emailToken.update({
          where: { token },
          data: { used: true },
        });
      });

      const newEmailToken = await createNewEmailToken(
        validation.userId,
        newEmail
      );
      await sendNewEmailVerification(
        newEmail,
        newEmailToken,
        validation.userId
      );
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

  async confirmEmailChangeWithEmail(
    token: string,
    companyId: string
  ): Promise<void> {
    const validation = await tokenService.validateToken(
      token,
      'email_change_new'
    );

    if (!validation.valid || !validation.userId) {
      throw new AppError(validation.error || 'Invalid token', 400);
    }

    // Проверяем, что пользователь принадлежит к указанной компании
    // Включаем companyId в WHERE условие для предотвращения утечки данных между компаниями
    const user = await prisma.user.findFirst({
      where: {
        id: validation.userId,
        companyId: companyId,
      },
      select: { companyId: true },
    });

    if (!user) {
      throw new AppError('User not found or access denied', 404);
    }

    const newEmail = validation.metadata?.newEmail as string | undefined;

    if (!newEmail) {
      throw new AppError('New email not found in token', 400);
    }

    validateEmail(newEmail);

    // Проверяем, не занят ли новый email в рамках текущей компании
    // Используем фильтр по companyId для предотвращения утечки данных между компаниями
    const existingUser = await prisma.user.findFirst({
      where: {
        email: newEmail,
        companyId: companyId,
      },
      select: { id: true, companyId: true },
    });

    if (existingUser) {
      // Если email занят другим пользователем из той же компании, это ошибка
      if (existingUser.id !== validation.userId) {
        throw new AppError('Email already in use', 409);
      }
    }

    await prisma.$transaction(async (tx) => {
      // Проверяем, что пользователь принадлежит к этой компании перед обновлением
      // (Prisma update поддерживает только уникальные поля в WHERE)
      const userCheck = await tx.user.findFirst({
        where: {
          id: validation.userId,
          companyId: companyId,
        },
        select: { id: true },
      });

      if (!userCheck) {
        throw new AppError('User not found or access denied', 404);
      }

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
