import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import departmentsService from './departments.service';
import auditLogService from '../../audit/audit.service';

export class DepartmentsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await departmentsService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await departmentsService.getById(
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
      const result = await departmentsService.create(req.companyId!, req.body);

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
      const oldDepartment = await departmentsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await departmentsService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

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
      const oldDepartment = await departmentsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await departmentsService.delete(
        req.params.id,
        req.companyId!
      );

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
