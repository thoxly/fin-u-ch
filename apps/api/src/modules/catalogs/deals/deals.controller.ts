import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import dealsService from './deals.service';
import auditLogService from '../../audit/audit.service';
import logger from '../../../config/logger';

export class DealsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get all deals request', {
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await dealsService.getAll(req.companyId!);

      logger.debug('Deals retrieved successfully', {
        companyId: req.companyId,
        dealsCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get deals', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get deal by ID request', {
        dealId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await dealsService.getById(req.params.id, req.companyId!);

      logger.debug('Deal retrieved successfully', {
        dealId: req.params.id,
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get deal', {
        dealId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Create deal request', {
        companyId: req.companyId,
        userId: req.userId,
        dealName: req.body.name,
        ip: req.ip,
      });

      const result = await dealsService.create(req.companyId!, req.body);

      logger.info('Deal created successfully', {
        dealId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
      logger.info('Update deal request', {
        dealId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldDeal = await dealsService.getById(req.params.id, req.companyId!);

      const result = await dealsService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      logger.info('Deal updated successfully', {
        dealId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
      logger.info('Delete deal request', {
        dealId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldDeal = await dealsService.getById(req.params.id, req.companyId!);

      const result = await dealsService.delete(req.params.id, req.companyId!);

      logger.info('Deal deleted successfully', {
        dealId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
