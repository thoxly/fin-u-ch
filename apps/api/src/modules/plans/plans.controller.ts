import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import plansService from './plans.service';
import auditLogService from '../audit/audit.service';
import logger from '../../config/logger';

export class PlansController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get all plans request', {
        companyId: req.companyId,
        userId: req.userId,
        budgetId: req.query.budgetId,
      });

      const budgetId = req.query.budgetId as string | undefined;
      const result = await plansService.getAll(req.companyId!, budgetId);

      logger.debug('Plans retrieved successfully', {
        companyId: req.companyId,
        plansCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get plans', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get plan by ID request', {
        planId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await plansService.getById(req.params.id, req.companyId!);

      logger.debug('Plan retrieved successfully', {
        planId: req.params.id,
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get plan', {
        planId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Create plan request', {
        companyId: req.companyId,
        userId: req.userId,
        budgetId: req.body.budgetId,
        ip: req.ip,
      });

      const result = await plansService.create(req.companyId!, req.body);

      logger.info('Plan created successfully', {
        planId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
      logger.info('Update plan request', {
        planId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      // Получаем старую версию для логирования
      const oldPlan = await plansService.getById(req.params.id, req.companyId!);

      const result = await plansService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      logger.info('Plan updated successfully', {
        planId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
      logger.info('Delete plan request', {
        planId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      // Получаем данные перед удалением для логирования
      const oldPlan = await plansService.getById(req.params.id, req.companyId!);

      const result = await plansService.delete(req.params.id, req.companyId!);

      logger.info('Plan deleted successfully', {
        planId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
