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
    counterparty: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    article: {
      findFirst: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
    },
    mappingRule: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import prisma from '../../../../config/db';
import {
  determineDirection,
  matchCounterparty,
  matchArticle,
  matchAccount,
  autoMatch,
} from '../matching.service';
import { ParsedDocument } from '../../parsers/clientBankExchange.parser';

const mockPrisma = prisma as any;

describe('matching.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('determineDirection', () => {
    it('должен вернуть null, если ИНН компании не указан', async () => {
      const result = await determineDirection('1234567890', '9876543210', null);
      expect(result).toBeNull();
    });

    it('должен вернуть "expense", если плательщик - наша компания', async () => {
      const result = await determineDirection(
        '1234567890',
        '9876543210',
        '1234567890'
      );
      expect(result).toBe('expense');
    });

    it('должен вернуть "income", если получатель - наша компания', async () => {
      const result = await determineDirection(
        '1234567890',
        '9876543210',
        '9876543210'
      );
      expect(result).toBe('income');
    });

    it('должен вернуть "transfer", если плательщик и получатель - одна компания', async () => {
      const result = await determineDirection(
        '1234567890',
        '1234567890',
        '1234567890'
      );
      expect(result).toBe('transfer');
    });

    it('должен вернуть null, если направление не определено', async () => {
      const result = await determineDirection(
        '1111111111',
        '2222222222',
        '3333333333'
      );
      expect(result).toBeNull();
    });

    it('должен убирать пробелы из ИНН', async () => {
      const result = await determineDirection(
        '1234 5678 90',
        '9876 5432 10',
        '1234 5678 90'
      );
      expect(result).toBe('expense');
    });
  });

  describe('matchCounterparty', () => {
    const companyId = 'company-1';
    const operation: ParsedDocument = {
      date: new Date(),
      amount: 1000,
      purpose: 'Test',
      payer: 'ООО Поставщик',
      payerInn: '1234567890',
      receiver: 'ООО Клиент',
      receiverInn: '9876543210',
    };

    it('должен сопоставить контрагента по ИНН для expense', async () => {
      mockPrisma.counterparty.findFirst.mockResolvedValueOnce({
        id: 'counterparty-1',
        companyId,
        name: 'ООО Клиент',
        inn: '9876543210',
        category: 'customer',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await matchCounterparty(companyId, operation, 'expense');

      expect(result).toEqual({
        id: 'counterparty-1',
        matchedBy: 'inn',
      });
      expect(mockPrisma.counterparty.findFirst).toHaveBeenCalledWith({
        where: {
          companyId,
          inn: '9876543210',
        },
      });
    });

    it('должен сопоставить контрагента по ИНН для income', async () => {
      mockPrisma.counterparty.findFirst.mockResolvedValueOnce({
        id: 'counterparty-2',
        companyId,
        name: 'ООО Поставщик',
        inn: '1234567890',
        category: 'supplier',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await matchCounterparty(companyId, operation, 'income');

      expect(result).toEqual({
        id: 'counterparty-2',
        matchedBy: 'inn',
      });
      expect(mockPrisma.counterparty.findFirst).toHaveBeenCalledWith({
        where: {
          companyId,
          inn: '1234567890',
        },
      });
    });

    it('должен сопоставить контрагента по правилу типа alias', async () => {
      mockPrisma.counterparty.findFirst.mockResolvedValueOnce(null);
      mockPrisma.mappingRule.findFirst.mockResolvedValueOnce({
        id: 'rule-1',
        companyId,
        userId: 'user-1',
        ruleType: 'alias',
        pattern: 'Поставщик',
        targetType: 'counterparty',
        targetId: 'counterparty-3',
        targetName: null,
        sourceField: 'payer',
        usageCount: 0,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await matchCounterparty(companyId, operation, 'income');

      expect(result).toEqual({
        id: 'counterparty-3',
        matchedBy: 'rule',
        ruleId: 'rule-1',
      });
    });

    it('должен сопоставить контрагента по правилу типа contains', async () => {
      mockPrisma.counterparty.findFirst.mockResolvedValueOnce(null);
      mockPrisma.mappingRule.findFirst.mockResolvedValueOnce(null);
      mockPrisma.mappingRule.findMany.mockResolvedValueOnce([
        {
          id: 'rule-2',
          companyId,
          userId: 'user-1',
          ruleType: 'contains',
          pattern: 'Поставщик',
          targetType: 'counterparty',
          targetId: 'counterparty-4',
          targetName: null,
          sourceField: 'payer',
          usageCount: 0,
          lastUsedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);
      mockPrisma.mappingRule.update.mockResolvedValueOnce({} as any);

      const result = await matchCounterparty(companyId, operation, 'income');

      expect(result).toEqual({
        id: 'counterparty-4',
        matchedBy: 'rule',
        ruleId: 'rule-2',
      });
      expect(mockPrisma.mappingRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-2' },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: expect.any(Date),
        },
      });
    });

    it('должен сопоставить контрагента по fuzzy match', async () => {
      mockPrisma.counterparty.findFirst.mockResolvedValueOnce(null);
      mockPrisma.mappingRule.findFirst.mockResolvedValueOnce(null);
      mockPrisma.mappingRule.findMany.mockResolvedValueOnce([]);
      mockPrisma.counterparty.findMany.mockResolvedValueOnce([
        {
          id: 'counterparty-5',
          companyId,
          name: 'ООО Поставщик Товаров',
          inn: null,
          category: 'supplier',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'counterparty-6',
          companyId,
          name: 'Другая компания',
          inn: null,
          category: 'other',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await matchCounterparty(companyId, operation, 'income');

      expect(result).toEqual({
        id: 'counterparty-5',
        matchedBy: 'fuzzy',
      });
    });

    it('должен вернуть null, если контрагент не найден', async () => {
      mockPrisma.counterparty.findFirst.mockResolvedValueOnce(null);
      mockPrisma.mappingRule.findFirst.mockResolvedValueOnce(null);
      mockPrisma.mappingRule.findMany.mockResolvedValueOnce([]);
      mockPrisma.counterparty.findMany.mockResolvedValueOnce([
        {
          id: 'counterparty-7',
          companyId,
          name: 'Совсем другая компания',
          inn: null,
          category: 'other',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const result = await matchCounterparty(companyId, operation, 'income');

      expect(result).toBeNull();
    });
  });

  describe('matchArticle', () => {
    const companyId = 'company-1';
    const operation: ParsedDocument = {
      date: new Date(),
      amount: 1000,
      purpose: 'Единый налоговый платеж',
    };

    it('должен вернуть null, если направление не определено', async () => {
      const result = await matchArticle(companyId, operation, null);
      expect(result).toBeNull();
    });

    it('должен сопоставить статью по правилу типа contains', async () => {
      mockPrisma.mappingRule.findMany.mockResolvedValueOnce([
        {
          id: 'rule-3',
          companyId,
          userId: 'user-1',
          ruleType: 'contains',
          pattern: 'налог',
          targetType: 'article',
          targetId: 'article-1',
          targetName: null,
          sourceField: 'description',
          usageCount: 0,
          lastUsedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);
      mockPrisma.article.findFirst.mockResolvedValueOnce({
        id: 'article-1',
        companyId,
        name: 'Налоги',
        type: 'expense',
        isActive: true,
      } as any);
      mockPrisma.mappingRule.update.mockResolvedValueOnce({} as any);

      const result = await matchArticle(companyId, operation, 'expense');

      expect(result).toEqual({
        id: 'article-1',
        matchedBy: 'rule',
        ruleId: 'rule-3',
      });
    });

    it('должен сопоставить статью по ключевым словам', async () => {
      mockPrisma.mappingRule.findMany.mockResolvedValueOnce([]);
      mockPrisma.article.findFirst.mockResolvedValueOnce({
        id: 'article-2',
        companyId,
        name: 'Налоги',
        type: 'expense',
        isActive: true,
      } as any);

      const result = await matchArticle(companyId, operation, 'expense');

      expect(result).toEqual({
        id: 'article-2',
        matchedBy: 'keyword',
      });
    });

    it('должен вернуть null, если статья не найдена', async () => {
      mockPrisma.mappingRule.findMany.mockResolvedValueOnce([]);
      mockPrisma.article.findFirst.mockResolvedValueOnce(null);

      const result = await matchArticle(companyId, operation, 'expense');

      expect(result).toBeNull();
    });

    it('должен проверить тип статьи при сопоставлении по правилу', async () => {
      mockPrisma.mappingRule.findMany.mockResolvedValueOnce([
        {
          id: 'rule-4',
          companyId,
          userId: 'user-1',
          ruleType: 'contains',
          pattern: 'выручка',
          targetType: 'article',
          targetId: 'article-3',
          targetName: null,
          sourceField: 'description',
          usageCount: 0,
          lastUsedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);
      mockPrisma.article.findFirst.mockResolvedValueOnce(null); // Статья не найдена, т.к. тип не совпадает

      const operationWithRevenue: ParsedDocument = {
        ...operation,
        purpose: 'Выручка от продаж',
      };

      const result = await matchArticle(
        companyId,
        operationWithRevenue,
        'expense'
      );

      expect(result).toBeNull();
    });
  });

  describe('matchAccount', () => {
    const companyId = 'company-1';
    const operation: ParsedDocument = {
      date: new Date(),
      amount: 1000,
      purpose: 'Test',
      payerAccount: '40702810068000001468',
      receiverAccount: '40817810099910004312',
    };

    it('должен вернуть null для transfer', async () => {
      const result = await matchAccount(companyId, operation, 'transfer');
      expect(result).toBeNull();
    });

    it('должен сопоставить счет для expense', async () => {
      mockPrisma.account.findFirst.mockResolvedValueOnce({
        id: 'account-1',
        companyId,
        name: 'Расчетный счет',
        number: '40702810068000001468',
        currency: 'RUB',
        openingBalance: 0,
        excludeFromTotals: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await matchAccount(companyId, operation, 'expense');

      expect(result).toEqual({
        id: 'account-1',
        matchedBy: 'account_number',
      });
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          companyId,
          number: '40702810068000001468',
          isActive: true,
        },
      });
    });

    it('должен сопоставить счет для income', async () => {
      mockPrisma.account.findFirst.mockResolvedValueOnce({
        id: 'account-2',
        companyId,
        name: 'Входящий счет',
        number: '40817810099910004312',
        currency: 'RUB',
        openingBalance: 0,
        excludeFromTotals: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await matchAccount(companyId, operation, 'income');

      expect(result).toEqual({
        id: 'account-2',
        matchedBy: 'account_number',
      });
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          companyId,
          number: '40817810099910004312',
          isActive: true,
        },
      });
    });

    it('должен вернуть null, если счет не найден', async () => {
      mockPrisma.account.findFirst.mockResolvedValueOnce(null);

      const result = await matchAccount(companyId, operation, 'expense');

      expect(result).toBeNull();
    });
  });

  describe('autoMatch', () => {
    const companyId = 'company-1';
    const companyInn = '1234567890';

    it('должен выполнить полное автосопоставление', async () => {
      const operation: ParsedDocument = {
        date: new Date(),
        amount: 1000,
        purpose: 'Единый налоговый платеж',
        payer: 'ООО АКСОН',
        payerInn: '1234567890',
        payerAccount: '40702810068000001468',
        receiver: 'ФНС России',
        receiverInn: '9876543210',
        receiverAccount: '03100643000000018500',
      };

      // Mock determineDirection
      const matchingService = await import('../matching.service');
      jest
        .spyOn(matchingService, 'determineDirection')
        .mockResolvedValueOnce('expense');

      // Mock matchCounterparty
      jest.spyOn(matchingService, 'matchCounterparty').mockResolvedValueOnce({
        id: 'counterparty-1',
        matchedBy: 'inn',
      });

      // Mock matchArticle
      jest.spyOn(matchingService, 'matchArticle').mockResolvedValueOnce({
        id: 'article-1',
        matchedBy: 'keyword',
      });

      // Mock matchAccount
      jest.spyOn(matchingService, 'matchAccount').mockResolvedValueOnce({
        id: 'account-1',
        matchedBy: 'account_number',
      });

      const result = await autoMatch(companyId, operation, companyInn);

      expect(result.direction).toBe('expense');
      expect(result.matchedCounterpartyId).toBe('counterparty-1');
      expect(result.matchedArticleId).toBe('article-1');
      expect(result.matchedAccountId).toBe('account-1');
      expect(result.matchedBy).toBe('inn'); // Приоритет: inn > keyword > account_number
    });

    it('должен вернуть null для direction, если ИНН компании не указан', async () => {
      const operation: ParsedDocument = {
        date: new Date(),
        amount: 1000,
        purpose: 'Test',
      };

      const result = await autoMatch(companyId, operation, null);

      expect(result.direction).toBeUndefined();
    });
  });
});
