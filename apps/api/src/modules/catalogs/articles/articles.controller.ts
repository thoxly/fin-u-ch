import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import articlesService from './articles.service';
import auditLogService from '../../audit/audit.service';

export class ArticlesController {
  async getAll(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const filters: {
        type?: 'income' | 'expense' | 'transfer';
        activity?: 'operating' | 'investing' | 'financing';
        isActive?: boolean;
      } = {};

      if (req.query.type) {
        filters.type = req.query.type as 'income' | 'expense' | 'transfer';
      }

      if (req.query.activity) {
        filters.activity = req.query.activity as
          | 'operating'
          | 'investing'
          | 'financing';
      }

      if (req.query.isActive !== undefined) {
        const isActiveValue = req.query.isActive;
        filters.isActive =
          isActiveValue === 'true' ||
          (typeof isActiveValue === 'string' &&
            isActiveValue.toLowerCase() === 'true');
      }

      const result = await articlesService.getAll(req.companyId!, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getTree(req: TenantRequest, res: Response, next: NextFunction) {
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
        const isActiveValue = req.query.isActive;
        filters.isActive =
          isActiveValue === 'true' ||
          (typeof isActiveValue === 'string' &&
            isActiveValue.toLowerCase() === 'true');
      }

      const result = await articlesService.getTree(req.companyId!, filters);
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

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'create',
        entity: 'article',
        entityId: result.id,
        changes: { new: result },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const oldArticle = await articlesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await articlesService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'update',
        entity: 'article',
        entityId: result.id,
        changes: { old: oldArticle, new: result },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const oldArticle = await articlesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await articlesService.delete(
        req.params.id,
        req.companyId!
      );

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'delete',
        entity: 'article',
        entityId: req.params.id,
        changes: { old: oldArticle },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async archive(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const oldArticle = await articlesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await articlesService.archive(
        req.params.id,
        req.companyId!
      );

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'archive',
        entity: 'article',
        entityId: result.id,
        changes: { old: oldArticle, new: result },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async unarchive(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const oldArticle = await articlesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await articlesService.unarchive(
        req.params.id,
        req.companyId!
      );

      await auditLogService.logAction({
        userId: req.userId!,
        companyId: req.companyId!,
        action: 'restore',
        entity: 'article',
        entityId: result.id,
        changes: { old: oldArticle, new: result },
        metadata: { ip: req.ip, userAgent: req.get('user-agent') },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async bulkArchive(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body as { ids: string[] };

      const oldArticles = await Promise.all(
        ids.map((id) =>
          articlesService.getById(id, req.companyId!).catch(() => null)
        )
      );

      const result = await articlesService.bulkArchive(req.companyId!, ids);

      await Promise.all(
        ids.map((id, index) =>
          auditLogService.logAction({
            userId: req.userId!,
            companyId: req.companyId!,
            action: 'archive',
            entity: 'article',
            entityId: id,
            changes: oldArticles[index]
              ? { old: oldArticles[index] }
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

export default new ArticlesController();
