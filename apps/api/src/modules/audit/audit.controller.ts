import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import auditLogService from './audit.service';

export class AuditLogController {
  /**
   * Получить логи действий с фильтрацией
   * GET /api/audit-logs
   */
  async getLogs(req: TenantRequest, res: Response, next: NextFunction) {
    try {
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
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получить логи для конкретной сущности
   * GET /api/audit-logs/entity/:entity/:entityId
   */
  async getEntityLogs(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { entity, entityId } = req.params;
      const result = await auditLogService.getEntityLogs(
        req.companyId!,
        entity,
        entityId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получить логи пользователя
   * GET /api/audit-logs/user/:userId
   */
  async getUserLogs(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 100;
      const result = await auditLogService.getUserLogs(
        req.companyId!,
        userId,
        limit
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuditLogController();
