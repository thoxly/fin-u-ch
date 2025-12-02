import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import departmentsService from './departments.service';
import auditLogService from '../../audit/audit.service';
import logger from '../../../config/logger';

export class DepartmentsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get all departments request', {
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await departmentsService.getAll(req.companyId!);

      logger.debug('Departments retrieved successfully', {
        companyId: req.companyId,
        departmentsCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get departments', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get department by ID request', {
        departmentId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await departmentsService.getById(
        req.params.id,
        req.companyId!
      );

      logger.debug('Department retrieved successfully', {
        departmentId: req.params.id,
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get department', {
        departmentId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Create department request', {
        companyId: req.companyId,
        userId: req.userId,
        departmentName: req.body.name,
        ip: req.ip,
      });

      const result = await departmentsService.create(req.companyId!, req.body);

      logger.info('Department created successfully', {
        departmentId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'create',
        entity: 'department',
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
      logger.info('Update department request', {
        departmentId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldDepartment = await departmentsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await departmentsService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      logger.info('Department updated successfully', {
        departmentId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'department',
        entityId: result.id,
        changes: { old: oldDepartment, new: result },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Delete department request', {
        departmentId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldDepartment = await departmentsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await departmentsService.delete(
        req.params.id,
        req.companyId!
      );

      logger.info('Department deleted successfully', {
        departmentId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'delete',
        entity: 'department',
        entityId: req.params.id,
        changes: { old: oldDepartment },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new DepartmentsController();
