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
      };

      const result = await bddsService.getBDDS(req.companyId!, params);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new BDDSController();
