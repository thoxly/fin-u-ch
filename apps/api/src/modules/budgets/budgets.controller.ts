import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import budgetsService, {
  CreateBudgetDTO,
  UpdateBudgetDTO,
} from './budgets.service';

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
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
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
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await budgetsService.delete(req.params.id, req.companyId!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new BudgetsController();
