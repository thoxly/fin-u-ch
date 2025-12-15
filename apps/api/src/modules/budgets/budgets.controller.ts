import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import budgetsService, {
  CreateBudgetDTO,
  UpdateBudgetDTO,
} from './budgets.service';
import auditLogService from '../audit/audit.service';

export class BudgetsController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const result = await budgetsService.getAll(req.companyId!, status);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await budgetsService.getById(
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
      const data: CreateBudgetDTO = {
        name: req.body.name,
        startDate: new Date(req.body.startDate),
        endDate:
          req.body.endDate && req.body.endDate !== ''
            ? new Date(req.body.endDate)
            : undefined,
      };
      const result = await budgetsService.create(req.companyId!, data);

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
      // Получаем данные перед удалением для логирования
      const oldBudget = await budgetsService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await budgetsService.delete(req.params.id, req.companyId!);

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
