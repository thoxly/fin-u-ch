// Mock env.ts before importing anything that uses it
jest.mock('../../../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:3000',
    SMTP_HOST: '',
    SMTP_PORT: 465,
    SMTP_USER: '',
    SMTP_PASS: '',
  },
}));

// Mock Prisma client
jest.mock('../../../../config/db', () => ({
  __esModule: true,
  default: {
    mappingRule: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import prisma from '../../../../config/db';
import { MappingRulesService } from '../mapping-rules.service';
import { AppError } from '../../../../middlewares/error';

// Используем правильную типизацию моков
const mockPrisma = prisma as any;

describe('MappingRulesService', () => {
  let service: MappingRulesService;
  const companyId = 'company-1';
  const userId = 'user-1';

  beforeEach(() => {
    service = new MappingRulesService();
    jest.clearAllMocks();
  });

  describe('getMappingRules', () => {
    it('должен вернуть список правил для компании', async () => {
      const rules = [
        {
          id: 'rule-1',
          companyId,
          ruleType: 'contains',
          pattern: 'налог',
          targetType: 'article',
          targetId: 'article-1',
          sourceField: 'description',
          usageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.mappingRule.findMany.mockResolvedValueOnce(rules);

      const result = await service.getMappingRules(companyId);

      expect(result).toEqual(rules);
      expect(mockPrisma.mappingRule.findMany).toHaveBeenCalledWith({
        where: { companyId },
        orderBy: { usageCount: 'desc' },
      });
    });

    it('должен фильтровать по targetType', async () => {
      const rules = [
        {
          id: 'rule-1',
          companyId,
          ruleType: 'contains',
          pattern: 'налог',
          targetType: 'article',
          targetId: 'article-1',
          sourceField: 'description',
          usageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.mappingRule.findMany.mockResolvedValueOnce(rules);

      const result = await service.getMappingRules(companyId, {
        targetType: 'article',
      });

      expect(result).toEqual(rules);
      expect(mockPrisma.mappingRule.findMany).toHaveBeenCalledWith({
        where: { companyId, targetType: 'article' },
        orderBy: { usageCount: 'desc' },
      });
    });

    it('должен фильтровать по sourceField', async () => {
      mockPrisma.mappingRule.findMany.mockResolvedValueOnce([]);

      await service.getMappingRules(companyId, {
        sourceField: 'description',
      });

      expect(mockPrisma.mappingRule.findMany).toHaveBeenCalledWith({
        where: { companyId, sourceField: 'description' },
        orderBy: { usageCount: 'desc' },
      });
    });
  });

  describe('createMappingRule', () => {
    it('должен создать правило маппинга', async () => {
      const ruleData = {
        ruleType: 'contains' as const,
        pattern: 'налог',
        targetType: 'article' as const,
        targetId: 'article-1',
        sourceField: 'description' as const,
      };

      const createdRule = {
        id: 'rule-1',
        companyId,
        userId,
        ...ruleData,
        targetName: null,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.mappingRule.create.mockResolvedValueOnce(createdRule);

      const result = await service.createMappingRule(
        companyId,
        userId,
        ruleData
      );

      expect(result).toEqual(createdRule);
      expect(mockPrisma.mappingRule.create).toHaveBeenCalledWith({
        data: {
          companyId,
          userId,
          ruleType: 'contains',
          pattern: 'налог',
          targetType: 'article',
          targetId: 'article-1',
          targetName: null,
          sourceField: 'description',
        },
      });
    });

    it('должен использовать description как sourceField по умолчанию', async () => {
      const ruleData = {
        ruleType: 'contains' as const,
        pattern: 'налог',
        targetType: 'article' as const,
        targetId: 'article-1',
      };

      const createdRule = {
        id: 'rule-1',
        companyId,
        userId,
        ...ruleData,
        sourceField: 'description',
        targetName: null,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.mappingRule.create.mockResolvedValueOnce(createdRule);

      await service.createMappingRule(companyId, userId, ruleData);

      expect(mockPrisma.mappingRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceField: 'description',
        }),
      });
    });
  });

  describe('updateMappingRule', () => {
    it('должен обновить правило маппинга', async () => {
      const existingRule = {
        id: 'rule-1',
        companyId,
        ruleType: 'contains',
        pattern: 'налог',
        targetType: 'article',
        targetId: 'article-1',
        sourceField: 'description',
        usageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedRule = {
        ...existingRule,
        pattern: 'налоговая',
        updatedAt: new Date(),
      };

      mockPrisma.mappingRule.findFirst.mockResolvedValueOnce(existingRule);
      mockPrisma.mappingRule.update.mockResolvedValueOnce(updatedRule);

      const result = await service.updateMappingRule('rule-1', companyId, {
        pattern: 'налоговая',
      });

      expect(result).toEqual(updatedRule);
      expect(mockPrisma.mappingRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1', companyId },
        data: { pattern: 'налоговая' },
      });
    });

    it('должен выбросить ошибку, если правило не найдено', async () => {
      mockPrisma.mappingRule.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateMappingRule('rule-1', companyId, {
          pattern: 'новый паттерн',
        })
      ).rejects.toThrow(AppError);
      await expect(
        service.updateMappingRule('rule-1', companyId, {
          pattern: 'новый паттерн',
        })
      ).rejects.toThrow('Mapping rule not found');
    });
  });

  describe('deleteMappingRule', () => {
    it('должен удалить правило маппинга', async () => {
      const existingRule = {
        id: 'rule-1',
        companyId,
        ruleType: 'contains',
        pattern: 'налог',
        targetType: 'article',
        targetId: 'article-1',
        sourceField: 'description',
        usageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.mappingRule.findFirst.mockResolvedValueOnce(existingRule);
      mockPrisma.mappingRule.delete.mockResolvedValueOnce(existingRule);

      const result = await service.deleteMappingRule('rule-1', companyId);

      expect(result).toEqual(existingRule);
      expect(mockPrisma.mappingRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-1', companyId },
      });
    });

    it('должен выбросить ошибку, если правило не найдено', async () => {
      mockPrisma.mappingRule.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.deleteMappingRule('rule-1', companyId)
      ).rejects.toThrow(AppError);
      await expect(
        service.deleteMappingRule('rule-1', companyId)
      ).rejects.toThrow('Mapping rule not found');
    });
  });

  describe('saveRulesForOperation', () => {
    it('должен сохранить правило для контрагента', async () => {
      const tx = {
        mappingRule: {
          create: jest.fn(),
        },
      } as any;

      const operation = {
        id: 'op-1',
        direction: 'expense',
        description: 'Payment',
        payer: null,
        receiver: 'Company B',
        matchedArticleId: null,
        matchedCounterpartyId: 'counterparty-1',
        matchedAccountId: null,
      };

      await service.saveRulesForOperation(tx, companyId, userId, operation);

      expect(tx.mappingRule.create).toHaveBeenCalledWith({
        data: {
          companyId,
          userId,
          ruleType: 'contains',
          pattern: 'Company B',
          targetType: 'counterparty',
          targetId: 'counterparty-1',
          sourceField: 'receiver',
        },
      });
    });

    it('должен сохранить правило для статьи', async () => {
      const tx = {
        mappingRule: {
          create: jest.fn(),
        },
      } as any;

      const operation = {
        id: 'op-1',
        direction: 'expense',
        description: 'Payment for services',
        payer: null,
        receiver: null,
        matchedArticleId: 'article-1',
        matchedCounterpartyId: null,
        matchedAccountId: null,
      };

      await service.saveRulesForOperation(tx, companyId, userId, operation);

      expect(tx.mappingRule.create).toHaveBeenCalledWith({
        data: {
          companyId,
          userId,
          ruleType: 'contains',
          pattern: 'Payment for services',
          targetType: 'article',
          targetId: 'article-1',
          sourceField: 'description',
        },
      });
    });

    it('должен сохранить правило для счета', async () => {
      const tx = {
        mappingRule: {
          create: jest.fn(),
        },
      } as any;

      const operation = {
        id: 'op-1',
        direction: 'expense',
        description: 'Payment',
        payer: null,
        receiver: null,
        matchedArticleId: null,
        matchedCounterpartyId: null,
        matchedAccountId: 'account-1',
      };

      await service.saveRulesForOperation(tx, companyId, userId, operation);

      expect(tx.mappingRule.create).toHaveBeenCalledWith({
        data: {
          companyId,
          userId,
          ruleType: 'contains',
          pattern: 'Payment',
          targetType: 'account',
          targetId: 'account-1',
          sourceField: 'description',
        },
      });
    });

    it('не должен сохранять правила, если нет совпадений', async () => {
      const tx = {
        mappingRule: {
          create: jest.fn(),
        },
      } as any;

      const operation = {
        id: 'op-1',
        direction: 'expense',
        description: 'Payment',
        payer: null,
        receiver: null,
        matchedArticleId: null,
        matchedCounterpartyId: null,
        matchedAccountId: null,
      };

      await service.saveRulesForOperation(tx, companyId, userId, operation);

      expect(tx.mappingRule.create).not.toHaveBeenCalled();
    });
  });
});
