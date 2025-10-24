import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import { invalidateReportCache } from '../utils/cache';

export class CacheController {
  async clearCache(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      await invalidateReportCache(req.companyId!);
      res.json({
        message: 'Cache cleared successfully',
        companyId: req.companyId,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CacheController();
