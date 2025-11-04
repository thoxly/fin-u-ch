import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import articlesService from './articles.service';

export class ArticlesController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const filters: {
        type?: 'income' | 'expense';
        activity?: 'operating' | 'investing' | 'financing';
        isActive?: boolean;
      } = {};

      if (req.query.type) {
        filters.type = req.query.type as 'income' | 'expense';
      }

      if (req.query.activity) {
        filters.activity = req.query.activity as
          | 'operating'
          | 'investing'
          | 'financing';
      }

      if (req.query.isActive !== undefined) {
        filters.isActive =
          req.query.isActive === 'true' || req.query.isActive === true;
      }

      const result = await articlesService.getAll(req.companyId!, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await articlesService.getById(
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
      const result = await articlesService.create(req.companyId!, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await articlesService.update(
        req.params.id,
        req.companyId!,
        req.body
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await articlesService.delete(
        req.params.id,
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async archive(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await articlesService.archive(
        req.params.id,
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async unarchive(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const result = await articlesService.unarchive(
        req.params.id,
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new ArticlesController();
