import { Request, Response, NextFunction } from 'express';
import authService from './auth.service';
import passwordResetService from './password-reset.service';
import usersService from '../users/users.service';
import tokenService from '../../services/mail/token.service';
import prisma from '../../config/db';
import logger from '../../config/logger';
import { AppError } from '../../middlewares/error';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('User registration request', {
        email: req.body.email,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const result = await authService.register(req.body);

      logger.info('User registered successfully', {
        userId: result.user.id,
        email: result.user.email,
        companyId: result.user.companyId,
      });

      res.status(201).json(result);
    } catch (error) {
      logger.error('User registration failed', {
        email: req.body.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
      });
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('User login request', {
        email: req.body.email,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const result = await authService.login(req.body);

      logger.info('User logged in successfully', {
        userId: result.user.id,
        email: result.user.email,
        companyId: result.user.companyId,
        ip: req.ip,
      });

      res.json(result);
    } catch (error) {
      logger.warn('User login failed', {
        email: req.body.email,
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip,
      });
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      logger.debug('Token refresh request', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken);

      logger.debug('Token refreshed successfully', {
        userId: result.user.id,
        ip: req.ip,
      });

      res.json(result);
    } catch (error) {
      logger.warn('Token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip,
      });
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Email verification request', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const { token } = req.body;
      await authService.verifyEmail(token);

      logger.info('Email verified successfully', {
        ip: req.ip,
      });

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      logger.error('Email verification failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
      });
      next(error);
    }
  }

  async resendVerificationEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      logger.info('Resend verification email request', {
        email: req.body.email,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const { email } = req.body;
      await authService.resendVerificationEmail(email);

      logger.info('Verification email sent', {
        email,
        ip: req.ip,
      });

      res.json({ message: 'Verification email sent' });
    } catch (error) {
      logger.error('Failed to resend verification email', {
        email: req.body.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
      });
      next(error);
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Password reset request', {
        email: req.body.email,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const { email } = req.body;
      await passwordResetService.requestPasswordReset(email);

      logger.info('Password reset link sent', {
        email,
        ip: req.ip,
      });

      res.json({
        message: 'If email exists, password reset link has been sent',
      });
    } catch (error) {
      logger.error('Password reset request failed', {
        email: req.body.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
      });
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Password reset attempt', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const { token, newPassword } = req.body;
      await passwordResetService.resetPassword(token, newPassword);

      logger.info('Password reset successfully', {
        ip: req.ip,
      });

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      logger.error('Password reset failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
      });
      next(error);
    }
  }

  async confirmOldEmailForChange(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      logger.info('Confirm old email for change (public)', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const { token } = req.body;

      // Валидируем токен и получаем userId
      const validation = await tokenService.validateToken(
        token,
        'email_change_old'
      );

      if (!validation.valid || !validation.userId) {
        throw new AppError(validation.error || 'Invalid token', 400);
      }

      // Получаем companyId из базы данных по userId
      const user = await prisma.user.findUnique({
        where: { id: validation.userId },
        select: { companyId: true },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Вызываем метод сервиса
      await usersService.confirmOldEmailForChange(token, user.companyId);

      logger.info('Old email confirmed for change (public)', {
        userId: validation.userId,
        companyId: user.companyId,
        ip: req.ip,
      });

      res.json({
        message:
          'Старый email подтверждён. Письмо с подтверждением отправлено на новый email адрес',
      });
    } catch (error) {
      logger.error('Failed to confirm old email for change (public)', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
      });
      next(error);
    }
  }

  async confirmEmailChange(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Confirm email change (public)', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const { token } = req.body;

      // Валидируем токен и получаем userId
      const validation = await tokenService.validateToken(
        token,
        'email_change_new'
      );

      if (!validation.valid || !validation.userId) {
        throw new AppError(validation.error || 'Invalid token', 400);
      }

      // Получаем companyId из базы данных по userId
      const user = await prisma.user.findUnique({
        where: { id: validation.userId },
        select: { companyId: true },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Вызываем метод сервиса
      await usersService.confirmEmailChangeWithEmail(token, user.companyId);

      logger.info('Email changed successfully (public)', {
        userId: validation.userId,
        companyId: user.companyId,
        ip: req.ip,
      });

      res.json({ message: 'Email changed successfully' });
    } catch (error) {
      logger.error('Failed to confirm email change (public)', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
      });
      next(error);
    }
  }

  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Accept invitation request received', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      const { token, password } = req.body;

      if (!token || !password) {
        throw new AppError('Token and password are required', 400);
      }

      const result = await authService.acceptInvitation(token, password);

      logger.info('Invitation accepted successfully', {
        userId: result.user.id,
        email: result.user.email,
        ip: req.ip,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to accept invitation', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ip: req.ip,
      });
      next(error);
    }
  }
}

export default new AuthController();
