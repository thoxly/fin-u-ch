import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import accountsService from './accounts.service';
import auditLogService from '../../audit/audit.service';

export class AccountsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountsService.getAll(req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await accountsService.getById(
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
      const result = await accountsService.create(req.companyId!, req.body);

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'create',
        entity: 'account',
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
      const oldAccount = await accountsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await accountsService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'account',
        entityId: result.id,
        changes: { old: oldAccount, new: result },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const oldAccount = await accountsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await accountsService.delete(
        req.params.id,
        req.companyId!
      );

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'delete',
        entity: 'account',
        entityId: req.params.id,
        changes: { old: oldAccount },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new AccountsController();
