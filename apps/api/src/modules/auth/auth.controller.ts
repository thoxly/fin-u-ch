import { Request, Response, NextFunction } from 'express';
import authService from './auth.service';
import passwordResetService from './password-reset.service';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    console.log('[AuthController.register] Получен запрос на регистрацию', {
      method: req.method,
      url: req.url,
      body: {
        email: req.body?.email,
        companyName: req.body?.companyName,
        hasPassword: !!req.body?.password,
      },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    try {
      console.log('[AuthController.register] Вызов authService.register');
      const result = await authService.register(req.body);
      console.log('[AuthController.register] Регистрация успешна', {
        userId: result.user.id,
        email: result.user.email,
        companyId: result.user.companyId,
        hasAccessToken: !!result.accessToken,
      });
      res.status(201).json(result);
    } catch (error) {
      console.error('[AuthController.register] Ошибка при регистрации', {
        error: error instanceof Error ? error.message : String(error),
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      await authService.verifyEmail(token);
      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  }

  async resendVerificationEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { email } = req.body;
      await authService.resendVerificationEmail(email);
      res.json({ message: 'Verification email sent' });
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await passwordResetService.requestPasswordReset(email);
      res.json({
        message: 'If email exists, password reset link has been sent',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      await passwordResetService.resetPassword(token, newPassword);
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
