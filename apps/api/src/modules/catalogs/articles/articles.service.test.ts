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
      });
    });

    it('should throw AppError for invalid type', async () => {
      const companyId = 'company-1';
      const data = { name: 'New Article', type: 'invalid' };

      await expect(articlesService.create(companyId, data)).rejects.toThrow(
        AppError
      );
      await expect(articlesService.create(companyId, data)).rejects.toThrow(
        'Type must be income, expense, or transfer'
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
      };
      const updatedArticle = { ...existingArticle, ...data };

      mockedPrisma.article.findFirst.mockResolvedValue(existingArticle);
      mockedPrisma.article.update.mockResolvedValue(updatedArticle);

      const result = await articlesService.update(id, companyId, data);

      expect(result).toEqual(updatedArticle);
      expect(mockedPrisma.article.update).toHaveBeenCalledWith({
        where: { id, companyId },
        data,
      });
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
      mockedPrisma.article.update.mockResolvedValue(deletedArticle);

      const result = await articlesService.delete(id, companyId);

      expect(result).toEqual(deletedArticle);
      expect(mockedPrisma.article.update).toHaveBeenCalledWith({
        where: { id, companyId },
        data: { isActive: false },
      });
    });
  });
});
