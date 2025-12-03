import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant';
import articlesService from './articles.service';
import auditLogService from '../../audit/audit.service';
import logger from '../../../config/logger';

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

      // Если запрошен формат дерева, используем getTree
      const asTree = req.query.asTree === 'true';

      logger.debug('Get all articles request', {
        companyId: req.companyId,
        userId: req.userId,
        filters,
        asTree,
      });

      const result = asTree
        ? await articlesService.getTree(req.companyId!, filters)
        : await articlesService.getAll(req.companyId!, filters);

      logger.debug('Articles retrieved successfully', {
        companyId: req.companyId,
        articlesCount: Array.isArray(result) ? result.length : 'tree',
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get articles', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
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

      logger.debug('Get articles tree request', {
        companyId: req.companyId,
        userId: req.userId,
        filters,
      });

      const result = await articlesService.getTree(req.companyId!, filters);

      logger.debug('Articles tree retrieved successfully', {
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get articles tree', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getById(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get article by ID request', {
        articleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

      const result = await articlesService.getById(
        req.params.id,
        req.companyId!
      );

      logger.debug('Article retrieved successfully', {
        articleId: req.params.id,
        companyId: req.companyId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get article', {
        articleId: req.params.id,
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Create article request', {
        companyId: req.companyId,
        userId: req.userId,
        articleName: req.body.name,
        articleType: req.body.type,
        ip: req.ip,
      });

      const result = await articlesService.create(req.companyId!, req.body);

      logger.info('Article created successfully', {
        articleId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
      logger.info('Update article request', {
        articleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldArticle = await articlesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await articlesService.update(
        req.params.id,
        req.companyId!,
        req.body
      );

      logger.info('Article updated successfully', {
        articleId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
      logger.info('Delete article request', {
        articleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldArticle = await articlesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await articlesService.delete(
        req.params.id,
        req.companyId!
      );

      logger.info('Article deleted successfully', {
        articleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
      logger.info('Archive article request', {
        articleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldArticle = await articlesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await articlesService.archive(
        req.params.id,
        req.companyId!
      );

      logger.info('Article archived successfully', {
        articleId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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
      logger.info('Unarchive article request', {
        articleId: req.params.id,
        companyId: req.companyId,
        userId: req.userId,
        ip: req.ip,
      });

      const oldArticle = await articlesService.getById(
        req.params.id,
        req.companyId!
      );

      const result = await articlesService.unarchive(
        req.params.id,
        req.companyId!
      );

      logger.info('Article unarchived successfully', {
        articleId: result.id,
        companyId: req.companyId,
        userId: req.userId,
      });

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

      logger.info('Bulk archive articles request', {
        companyId: req.companyId,
        userId: req.userId,
        articlesCount: ids.length,
        ip: req.ip,
      });

      const oldArticles = await Promise.all(
        ids.map((id) =>
          articlesService.getById(id, req.companyId!).catch(() => null)
        )
      );

      const result = await articlesService.bulkArchive(req.companyId!, ids);

      logger.info('Articles bulk archived successfully', {
        companyId: req.companyId,
        userId: req.userId,
        archivedCount: ids.length,
      });

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
