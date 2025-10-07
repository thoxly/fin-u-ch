import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import accountsService from './accounts.service';

export class AccountsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountsService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountsService.getById(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountsService.create(req.companyId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountsService.update(req.params.id, req.companyId!, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountsService.delete(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new AccountsController();

