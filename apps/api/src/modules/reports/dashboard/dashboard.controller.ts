import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import dashboardService from './dashboard.service';
import logger from '../../../config/logger';

export class DashboardController {
  async getDashboard(req: TenantRequest, res: Response, next: NextFunction) {
    const startTime = Date.now();
    try {
      const params = {
        periodFrom: req.query.periodFrom
          ? new Date(req.query.periodFrom as string)
          : new Date(new Date().getFullYear(), 0, 1),
        periodTo: req.query.periodTo
          ? new Date(req.query.periodTo as string)
          : new Date(),
        mode: (req.query.mode as 'plan' | 'fact' | 'both') || 'fact',
        periodFormat: req.query.periodFormat as
          | 'day'
          | 'week'
          | 'month'
          | 'quarter'
          | 'year'
          | undefined,
      };

      logger.info('Dashboard data request', {
        companyId: req.companyId,
        userId: req.userId,
        params: {
          periodFrom: params.periodFrom.toISOString(),
          periodTo: params.periodTo.toISOString(),
          mode: params.mode,
          periodFormat: params.periodFormat,
        },
      });

      const result = await dashboardService.getDashboard(
        req.companyId!,
        params
      );

      const duration = Date.now() - startTime;
      logger.info('Dashboard data generated successfully', {
        companyId: req.companyId,
        userId: req.userId,
        duration: `${duration}ms`,
      });

      res.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Dashboard data generation failed', {
        companyId: req.companyId,
        userId: req.userId,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getCumulativeCashFlow(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    const startTime = Date.now();
    try {
      const params = {
        periodFrom: req.query.periodFrom
          ? new Date(req.query.periodFrom as string)
          : new Date(new Date().getFullYear(), 0, 1),
        periodTo: req.query.periodTo
          ? new Date(req.query.periodTo as string)
          : new Date(),
        mode: (req.query.mode as 'plan' | 'fact' | 'both') || 'fact',
        periodFormat: req.query.periodFormat as
          | 'day'
          | 'week'
          | 'month'
          | 'quarter'
          | 'year'
          | undefined,
      };

      logger.info('Cumulative cashflow request', {
        companyId: req.companyId,
        userId: req.userId,
        params: {
          periodFrom: params.periodFrom.toISOString(),
          periodTo: params.periodTo.toISOString(),
          mode: params.mode,
          periodFormat: params.periodFormat,
        },
      });

      const result = await dashboardService.getCumulativeCashFlow(
        req.companyId!,
        params
      );

      const duration = Date.now() - startTime;
      logger.info('Cumulative cashflow generated successfully', {
        companyId: req.companyId,
        userId: req.userId,
        duration: `${duration}ms`,
      });

      res.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Cumulative cashflow generation failed', {
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

export default new DashboardController();
