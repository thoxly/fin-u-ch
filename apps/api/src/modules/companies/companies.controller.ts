import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import companiesService from './companies.service';
import auditLogService from '../audit/audit.service';
import logger from '../../config/logger';

export class CompaniesController {
  async get(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get company request', {
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await companiesService.get(req.companyId!);
      res.json(result);
    } catch (error) {
      logger.error('Failed to get company', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Update company request', {
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      // Получаем старую версию для логирования
      const oldCompany = await companiesService.get(req.companyId!);

      const result = await companiesService.update(req.companyId!, req.body);

      logger.info('Company updated successfully', {
        companyId: req.companyId,
        userId: req.userId,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'company',
        entityId: result.id,
        changes: { old: oldCompany, new: result },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to update company', {
        companyId: req.companyId,
        userId: req.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getUiSettings(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      logger.debug('Get UI settings request', {
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await companiesService.getUiSettings(req.companyId!);
      res.json(result);
    } catch (error) {
      logger.error('Failed to get UI settings', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async updateUiSettings(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      logger.info('Update UI settings request', {
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const result = await companiesService.updateUiSettings(
        req.companyId!,
        req.body
      );

      logger.info('UI settings updated successfully', {
        companyId: req.companyId,
        userId: req.userId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to update UI settings', {
        companyId: req.companyId,
        userId: req.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
}

export default new CompaniesController();
