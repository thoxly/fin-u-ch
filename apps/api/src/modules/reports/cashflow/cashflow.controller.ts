import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import cashflowService from './cashflow.service';

export class CashflowController {
  async getCashflow(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const breakdown = req.query.breakdown as string | undefined;
      const validBreakdowns = [
        'activity',
        'deal',
        'account',
        'department',
        'counterparty',
      ];
      const validatedBreakdown =
        breakdown && validBreakdowns.includes(breakdown)
          ? (breakdown as
              | 'activity'
              | 'deal'
              | 'account'
              | 'department'
              | 'counterparty')
          : undefined;

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
<<<<<<< HEAD
        parentArticleId: req.query.parentArticleId as string | undefined,
        breakdown: validatedBreakdown,
      };

      logger.info('Cashflow report request', {
        companyId: req.companyId,
        userId: req.userId,
        params: {
          periodFrom: params.periodFrom.toISOString(),
          periodTo: params.periodTo.toISOString(),
          activity: params.activity,
          rounding: params.rounding,
          parentArticleId: params.parentArticleId,
          breakdown: params.breakdown,
        },
      });

=======
      };

>>>>>>> 1af8208
      const result = await cashflowService.getCashflow(req.companyId!, params);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new CashflowController();
