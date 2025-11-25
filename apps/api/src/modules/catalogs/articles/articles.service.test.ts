// Mock env.ts before importing anything that uses it
jest.mock('../../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
  },
}));

import { ArticlesService } from './articles.service';
import { AppError } from '../../../middlewares/error';
import prisma from '../../../config/db';

jest.mock('../../../config/db', () => ({
  __esModule: true,
  default: {
    article: {
      findMany: jest.fn() as jest.Mock,
      findFirst: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      updateMany: jest.fn() as jest.Mock,
      count: jest.fn() as jest.Mock,
    },
  },
}));

jest.mock('../../../utils/validation', () => ({
  validateRequired: jest.fn(),
}));

const mockedPrisma = prisma as any;

describe('ArticlesService', () => {
  let articlesService: ArticlesService;

  beforeEach(() => {
    articlesService = new ArticlesService();
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all articles for a company', async () => {
      const companyId = 'company-1';
      const mockArticles = [
        { id: 'article-1', name: 'Article 1', companyId, type: 'income' },
      ];

      mockedPrisma.article.findMany.mockResolvedValue(mockArticles);

      const result = await articlesService.getAll(companyId);

      expect(result).toEqual(mockArticles);
      expect(mockedPrisma.article.findMany).toHaveBeenCalledWith({
        where: { companyId },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });

    it('should filter articles by type', async () => {
      const companyId = 'company-1';
      const filters = { type: 'income' as const };

      mockedPrisma.article.findMany.mockResolvedValue([]);

      await articlesService.getAll(companyId, filters);

      expect(mockedPrisma.article.findMany).toHaveBeenCalledWith({
        where: { companyId, type: 'income' },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getById', () => {
    it('should return article by id', async () => {
      const id = 'article-1';
      const companyId = 'company-1';
      const mockArticle = { id, name: 'Article 1', companyId, type: 'income' };

      mockedPrisma.article.findFirst.mockResolvedValue(mockArticle);

      const result = await articlesService.getById(id, companyId);

      expect(result).toEqual(mockArticle);
    });

    it('should throw AppError if article not found', async () => {
      const id = 'article-1';
      const companyId = 'company-1';

      mockedPrisma.article.findFirst.mockResolvedValue(null);

      await expect(articlesService.getById(id, companyId)).rejects.toThrow(
        AppError
      );
      await expect(articlesService.getById(id, companyId)).rejects.toThrow(
        'Article not found'
      );
    });
  });

  describe('create', () => {
    it('should create a new article with valid type', async () => {
      const companyId = 'company-1';
      const data = { name: 'New Article', type: 'income' };
      const mockArticle = { id: 'article-1', ...data, companyId };

      mockedPrisma.article.create.mockResolvedValue(mockArticle);

      const result = await articlesService.create(companyId, data);

      expect(result).toEqual(mockArticle);
      expect(mockedPrisma.article.create).toHaveBeenCalledWith({
        data: { ...data, companyId },
        include: {
          parent: { select: { id: true, name: true } },
          children: { select: { id: true, name: true } },
          counterparty: { select: { id: true, name: true } },
        },
      });
    });

    it('should create article with parentId', async () => {
      const companyId = 'company-1';
      const parentId = 'parent-1';
      const data = { name: 'Child Article', type: 'income', parentId };
      const mockArticle = { id: 'article-1', ...data, companyId };

      // Мокируем проверку родителя
      mockedPrisma.article.findFirst.mockResolvedValue({
        id: parentId,
        name: 'Parent',
        companyId,
        type: 'income',
        isActive: true,
      });

      // Мокируем проверку циклов (нет циклов)
      mockedPrisma.article.findMany.mockResolvedValue([]);

      mockedPrisma.article.create.mockResolvedValue(mockArticle);

      const result = await articlesService.create(companyId, data);

      expect(result).toEqual(mockArticle);
      expect(mockedPrisma.article.create).toHaveBeenCalledWith({
        data: { ...data, companyId },
        include: expect.any(Object),
      });
    });

    it('should throw AppError for invalid type', async () => {
      const companyId = 'company-1';
      const data = { name: 'New Article', type: 'invalid' };

      await expect(articlesService.create(companyId, data)).rejects.toThrow(
        AppError
      );
      await expect(articlesService.create(companyId, data)).rejects.toThrow(
        'Type must be income or expense'
      );
    });
  });

  describe('update', () => {
    it('should update article', async () => {
      const id = 'article-1';
      const companyId = 'company-1';
      const data = { name: 'Updated Article' };
      const existingArticle = {
        id,
        name: 'Old Name',
        companyId,
        type: 'income',
        parentId: null,
      };
      const updatedArticle = { ...existingArticle, ...data };

      mockedPrisma.article.findFirst.mockResolvedValue(existingArticle);
      mockedPrisma.article.update.mockResolvedValue(updatedArticle);

      const result = await articlesService.update(id, companyId, data);

      expect(result).toEqual(updatedArticle);
      expect(mockedPrisma.article.update).toHaveBeenCalledWith({
        where: { id, companyId },
        data,
        include: expect.any(Object),
      });
    });

    it('should update article parentId', async () => {
      const id = 'article-1';
      const companyId = 'company-1';
      const newParentId = 'parent-1';
      const data = { parentId: newParentId };
      const existingArticle = {
        id,
        name: 'Article',
        companyId,
        type: 'income',
        parentId: null,
      };
      const updatedArticle = { ...existingArticle, parentId: newParentId };

      // Мокируем getById
      mockedPrisma.article.findFirst
        .mockResolvedValueOnce(existingArticle)
        .mockResolvedValueOnce({
          id: newParentId,
          name: 'Parent',
          companyId,
          type: 'income',
          isActive: true,
        });

      // Мокируем проверку циклов (нет циклов)
      mockedPrisma.article.findMany.mockResolvedValue([]);

      mockedPrisma.article.update.mockResolvedValue(updatedArticle);

      const result = await articlesService.update(id, companyId, data);

      expect(result).toEqual(updatedArticle);
    });

    it('should not validate parentId if it has not changed', async () => {
      const id = 'article-1';
      const companyId = 'company-1';
      const parentId = 'parent-1';
      const data = { parentId };
      const existingArticle = {
        id,
        name: 'Article',
        companyId,
        type: 'income',
        parentId, // Родитель уже установлен
      };
      const updatedArticle = { ...existingArticle };

      mockedPrisma.article.findFirst.mockResolvedValue(existingArticle);
      mockedPrisma.article.update.mockResolvedValue(updatedArticle);

      const result = await articlesService.update(id, companyId, data);

      expect(result).toEqual(updatedArticle);
      // Проверка циклов не должна вызываться, так как parentId не изменился
      expect(mockedPrisma.article.findMany).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete article', async () => {
      const id = 'article-1';
      const companyId = 'company-1';
      const existingArticle = {
        id,
        name: 'Article 1',
        companyId,
        type: 'income',
      };
      const deletedArticle = { ...existingArticle, isActive: false };

      mockedPrisma.article.findFirst.mockResolvedValue(existingArticle);
      mockedPrisma.article.findMany.mockResolvedValue([]); // Нет дочерних статей
      mockedPrisma.article.update.mockResolvedValue(deletedArticle);

      const result = await articlesService.delete(id, companyId);

      expect(result).toEqual(deletedArticle);
      expect(mockedPrisma.article.update).toHaveBeenCalledWith({
        where: { id, companyId },
        data: { isActive: false },
      });
    });

    it('should make children root when deleting parent article', async () => {
      const id = 'article-1';
      const companyId = 'company-1';
      const existingArticle = {
        id,
        name: 'Parent Article',
        companyId,
        type: 'income',
      };
      const children = [{ id: 'child-1' }, { id: 'child-2' }];

      mockedPrisma.article.findFirst.mockResolvedValue(existingArticle);
      mockedPrisma.article.findMany
        .mockResolvedValueOnce(children) // Дочерние статьи
        .mockResolvedValueOnce([]) // Рекурсивно для child-1
        .mockResolvedValueOnce([]); // Рекурсивно для child-2
      mockedPrisma.article.updateMany.mockResolvedValue({ count: 2 });
      mockedPrisma.article.update.mockResolvedValue({
        ...existingArticle,
        isActive: false,
      });

      await articlesService.delete(id, companyId);

      expect(mockedPrisma.article.updateMany).toHaveBeenCalledWith({
        where: { parentId: id, companyId },
        data: { parentId: null },
      });
    });
  });

  describe('isLeafArticle', () => {
    it('should return true for article without children', async () => {
      const id = 'article-1';
      const companyId = 'company-1';

      mockedPrisma.article.count.mockResolvedValue(0);

      const result = await articlesService.isLeafArticle(id, companyId);

      expect(result).toBe(true);
      expect(mockedPrisma.article.count).toHaveBeenCalledWith({
        where: {
          parentId: id,
          companyId,
          isActive: true,
        },
      });
    });

    it('should return false for article with children', async () => {
      const id = 'article-1';
      const companyId = 'company-1';

      mockedPrisma.article.count.mockResolvedValue(2);

      const result = await articlesService.isLeafArticle(id, companyId);

      expect(result).toBe(false);
    });
  });

  describe('getDescendantIds', () => {
    it('should return empty array for article without children', async () => {
      const id = 'article-1';
      const companyId = 'company-1';

      mockedPrisma.article.findMany.mockResolvedValue([]);

      const result = await articlesService.getDescendantIds(id, companyId);

      expect(result).toEqual([]);
    });

    it('should return all descendant IDs recursively', async () => {
      const id = 'article-1';
      const companyId = 'company-1';
      const children = [{ id: 'child-1' }, { id: 'child-2' }];
      const grandchildren = [{ id: 'grandchild-1' }];

      mockedPrisma.article.findMany
        .mockResolvedValueOnce(children) // Дети article-1
        .mockResolvedValueOnce(grandchildren) // Дети child-1
        .mockResolvedValueOnce([]) // Дети child-2
        .mockResolvedValueOnce([]); // Дети grandchild-1

      const result = await articlesService.getDescendantIds(id, companyId);

      expect(result).toEqual(['child-1', 'grandchild-1', 'child-2']);
    });
  });

  describe('hierarchy validation', () => {
    it('should throw error when article is parent of itself', async () => {
      const companyId = 'company-1';
      const articleId = 'article-1';

      // Мокируем getById для update
      mockedPrisma.article.findFirst.mockResolvedValue({
        id: articleId,
        name: 'Article',
        companyId,
        type: 'income',
        parentId: null,
      });

      await expect(
        articlesService.update(articleId, companyId, { parentId: articleId })
      ).rejects.toThrow(AppError);
    });

    it('should throw error when parent does not exist', async () => {
      const companyId = 'company-1';
      const data = {
        name: 'Article',
        type: 'income',
        parentId: 'non-existent',
      };

      mockedPrisma.article.findFirst.mockResolvedValue(null);

      await expect(articlesService.create(companyId, data)).rejects.toThrow(
        'Родительская статья не найдена'
      );
    });

    it('should throw error when parent is inactive', async () => {
      const companyId = 'company-1';
      const data = {
        name: 'Article',
        type: 'income',
        parentId: 'parent-1',
      };

      mockedPrisma.article.findFirst.mockResolvedValue({
        id: 'parent-1',
        name: 'Parent',
        companyId,
        type: 'income',
        isActive: false,
      });

      await expect(articlesService.create(companyId, data)).rejects.toThrow(
        'Нельзя назначить родителем неактивную статью'
      );
    });

    it('should throw error when creating cycle', async () => {
      const companyId = 'company-1';
      const articleId = 'article-1';
      const parentId = 'parent-1';

      // Мокируем getById (вызывается в update) - возвращает полную статью с include
      mockedPrisma.article.findFirst
        .mockResolvedValueOnce({
          id: articleId,
          name: 'Article',
          companyId,
          type: 'income',
          parentId: null,
          isActive: true,
          parent: null,
          children: [],
          counterparty: null,
        })
        // Мокируем проверку родителя в validateArticleHierarchy
        .mockResolvedValueOnce({
          id: parentId,
          name: 'Parent',
          companyId,
          type: 'income',
          isActive: true,
        })
        // Мокируем получение текущей статьи в checkForCycle
        .mockResolvedValueOnce({
          id: articleId,
          parentId: null,
        });

      // Мокируем проверку циклов - parent является потомком article
      // checkDescendants начинает с articleId и проверяет всех его потомков
      mockedPrisma.article.findMany.mockResolvedValueOnce([{ id: parentId }]); // Дети article-1 включают parent-1 - цикл обнаружен!

      await expect(
        articlesService.update(articleId, companyId, { parentId })
      ).rejects.toThrow('Невозможно создать цикл');
    });

    it('should allow creating article with valid parent', async () => {
      const companyId = 'company-1';
      const parentId = 'parent-1';
      const data = {
        name: 'Child Article',
        type: 'income',
        parentId,
      };

      // Мокируем проверку родителя
      mockedPrisma.article.findFirst.mockResolvedValue({
        id: parentId,
        name: 'Parent',
        companyId,
        type: 'income',
        isActive: true,
      });

      // Мокируем проверку циклов (нет циклов, так как это новая статья)
      // Для новой статьи проверка циклов не выполняется (articleId = null)

      const mockArticle = { id: 'article-1', ...data, companyId };
      mockedPrisma.article.create.mockResolvedValue(mockArticle);

      const result = await articlesService.create(companyId, data);

      expect(result).toEqual(mockArticle);
      expect(mockedPrisma.article.create).toHaveBeenCalled();
    });

    it('should allow removing parent (setting parentId to null)', async () => {
      const companyId = 'company-1';
      const articleId = 'article-1';
      const existingArticle = {
        id: articleId,
        name: 'Article',
        companyId,
        type: 'income',
        parentId: 'old-parent-1',
      };

      mockedPrisma.article.findFirst.mockResolvedValue(existingArticle);
      mockedPrisma.article.update.mockResolvedValue({
        ...existingArticle,
        parentId: null,
      });

      const result = await articlesService.update(articleId, companyId, {
        parentId: undefined,
      });

      expect(result.parentId).toBeNull();
      // Валидация не должна вызываться для parentId = null
      expect(mockedPrisma.article.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getTree', () => {
    it('should return tree structure', async () => {
      const companyId = 'company-1';
      const articles = [
        {
          id: 'article-1',
          name: 'Parent',
          companyId,
          type: 'income',
          parentId: null,
          parent: null,
          counterparty: null,
        },
        {
          id: 'article-2',
          name: 'Child',
          companyId,
          type: 'income',
          parentId: 'article-1',
          parent: { id: 'article-1', name: 'Parent' },
          counterparty: null,
        },
      ];

      mockedPrisma.article.findMany.mockResolvedValue(articles);

      const result = await articlesService.getTree(companyId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('article-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('article-2');
    });

    it('should handle articles with filtered parent (make them root)', async () => {
      const companyId = 'company-1';
      const articles = [
        {
          id: 'article-2',
          name: 'Child',
          companyId,
          type: 'income',
          parentId: 'article-1', // Родитель не в списке (отфильтрован)
          parent: null, // Родитель не найден (отфильтрован)
          counterparty: null,
        },
      ];

      mockedPrisma.article.findMany.mockResolvedValue(articles);

      const result = await articlesService.getTree(companyId);

      // Статья должна стать корневой, так как родитель не найден
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('article-2');
      expect(result[0].parentId).toBe('article-1'); // parentId сохраняется, но статья корневая в дереве
    });

    it('should sort tree by name', async () => {
      const companyId = 'company-1';
      const articles = [
        {
          id: 'article-2',
          name: 'B Article',
          companyId,
          type: 'income',
          parentId: null,
        },
        {
          id: 'article-1',
          name: 'A Article',
          companyId,
          type: 'income',
          parentId: null,
        },
      ];

      mockedPrisma.article.findMany.mockResolvedValue(articles);

      const result = await articlesService.getTree(companyId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('A Article');
      expect(result[1].name).toBe('B Article');
    });

    it('should filter articles by type', async () => {
      const companyId = 'company-1';
      const filters = { type: 'income' as const };

      mockedPrisma.article.findMany.mockResolvedValue([]);

      await articlesService.getTree(companyId, filters);

      expect(mockedPrisma.article.findMany).toHaveBeenCalledWith({
        where: { companyId, type: 'income' },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });

    it('should filter articles by activity', async () => {
      const companyId = 'company-1';
      const filters = { activity: 'operating' as const };

      mockedPrisma.article.findMany.mockResolvedValue([]);

      await articlesService.getTree(companyId, filters);

      expect(mockedPrisma.article.findMany).toHaveBeenCalledWith({
        where: { companyId, activity: 'operating' },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });

    it('should handle multi-level hierarchy', async () => {
      const companyId = 'company-1';
      const articles = [
        {
          id: 'article-1',
          name: 'Parent',
          companyId,
          type: 'income',
          parentId: null,
        },
        {
          id: 'article-2',
          name: 'Child',
          companyId,
          type: 'income',
          parentId: 'article-1',
        },
        {
          id: 'article-3',
          name: 'Grandchild',
          companyId,
          type: 'income',
          parentId: 'article-2',
        },
      ];

      mockedPrisma.article.findMany.mockResolvedValue(articles);

      const result = await articlesService.getTree(companyId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('article-1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('article-2');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].id).toBe('article-3');
    });
  });

  describe('getDescendantIds', () => {
    it('should handle deep nesting', async () => {
      const id = 'article-1';
      const companyId = 'company-1';
      const level1 = [{ id: 'child-1' }, { id: 'child-2' }];
      const level2 = [{ id: 'grandchild-1' }];
      const level3 = [{ id: 'great-grandchild-1' }];

      mockedPrisma.article.findMany
        .mockResolvedValueOnce(level1) // Дети article-1
        .mockResolvedValueOnce(level2) // Дети child-1
        .mockResolvedValueOnce(level3) // Дети grandchild-1
        .mockResolvedValueOnce([]) // Дети great-grandchild-1
        .mockResolvedValueOnce([]) // Дети child-2
        .mockResolvedValueOnce([]); // Дети grandchild-1 (второй вызов)

      const result = await articlesService.getDescendantIds(id, companyId);

      expect(result).toEqual([
        'child-1',
        'grandchild-1',
        'great-grandchild-1',
        'child-2',
      ]);
    });
  });
});
