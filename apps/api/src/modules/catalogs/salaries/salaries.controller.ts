import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import salariesService from './salaries.service';
import auditLogService from '../../audit/audit.service';
import logger from '../../../config/logger';

export class SalariesController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get all salaries request', {
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await salariesService.getAll(req.companyId!);

      logger.debug('Salaries retrieved successfully', {
        companyId: req.companyId,
        salariesCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get salaries', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get salary by ID request', {
        salaryId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await salariesService.getById(
        req.params.id,
        req.companyId!
      );

      logger.debug('Salary retrieved successfully', {
        salaryId: req.params.id,
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get salary', {
        salaryId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Create salary request', {
        companyId: req.companyId,
        userId: req.userId,
        employeeName: req.body.employeeName,
        ip: req.ip,
      });

      const result = await salariesService.create(req.companyId!, req.body);

      logger.info('Salary created successfully', {
        salaryId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'create',
        entity: 'salary',
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
      logger.info('Update salary request', {
        salaryId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldSalary = await salariesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await salariesService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      logger.info('Salary updated successfully', {
        salaryId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'salary',
        entityId: result.id,
        changes: { old: oldSalary, new: result },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Delete salary request', {
        salaryId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldSalary = await salariesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await salariesService.delete(
        req.params.id,
        req.companyId!
      );

      logger.info('Salary deleted successfully', {
        salaryId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'delete',
        entity: 'salary',
        entityId: req.params.id,
        changes: { old: oldSalary },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new SalariesController();
