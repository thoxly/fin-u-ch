import prisma from '../../config/db';
import logger from '../../config/logger';
import { Prisma } from '@prisma/client';

export interface LogActionParams {
  userId: string;
  companyId: string;
  action: string; // create, update, delete, confirm, cancel, archive, restore, etc.
  entity: string; // operation, budget, article, account, etc.
  entityId: string;
  changes?: {
    old?: Prisma.InputJsonValue;
    new?: Prisma.InputJsonValue;
  };
  metadata?: {
    ip?: string;
    userAgent?: string;
    [key: string]: unknown;
  };
}

export interface GetLogsParams {
  companyId: string;
  userId?: string;
  entity?: string;
  entityId?: string;
  action?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export class AuditLogService {
  /**
   * Логирование действия пользователя
   */
  async logAction(params: LogActionParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          companyId: params.companyId,
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
        },
      });
    } catch (error) {
      // Логируем ошибку, но не прерываем выполнение основного действия
      logger.error('Failed to log audit action', {
        error,
        params: {
          userId: params.userId,
          companyId: params.companyId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
        },
      });
    }
  }

  /**
   * Получение логов действий с фильтрацией
   */
  async getLogs(params: GetLogsParams) {
    const where: Prisma.AuditLogWhereInput = {
      companyId: params.companyId,
    };

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.entity) {
      where.entity = params.entity;
    }

    if (params.entityId) {
      where.entityId = params.entityId;
    }

    if (params.action) {
      where.action = params.action;
    }

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = params.dateFrom;
      }
      if (params.dateTo) {
        where.createdAt.lte = params.dateTo;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: params.limit || 100,
        skip: params.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: params.limit || 100,
      offset: params.offset || 0,
    };
  }

  /**
   * Получение логов для конкретной сущности
   */
  async getEntityLogs(companyId: string, entity: string, entityId: string) {
    return this.getLogs({
      companyId,
      entity,
      entityId,
    });
  }

  /**
   * Получение логов пользователя
   */
  async getUserLogs(companyId: string, userId: string, limit = 100) {
    return this.getLogs({
      companyId,
      userId,
      limit,
    });
  }
}

export default new AuditLogService();
