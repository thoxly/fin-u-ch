import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import usersService from './users.service';

export class UsersController {
  async getMe(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await usersService.getMe(req.userId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await usersService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await usersService.updateMe(req.userId!, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      await usersService.changePassword(
        req.userId!,
        currentPassword,
        newPassword
      );
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }

  async requestEmailChange(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { newEmail } = req.body;
      await usersService.requestEmailChange(req.userId!, newEmail);
      res.json({
        message: 'Verification email sent to your current email address',
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmOldEmailForChange(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { token } = req.body;
      await usersService.confirmOldEmailForChange(token);
      res.json({
        message:
          'Old email confirmed. Verification email sent to new email address',
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmEmailChange(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { token } = req.body;
      await usersService.confirmEmailChangeWithEmail(token, req.companyId);
      res.json({ message: 'Email changed successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export default new UsersController();
