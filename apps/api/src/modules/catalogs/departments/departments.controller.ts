import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import departmentsService from './departments.service';

export class DepartmentsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await departmentsService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await departmentsService.getById(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await departmentsService.create(req.companyId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await departmentsService.update(req.params.id, req.companyId!, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await departmentsService.delete(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new DepartmentsController();

