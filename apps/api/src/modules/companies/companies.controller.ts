import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import companiesService from './companies.service';

export class CompaniesController {
  async get(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await companiesService.get(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await companiesService.update(req.companyId!, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new CompaniesController();
