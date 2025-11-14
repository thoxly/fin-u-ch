import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import companiesService from './companies.service';
import auditLogService from '../audit/audit.service';

export class CompaniesController {
  async get(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await companiesService.get(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      // Получаем старую версию для логирования
      const oldCompany = await companiesService.get(req.companyId!);

      const result = await companiesService.update(req.companyId!, req.body);

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'company',
        entityId: result.id,
        changes: { old: oldCompany, new: result },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getUiSettings(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await companiesService.getUiSettings(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateUiSettings(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await companiesService.updateUiSettings(
        req.companyId!,
        req.body
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new CompaniesController();
