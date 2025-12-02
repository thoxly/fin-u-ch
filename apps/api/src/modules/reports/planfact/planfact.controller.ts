import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import planfactService from './planfact.service';
import logger from '../../../config/logger';

export class PlanFactController {
  async getPlanFact(req: TenantRequest, res: Response, next: NextFunction) {
    const startTime = Date.now();
    try {
      const params = {
        periodFrom: req.query.periodFrom
          ? new Date(req.query.periodFrom as string)
          : new Date(new Date().getFullYear(), 0, 1),
        periodTo: req.query.periodTo
          ? new Date(req.query.periodTo as string)
          : new Date(),
        level:
          (req.query.level as 'article' | 'department' | 'deal') || 'article',
        parentArticleId: req.query.parentArticleId as string | undefined,
      };

      logger.info('PlanFact report request', {
        companyId: req.companyId,
        userId: req.userId,
        params: {
          periodFrom: params.periodFrom.toISOString(),
          periodTo: params.periodTo.toISOString(),
          level: params.level,
          parentArticleId: params.parentArticleId,
        },
      });

      const result = await planfactService.getPlanFact(req.companyId!, params);

      const duration = Date.now() - startTime;
      logger.info('PlanFact report generated successfully', {
        companyId: req.companyId,
        userId: req.userId,
        duration: `${duration}ms`,
        level: params.level,
      });

      res.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('PlanFact report generation failed', {
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

export default new PlanFactController();
