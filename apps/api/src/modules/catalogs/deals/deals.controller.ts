import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import dealsService from './deals.service';

export class DealsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await dealsService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await dealsService.getById(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await dealsService.create(req.companyId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await dealsService.update(req.params.id, req.companyId!, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await dealsService.delete(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new DealsController();

