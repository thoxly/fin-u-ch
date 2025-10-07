import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import operationsService from './operations.service';

export class OperationsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        type: req.query.type as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        articleId: req.query.articleId as string,
        dealId: req.query.dealId as string,
        departmentId: req.query.departmentId as string,
        counterpartyId: req.query.counterpartyId as string,
      };

      const result = await operationsService.getAll(req.companyId!, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await operationsService.getById(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await operationsService.create(req.companyId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await operationsService.update(req.params.id, req.companyId!, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await operationsService.delete(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new OperationsController();

