import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import salariesService from './salaries.service';
import auditLogService from '../../audit/audit.service';

export class SalariesController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await salariesService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await salariesService.getById(
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
      const result = await salariesService.create(req.companyId!, req.body);

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
      const oldSalary = await salariesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await salariesService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

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
      const oldSalary = await salariesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await salariesService.delete(
        req.params.id,
        req.companyId!
      );

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
