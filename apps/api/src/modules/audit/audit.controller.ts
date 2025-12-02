import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import auditLogService from './audit.service';
import logger from '../../config/logger';

export class AuditLogController {
  /**
   * Получить логи действий с фильтрацией
   * GET /api/audit-logs
   */
  async getLogs(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get audit logs request', {
        companyId: req.companyId,
        userId: req.userId,
        filters: {
          userId: req.query.userId,
          entity: req.query.entity,
          entityId: req.query.entityId,
          action: req.query.action,
          dateFrom: req.query.dateFrom,
          dateTo: req.query.dateTo,
        },
      });

      const {
        userId,
        entity,
        entityId,
        action,
        dateFrom,
        dateTo,
        limit,
        offset,
      } = req.query;

      const params = {
        companyId: req.companyId!,
        userId: userId as string | undefined,
        entity: entity as string | undefined,
        entityId: entityId as string | undefined,
        action: action as string | undefined,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      };

      const result = await auditLogService.getLogs(params);

      logger.debug('Audit logs retrieved successfully', {
        companyId: req.companyId,
        logsCount: result.logs.length,
        total: result.total,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get audit logs', {
        companyId: req.companyId,
        userId: req.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  /**
   * Получить логи для конкретной сущности
   * GET /api/audit-logs/entity/:entity/:entityId
   */
  async getEntityLogs(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get entity audit logs request', {
        companyId: req.companyId,
        userId: req.userId,
        entity: req.params.entity,
        entityId: req.params.entityId,
      });

      const { entity, entityId } = req.params;
      const result = await auditLogService.getEntityLogs(
        req.companyId!,
        entity,
        entityId
      );

      logger.debug('Entity audit logs retrieved successfully', {
        companyId: req.companyId,
        entity,
        entityId,
        logsCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get entity audit logs', {
        companyId: req.companyId,
        entity: req.params.entity,
        entityId: req.params.entityId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  /**
   * Получить логи пользователя
   * GET /api/audit-logs/user/:userId
   */
  async getUserLogs(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get user audit logs request', {
        companyId: req.companyId,
        userId: req.userId,
        targetUserId: req.params.userId,
        limit: req.query.limit,
      });

      const { userId } = req.params;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 100;
      const result = await auditLogService.getUserLogs(
        req.companyId!,
        userId,
        limit
      );

      logger.debug('User audit logs retrieved successfully', {
        companyId: req.companyId,
        targetUserId: userId,
        logsCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get user audit logs', {
        companyId: req.companyId,
        targetUserId: req.params.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
}

export default new AuditLogController();
