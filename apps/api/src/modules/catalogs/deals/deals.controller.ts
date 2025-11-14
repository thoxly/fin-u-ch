import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import dealsService from './deals.service';
import auditLogService from '../../audit/audit.service';

export class DealsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await dealsService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await dealsService.getById(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await dealsService.create(req.companyId!, req.body);

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'create',
        entity: 'deal',
        entityId: result.id,
        changes: { new: result },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const oldDeal = await dealsService.getById(req.params.id, req.companyId!);

      const result = await dealsService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'deal',
        entityId: result.id,
        changes: { old: oldDeal, new: result },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const oldDeal = await dealsService.getById(req.params.id, req.companyId!);

      const result = await dealsService.delete(req.params.id, req.companyId!);

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'delete',
        entity: 'deal',
        entityId: req.params.id,
        changes: { old: oldDeal },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new DealsController();
