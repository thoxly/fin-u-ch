import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import { AppError } from '../../middlewares/error';
import operationsService from './operations.service';
import auditLogService from '../audit/audit.service';

export class OperationsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
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
        repeat: req.query.repeat as string,
        limit: req.query.limit
          ? parseInt(req.query.limit as string, 10)
          : undefined,
        offset: req.query.offset
          ? parseInt(req.query.offset as string, 10)
          : undefined,
      };

      const result = await operationsService.getAll(req.companyId!, filters);

      // Для обратной совместимости: если клиент не ожидает пагинацию, возвращаем только data
      // Но лучше всегда возвращать с метаданными
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await operationsService.getById(
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
      const result = await operationsService.create(req.companyId!, req.body);

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
      // Получаем данные перед удалением для логирования
      const oldOperation = await operationsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await operationsService.delete(
        req.params.id,
        req.companyId!
      );

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
      // Получаем старую версию для логирования
      const oldOperation = await operationsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await operationsService.confirmOperation(
        req.params.id,
        req.companyId!
      );

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

      // Получаем данные перед удалением для логирования
      const oldOperations = await Promise.all(
        ids.map((id) =>
          operationsService.getById(id, req.companyId!).catch(() => null)
        )
      );

      const result = await operationsService.bulkDelete(req.companyId!, ids);

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
