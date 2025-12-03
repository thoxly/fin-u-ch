import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import accountsService from './accounts.service';
import auditLogService from '../../audit/audit.service';
import logger from '../../../config/logger';

export class AccountsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get all accounts request', {
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await accountsService.getAll(req.companyId!);

      logger.debug('Accounts retrieved successfully', {
        companyId: req.companyId,
        accountsCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get accounts', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get account by ID request', {
        accountId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await accountsService.getById(
        req.params.id,
        req.companyId!
      );

      logger.debug('Account retrieved successfully', {
        accountId: req.params.id,
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get account', {
        accountId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Create account request', {
        companyId: req.companyId,
        userId: req.userId,
        accountName: req.body.name,
        ip: req.ip,
      });

      const result = await accountsService.create(req.companyId!, req.body);

      logger.info('Account created successfully', {
        accountId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
      logger.info('Update account request', {
        accountId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldAccount = await accountsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await accountsService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      logger.info('Account updated successfully', {
        accountId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
      logger.info('Delete account request', {
        accountId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldAccount = await accountsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await accountsService.delete(
        req.params.id,
        req.companyId!
      );

      logger.info('Account deleted successfully', {
        accountId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
