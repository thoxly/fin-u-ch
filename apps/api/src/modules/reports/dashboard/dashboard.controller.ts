import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import dashboardService from './dashboard.service';

export class DashboardController {
  async getDashboard(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const params = {
        periodFrom: req.query.periodFrom
          ? new Date(req.query.periodFrom as string)
          : new Date(new Date().getFullYear(), 0, 1),
        periodTo: req.query.periodTo
          ? new Date(req.query.periodTo as string)
          : new Date(),
        mode: (req.query.mode as 'plan' | 'fact' | 'both') || 'fact',
      };

      const result = await dashboardService.getDashboard(
        req.companyId!,
        params
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new DashboardController();
