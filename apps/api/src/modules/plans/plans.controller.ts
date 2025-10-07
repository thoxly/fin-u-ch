import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import plansService from './plans.service';

export class PlansController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await plansService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await plansService.getById(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await plansService.create(req.companyId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await plansService.update(req.params.id, req.companyId!, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await plansService.delete(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new PlansController();

