import prisma from '../../config/db';
import { hashPassword, verifyPassword } from '../../utils/hash';
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '../../utils/validation';
import { AppError } from '../../middlewares/error';
import logger from '../../config/logger';
import {
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from '../../services/mail/mail.service';
import tokenService from '../../services/mail/token.service';

export class PasswordResetService {
  async requestPasswordReset(email: string): Promise<void> {
    validateEmail(email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Не раскрываем, существует ли пользователь
      // Логируем попытку для безопасности без чувствительной информации
      logger.warn('Password reset requested for non-existent email');
      return;
    }

    if (!user.isActive) {
      logger.warn('Password reset requested for inactive user', {
        userId: user.id,
      });
      throw new AppError('User account is inactive', 403);
    }

    try {
      const resetToken = await tokenService.createToken({
        userId: user.id,
        type: 'password_reset',
      });
      await sendPasswordResetEmail(user.email, resetToken);
      logger.info('Password reset email sent', {
        userId: user.id,
      });
    } catch (error) {
      logger.error('Failed to send password reset email', {
        userId: user.id,
        error,
      });
      throw new AppError('Failed to send password reset email', 500);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    validateRequired({ token, newPassword });
    validatePassword(newPassword);

    const validation = await tokenService.validateToken(
      token,
      'password_reset'
    );

    if (!validation.valid || !validation.userId) {
      // Логируем попытку сброса пароля с невалидным токеном для безопасности
      logger.warn('Password reset attempted with invalid or expired token', {
        error: validation.error,
      });
      throw new AppError(validation.error || 'Invalid or expired token', 400);
    }

    // Получаем пользователя для проверки текущего пароля
    const user = await prisma.user.findUnique({
      where: { id: validation.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Проверяем, что новый пароль отличается от старого
    const isSamePassword = await verifyPassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      logger.warn(
        `Password reset attempted with same password for user ${validation.userId}`
      );
      throw new AppError(
        'New password must be different from the current password',
        400
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: validation.userId },
        data: { passwordHash },
      });

      await tokenService.markTokenAsUsed(token);
    });

    // Отправляем уведомление об изменении пароля
    try {
      await sendPasswordChangedEmail(user.email);
      logger.info('Password changed notification sent', {
        userId: validation.userId,
      });
    } catch (error) {
      logger.error('Failed to send password changed email', {
        userId: validation.userId,
        error,
      });
      // Не блокируем сброс пароля, если письмо не отправилось
    }

    logger.info('Password reset successfully', {
      userId: validation.userId,
    });
  }
}

export default new PasswordResetService();
