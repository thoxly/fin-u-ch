import { Request, Response, NextFunction } from 'express';
import authService from './auth.service';
import passwordResetService from './password-reset.service';
import logger from '../../config/logger';

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
}

export default new AuthController();
