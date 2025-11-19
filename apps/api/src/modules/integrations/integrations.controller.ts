import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import integrationsService from './integrations.service';

export class IntegrationsController {
  async saveOzonIntegration(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await integrationsService.saveOzonIntegration(
        req.companyId!,
        req.body
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getOzonIntegration(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await integrationsService.getOzonIntegration(
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async disconnectOzonIntegration(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await integrationsService.disconnectOzonIntegration(
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new IntegrationsController();
