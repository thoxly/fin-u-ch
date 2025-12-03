import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import budgetsService, {
  CreateBudgetDTO,
  UpdateBudgetDTO,
} from './budgets.service';
import auditLogService from '../audit/audit.service';
import logger from '../../config/logger';

export class BudgetsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get all budgets request', {
        companyId: req.companyId,
        userId: req.userId,
        status: req.query.status,
      });

      const status = req.query.status as string | undefined;
      const result = await budgetsService.getAll(req.companyId!, status);

      logger.debug('Budgets retrieved successfully', {
        companyId: req.companyId,
        budgetsCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get budgets', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get budget by ID request', {
        budgetId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await budgetsService.getById(
        req.params.id,
        req.companyId!
      );

      logger.debug('Budget retrieved successfully', {
        budgetId: req.params.id,
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get budget', {
        budgetId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Create budget request', {
        companyId: req.companyId,
        userId: req.userId,
        budgetName: req.body.name,
        ip: req.ip,
      });

      const data: CreateBudgetDTO = {
        name: req.body.name,
        startDate: new Date(req.body.startDate),
        endDate:
          req.body.endDate && req.body.endDate !== ''
            ? new Date(req.body.endDate)
            : undefined,
      };
      const result = await budgetsService.create(req.companyId!, data);

      logger.info('Budget created successfully', {
        budgetId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'create',
        entity: 'budget',
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
      const oldBudget = await budgetsService.getById(
        req.params.id,
        req.companyId!
      );

      const data: UpdateBudgetDTO = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.startDate !== undefined)
        data.startDate = new Date(req.body.startDate);
      if (req.body.endDate !== undefined) {
        data.endDate =
          req.body.endDate && req.body.endDate !== ''
            ? new Date(req.body.endDate)
            : undefined;
      }
      if (req.body.status !== undefined) data.status = req.body.status;

      const result = await budgetsService.update(
        req.params.id,
        req.companyId!,
        data
      );

      // Определяем действие для логирования
      const action =
        data.status === 'archived'
          ? 'archive'
          : data.status === 'active' && oldBudget.status === 'archived'
            ? 'restore'
            : 'update';

      logger.info('Budget updated successfully', {
        budgetId: result.id,
        companyId: req.companyId,
        userId: req.userId,
        action,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action,
        entity: 'budget',
        entityId: result.id,
        changes: { old: oldBudget, new: result },
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
      logger.info('Delete budget request', {
        budgetId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      // Получаем данные перед удалением для логирования
      const oldBudget = await budgetsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await budgetsService.delete(req.params.id, req.companyId!);

      logger.info('Budget deleted successfully', {
        budgetId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      // Логируем действие
      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'delete',
        entity: 'budget',
        entityId: req.params.id,
        changes: { old: oldBudget },
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
}

export default new BudgetsController();
