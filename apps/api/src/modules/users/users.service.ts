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

    try {
      const changeToken = await tokenService.createToken({
        userId: user.id,
        type: 'email_change',
      });
      await sendEmailChangeVerificationEmail(newEmail, changeToken);
      logger.info(
        `Email change verification sent to ${newEmail} for user ${userId}`
      );
    } catch (error) {
      logger.error('Failed to send email change verification', {
        userId,
        newEmail,
        error,
      });
      throw new AppError('Failed to send verification email', 500);
    }
  }

  async confirmEmailChangeWithEmail(
    token: string,
    newEmail: string
  ): Promise<void> {
    validateEmail(newEmail);

    const validation = await tokenService.validateToken(token, 'email_change');

    if (!validation.valid || !validation.userId) {
      throw new AppError(validation.error || 'Invalid token', 400);
    }

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

    logger.info(`Email changed for user ${validation.userId} to ${newEmail}`);
  }
}

export default new UsersService();
