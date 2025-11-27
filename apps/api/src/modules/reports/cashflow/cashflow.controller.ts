import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import cashflowService from './cashflow.service';

export class CashflowController {
  async getCashflow(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        periodFrom: req.query.periodFrom
          ? new Date(req.query.periodFrom as string)
          : new Date(new Date().getFullYear(), 0, 1),
        periodTo: req.query.periodTo
          ? new Date(req.query.periodTo as string)
          : new Date(),
        activity: req.query.activity as string | undefined,
        rounding: req.query.rounding
          ? parseInt(req.query.rounding as string, 10)
          : undefined,
        parentArticleId: req.query.parentArticleId as string | undefined,
      };

      const result = await cashflowService.getCashflow(req.companyId!, params);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new CashflowController();
