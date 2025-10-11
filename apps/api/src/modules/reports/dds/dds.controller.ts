import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import ddsService from './dds.service';

export class DDSController {
  async getDDS(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate companyId
      if (!req.companyId) {
        res.status(400).json({ error: 'Company ID is required' });
        return;
      }

      // Validate date parameters
      const periodFromStr = req.query.periodFrom as string | undefined;
      const periodToStr = req.query.periodTo as string | undefined;

      const periodFrom = periodFromStr
        ? new Date(periodFromStr)
        : new Date(new Date().getFullYear(), 0, 1);
      const periodTo = periodToStr ? new Date(periodToStr) : new Date();

      // Validate dates
      if (isNaN(periodFrom.getTime())) {
        res.status(400).json({ error: 'Invalid periodFrom date' });
        return;
      }
      if (isNaN(periodTo.getTime())) {
        res.status(400).json({ error: 'Invalid periodTo date' });
        return;
      }

      const params = {
        periodFrom,
        periodTo,
        accountId: req.query.accountId as string | undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string, 10)
          : undefined,
        offset: req.query.offset
          ? parseInt(req.query.offset as string, 10)
          : undefined,
      };

      const result = await ddsService.getDDS(req.companyId, params);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new DDSController();
