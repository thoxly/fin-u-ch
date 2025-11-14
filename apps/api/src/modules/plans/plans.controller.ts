import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import plansService from './plans.service';
import auditLogService from '../audit/audit.service';

export class PlansController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const budgetId = req.query.budgetId as string | undefined;
      const result = await plansService.getAll(req.companyId!, budgetId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await plansService.getById(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await plansService.create(req.companyId!, req.body);

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'create',
        entity: 'plan',
        entityId: result.id,
        changes: { new: result },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      // Получаем старую версию для логирования
      const oldPlan = await plansService.getById(req.params.id, req.companyId!);

      const result = await plansService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'plan',
        entityId: result.id,
        changes: { old: oldPlan, new: result },
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

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      // Получаем данные перед удалением для логирования
      const oldPlan = await plansService.getById(req.params.id, req.companyId!);

      const result = await plansService.delete(req.params.id, req.companyId!);

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'delete',
        entity: 'plan',
        entityId: req.params.id,
        changes: { old: oldPlan },
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
}

export default new PlansController();
