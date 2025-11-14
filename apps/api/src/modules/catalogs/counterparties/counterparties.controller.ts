import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import counterpartiesService from './counterparties.service';
import auditLogService from '../../audit/audit.service';

export class CounterpartiesController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await counterpartiesService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await counterpartiesService.getById(
        req.params.id,
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await counterpartiesService.create(
        req.companyId!,
        req.body
      );

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'create',
        entity: 'counterparty',
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
      const oldCounterparty = await counterpartiesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await counterpartiesService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'counterparty',
        entityId: result.id,
        changes: { old: oldCounterparty, new: result },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const oldCounterparty = await counterpartiesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await counterpartiesService.delete(
        req.params.id,
        req.companyId!
      );

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'delete',
        entity: 'counterparty',
        entityId: req.params.id,
        changes: { old: oldCounterparty },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new CounterpartiesController();
