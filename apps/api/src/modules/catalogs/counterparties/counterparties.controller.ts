import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import counterpartiesService from './counterparties.service';
import auditLogService from '../../audit/audit.service';
import logger from '../../../config/logger';

export class CounterpartiesController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get all counterparties request', {
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await counterpartiesService.getAll(req.companyId!);

      logger.debug('Counterparties retrieved successfully', {
        companyId: req.companyId,
        counterpartiesCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get counterparties', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get counterparty by ID request', {
        counterpartyId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await counterpartiesService.getById(
        req.params.id,
        req.companyId!
      );

      logger.debug('Counterparty retrieved successfully', {
        counterpartyId: req.params.id,
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get counterparty', {
        counterpartyId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Create counterparty request', {
        companyId: req.companyId,
        userId: req.userId,
        counterpartyName: req.body.name,
        ip: req.ip,
      });

      const result = await counterpartiesService.create(
        req.companyId!,
        req.body
      );

      logger.info('Counterparty created successfully', {
        counterpartyId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
