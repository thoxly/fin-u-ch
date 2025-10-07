import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import counterpartiesService from './counterparties.service';

export class CounterpartiesController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await counterpartiesService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await counterpartiesService.getById(
        req.params.id,
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await counterpartiesService.create(
        req.companyId!,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await counterpartiesService.update(
        req.params.id,
        req.companyId!,
        req.body
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await counterpartiesService.delete(
        req.params.id,
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new CounterpartiesController();
