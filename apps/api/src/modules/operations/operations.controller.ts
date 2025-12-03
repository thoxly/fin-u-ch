import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import { AppError } from '../../middlewares/error';
import operationsService from './operations.service';
import auditLogService from '../audit/audit.service';
import logger from '../../config/logger';

export class OperationsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get all operations request', {
        companyId: req.companyId,
        userId: req.userId,
        filters: {
          type: req.query.type,
          dateFrom: req.query.dateFrom,
          dateTo: req.query.dateTo,
          articleId: req.query.articleId,
          isConfirmed: req.query.isConfirmed,
          isTemplate: req.query.isTemplate,
        },
      });

      const filters = {
        type: req.query.type as string,
        dateFrom: req.query.dateFrom
          ? new Date(req.query.dateFrom as string)
          : undefined,
        dateTo: req.query.dateTo
          ? new Date(req.query.dateTo as string)
          : undefined,
        articleId: req.query.articleId as string,
        dealId: req.query.dealId as string,
        departmentId: req.query.departmentId as string,
        counterpartyId: req.query.counterpartyId as string,
        accountId: req.query.accountId as string,
        isConfirmed: req.query.isConfirmed
          ? req.query.isConfirmed === 'true'
          : undefined,
        isTemplate: req.query.isTemplate
          ? req.query.isTemplate === 'true'
          : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string, 10)
          : undefined,
        offset: req.query.offset
          ? parseInt(req.query.offset as string, 10)
          : undefined,
      };

      const result = await operationsService.getAll(req.companyId!, filters);

      logger.debug('Operations retrieved successfully', {
        companyId: req.companyId,
        operationsCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get operations', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get operation by ID request', {
        operationId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await operationsService.getById(
        req.params.id,
        req.companyId!
      );

      logger.debug('Operation retrieved successfully', {
        operationId: req.params.id,
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get operation', {
        operationId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Create operation request', {
        companyId: req.companyId,
        userId: req.userId,
        operationType: req.body.type,
        amount: req.body.amount,
        ip: req.ip,
      });

      const result = await operationsService.create(req.companyId!, req.body);

      logger.info('Operation created successfully', {
        operationId: result.id,
        companyId: req.companyId,
        userId: req.userId,
        operationType: result.type,
        amount: result.amount,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'create',
        entity: 'operation',
        entityId: result.id,
        changes: { new: result },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Update operation request', {
        operationId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      // Получаем старую версию для логирования
      const oldOperation = await operationsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await operationsService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      if (!result) {
        throw new AppError('Операция не найдена', 404);
      }

      logger.info('Operation updated successfully', {
        operationId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'operation',
        entityId: result.id,
        changes: { old: oldOperation, new: result },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Delete operation request', {
        operationId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      // Получаем данные перед удалением для логирования
      const oldOperation = await operationsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await operationsService.delete(
        req.params.id,
        req.companyId!
      );

      logger.info('Operation deleted successfully', {
        operationId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'delete',
        entity: 'operation',
        entityId: req.params.id,
        changes: { old: oldOperation },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async confirm(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Confirm operation request', {
        operationId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      // Получаем старую версию для логирования
      const oldOperation = await operationsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await operationsService.confirmOperation(
        req.params.id,
        req.companyId!
      );

      logger.info('Operation confirmed successfully', {
        operationId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'confirm',
        entity: 'operation',
        entityId: result.id,
        changes: { old: oldOperation, new: result },
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async bulkDelete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body as { ids: string[] };

      logger.info('Bulk delete operations request', {
        companyId: req.companyId,
        userId: req.userId,
        operationsCount: ids.length,
        ip: req.ip,
      });

      // Получаем данные перед удалением для логирования
      const oldOperations = await Promise.all(
        ids.map((id) =>
          operationsService.getById(id, req.companyId!).catch(() => null)
        )
      );

      const result = await operationsService.bulkDelete(req.companyId!, ids);

      logger.info('Operations bulk deleted successfully', {
        companyId: req.companyId,
        userId: req.userId,
        deletedCount: ids.length,
      });

      // Логируем каждое удаление
      await Promise.all(
        ids.map((id, index) =>
          auditLogService.logAction({
            userId: req.userId!,
            companyId: req.companyId!,
            action: 'delete',
            entity: 'operation',
            entityId: id,
            changes: oldOperations[index]
              ? { old: oldOperations[index] }
              : undefined,
            metadata: {
              ip: req.ip,
              userAgent: req.get('user-agent'),
              bulk: true,
            },
          })
        )
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new OperationsController();
