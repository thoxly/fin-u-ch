import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import { invalidateReportCache } from '../utils/cache';
import logger from '../../../config/logger';

export class CacheController {
  async clearCache(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Clear cache request', {
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      await invalidateReportCache(req.companyId!);

      logger.info('Cache cleared successfully', {
        companyId: req.companyId,
        userId: req.userId,
      });

      res.json({
        message: 'Cache cleared successfully',
        companyId: req.companyId,
      });
    } catch (error) {
      logger.error('Failed to clear cache', {
        companyId: req.companyId,
        userId: req.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
}

export default new CacheController();
