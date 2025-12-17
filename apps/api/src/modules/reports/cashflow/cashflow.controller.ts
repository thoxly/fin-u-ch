import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import cashflowService from './cashflow.service';
import logger from '../../../config/logger';

export class CashflowController {
  async getCashflow(req: TenantRequest, res: Response, next: NextFunction) {
    const startTime = Date.now();
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

      const result = await cashflowService.getCashflow(req.companyId!, params);

      const duration = Date.now() - startTime;
      logger.info('Cashflow report generated successfully', {
        companyId: req.companyId,
        userId: req.userId,
        duration: `${duration}ms`,
        activitiesCount: result.activities.length,
      });

      res.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Cashflow report generation failed', {
        companyId: req.companyId,
        userId: req.userId,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
}

export default new CashflowController();
