import prisma from '../../config/db';
import { hashPassword } from '../../utils/hash';
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '../../utils/validation';
import { AppError } from '../../middlewares/error';
import logger from '../../config/logger';
import { sendPasswordResetEmail } from '../../services/mail/mail.service';
import tokenService from '../../services/mail/token.service';

export class PasswordResetService {
  async requestPasswordReset(email: string): Promise<void> {
    validateEmail(email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Не раскрываем, существует ли пользователь
      return;
    }

    if (!user.isActive) {
      throw new AppError('User account is inactive', 403);
    }

    try {
      const resetToken = await tokenService.createToken({
        userId: user.id,
        type: 'password_reset',
      });
      await sendPasswordResetEmail(user.email, resetToken);
      logger.info(`Password reset email sent to ${user.email}`);
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
      throw new AppError(validation.error || 'Invalid or expired token', 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: validation.userId },
        data: { passwordHash },
      });

      await tokenService.markTokenAsUsed(token);
    });

    logger.info(`Password reset for user ${validation.userId}`);
  }
}

export default new PasswordResetService();
