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
}

export default new UsersController();
