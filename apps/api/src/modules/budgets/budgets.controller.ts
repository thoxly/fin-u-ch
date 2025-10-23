import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import budgetsService from './budgets.service';

export class BudgetsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const result = await budgetsService.getAll(req.companyId!, status);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await budgetsService.getById(
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
      const result = await budgetsService.create(req.companyId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await budgetsService.update(
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
      const result = await budgetsService.delete(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new BudgetsController();
