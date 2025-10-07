import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import planfactService from './planfact.service';

export class PlanFactController {
  async getPlanFact(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        periodFrom: req.query.periodFrom ? new Date(req.query.periodFrom as string) : new Date(new Date().getFullYear(), 0, 1),
        periodTo: req.query.periodTo ? new Date(req.query.periodTo as string) : new Date(),
        level: (req.query.level as 'article' | 'department' | 'deal') || 'article',
      };

      const result = await planfactService.getPlanFact(req.companyId!, params);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new PlanFactController();

