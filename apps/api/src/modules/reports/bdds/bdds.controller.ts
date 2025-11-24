import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import bddsService from './bdds.service';

export class BDDSController {
  async getBDDS(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        periodFrom: req.query.periodFrom
          ? new Date(req.query.periodFrom as string)
          : new Date(new Date().getFullYear(), 0, 1),
        periodTo: req.query.periodTo
          ? new Date(req.query.periodTo as string)
          : new Date(),
        budgetId: req.query.budgetId as string | undefined,
        parentArticleId: req.query.parentArticleId as string | undefined,
      };

      const activities = await bddsService.getBDDS(req.companyId!, params);
      const result = {
        periodFrom: params.periodFrom.toISOString().split('T')[0],
        periodTo: params.periodTo.toISOString().split('T')[0],
        budgetId: params.budgetId,
        activities,
      };
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new BDDSController();
