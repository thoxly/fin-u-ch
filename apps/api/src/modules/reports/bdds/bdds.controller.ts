import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import bddsService from './bdds.service';
import logger from '../../../config/logger';

export class BDDSController {
  async getBDDS(req: TenantRequest, res: Response, next: NextFunction) {
    const startTime = Date.now();
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

      logger.info('BDDS report request', {
        companyId: req.companyId,
        userId: req.userId,
        params: {
          periodFrom: params.periodFrom.toISOString(),
          periodTo: params.periodTo.toISOString(),
          budgetId: params.budgetId,
          parentArticleId: params.parentArticleId,
        },
      });

      const activities = await bddsService.getBDDS(req.companyId!, params);
      const result = {
        periodFrom: params.periodFrom.toISOString().split('T')[0],
        periodTo: params.periodTo.toISOString().split('T')[0],
        budgetId: params.budgetId,
        activities,
      };

      const duration = Date.now() - startTime;
      logger.info('BDDS report generated successfully', {
        companyId: req.companyId,
        userId: req.userId,
        duration: `${duration}ms`,
        activitiesCount: activities.length,
      });

      res.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('BDDS report generation failed', {
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

export default new BDDSController();
