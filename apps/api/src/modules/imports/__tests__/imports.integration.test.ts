// Mock env.ts before importing anything that uses it
jest.mock('../../../config/env', () => ({
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

// Mock logger
jest.mock('../../../config/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Prisma client
jest.mock('../../../config/db', () => ({
  __esModule: true,
  default: {
    company: {
      findUnique: jest.fn(),
    },
    importSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    importedOperation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    mappingRule: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    operation: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({})),
  },
}));

// Mock matching service
jest.mock('../services/matching.service', () => ({
  autoMatch: jest.fn(),
}));

// Mock operations service
jest.mock('../../operations/operations.service', () => ({
  default: {
    create: jest.fn(),
  },
}));

import prisma from '../../../config/db';
import { ImportsService } from '../imports.service';
import { AppError } from '../../../middlewares/error';
import { autoMatch } from '../services/matching.service';
import * as parserModule from '../parsers/clientBankExchange.parser';
import { readFileSync } from 'fs';
import { join } from 'path';

// Используем правильную типизацию моков
// Моки созданы через jest.mock, поэтому используем as any для обхода проблем типизации
const mockPrisma = prisma as any;

const mockAutoMatch = autoMatch as jest.MockedFunction<typeof autoMatch>;

describe('ImportsService Integration Tests', () => {
  let importsService: ImportsService;
  const companyId = 'company-1';
  const userId = 'user-1';
  const fixturesDir = join(__dirname, '../parsers/__tests__/fixtures');

  beforeEach(() => {
    importsService = new ImportsService();
    jest.clearAllMocks();
  });

  describe('uploadStatement', () => {
    it('должен успешно загрузить файл и создать сессию импорта', async () => {
      const filePath = join(fixturesDir, 'sample-statement.txt');
      const fileBuffer = readFileSync(filePath);

      mockPrisma.company.findUnique.mockResolvedValueOnce({
        id: companyId,
        inn: '1234567890',
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importSession.findFirst>
      >);

      mockPrisma.importSession.create.mockResolvedValueOnce({
        id: 'session-1',
        companyId,
        userId,
        fileName: 'sample-statement.txt',
        status: 'draft',
        importedCount: 2,
        confirmedCount: 0,
        processedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importSession.create>
      >);

      mockAutoMatch.mockResolvedValue({
        direction: 'expense',
        matchedCounterpartyId: 'counterparty-1',
        matchedArticleId: 'article-1',
        matchedAccountId: 'account-1',
        matchedBy: 'inn',
      });

      mockPrisma.importedOperation.create
        .mockResolvedValueOnce({
          id: 'op-1',
          importSessionId: 'session-1',
          companyId,
          date: new Date('2025-10-24'),
          amount: 8263.0,
          description: 'Единый налоговый платеж',
          direction: 'expense',
          confirmed: false,
          processed: false,
          draft: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as Awaited<
          ReturnType<typeof mockPrisma.importedOperation.create>
        >)
        .mockResolvedValueOnce({
          id: 'op-2',
          importSessionId: 'session-1',
          companyId,
          date: new Date('2025-10-25'),
          amount: 15000.5,
          description: 'Оплата по счету №123 от 20.10.2025',
          direction: 'expense',
          confirmed: false,
          processed: false,
          draft: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as Awaited<
          ReturnType<typeof mockPrisma.importedOperation.create>
        >);

      const result = await importsService.uploadStatement(
        companyId,
        userId,
        'sample-statement.txt',
        fileBuffer
      );

      expect(result.sessionId).toBe('session-1');
      expect(result.importedCount).toBe(2);
      expect(result.fileName).toBe('sample-statement.txt');
      expect(mockPrisma.importSession.create).toHaveBeenCalled();
      expect(mockPrisma.importedOperation.create).toHaveBeenCalledTimes(2);
    });

    it('должен выбросить ошибку для файла больше 10MB', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      await expect(
        importsService.uploadStatement(
          companyId,
          userId,
          'large.txt',
          largeBuffer
        )
      ).rejects.toThrow(AppError);
      await expect(
        importsService.uploadStatement(
          companyId,
          userId,
          'large.txt',
          largeBuffer
        )
      ).rejects.toThrow('File size exceeds 10MB limit');
    });

    it('должен выбросить ошибку для файла с более чем 1000 операций', async () => {
      const filePath = join(fixturesDir, 'sample-statement.txt');
      const fileBuffer = readFileSync(filePath);

      mockPrisma.company.findUnique.mockResolvedValueOnce({
        id: companyId,
        inn: '1234567890',
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importSession.findFirst>
      >);

      // Мокаем парсер, чтобы вернуть 1001 операцию
      jest.spyOn(parserModule, 'parseClientBankExchange').mockReturnValueOnce({
        documents: Array(1001)
          .fill(null)
          .map((_, i) => ({
            date: new Date(),
            amount: 1000,
            purpose: `Operation ${i}`,
          })),
      });

      await expect(
        importsService.uploadStatement(
          companyId,
          userId,
          'large.txt',
          fileBuffer
        )
      ).rejects.toThrow(AppError);
      await expect(
        importsService.uploadStatement(
          companyId,
          userId,
          'large.txt',
          fileBuffer
        )
      ).rejects.toThrow('File contains more than 1000 operations');
    });
  });

  describe('getImportedOperations', () => {
    it('должен вернуть список операций из сессии', async () => {
      const sessionId = 'session-1';

      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
        userId,
        fileName: 'test.txt',
        status: 'draft',
        importedCount: 2,
        confirmedCount: 0,
        processedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importSession.findFirst>
      >);

      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([
        {
          id: 'op-1',
          importSessionId: sessionId,
          companyId,
          date: new Date(),
          amount: 1000,
          description: 'Test',
          confirmed: false,
          processed: false,
          draft: true,
          matchedArticle: null,
          matchedCounterparty: null,
          matchedAccount: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as unknown as Awaited<
        ReturnType<typeof mockPrisma.importedOperation.findMany>
      >);

      mockPrisma.importedOperation.count.mockResolvedValueOnce(2);

      const result = await importsService.getImportedOperations(
        sessionId,
        companyId
      );

      expect(result.operations).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(mockPrisma.importSession.findFirst).toHaveBeenCalledWith({
        where: { id: sessionId, companyId },
      });
    });

    it('должен выбросить ошибку, если сессия не найдена', async () => {
      mockPrisma.importSession.findFirst.mockResolvedValueOnce(null);

      await expect(
        importsService.getImportedOperations('invalid-session', companyId)
      ).rejects.toThrow(AppError);
      await expect(
        importsService.getImportedOperations('invalid-session', companyId)
      ).rejects.toThrow('Import session not found');
    });

    it('должен фильтровать по confirmed', async () => {
      const sessionId = 'session-1';

      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importSession.findFirst>
      >);

      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.count.mockResolvedValueOnce(0);

      await importsService.getImportedOperations(sessionId, companyId, {
        confirmed: true,
      });

      expect(mockPrisma.importedOperation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            confirmed: true,
          }),
        })
      );
    });
  });

  describe('updateImportedOperation', () => {
    it('должен обновить операцию', async () => {
      const operationId = 'op-1';

      mockPrisma.importedOperation.findFirst.mockResolvedValueOnce({
        id: operationId,
        companyId,
        importSessionId: 'session-1',
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importedOperation.findFirst>
      >);

      mockPrisma.importedOperation.update.mockResolvedValueOnce({
        id: operationId,
        companyId,
        matchedArticleId: 'article-1',
        matchedCounterpartyId: 'counterparty-1',
        confirmed: true,
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importedOperation.update>
      >);

      const result = await importsService.updateImportedOperation(
        operationId,
        companyId,
        {
          matchedArticleId: 'article-1',
          matchedCounterpartyId: 'counterparty-1',
          confirmed: true,
        }
      );

      expect(result.matchedArticleId).toBe('article-1');
      expect(result.confirmed).toBe(true);
    });
  });

  describe('bulkUpdateImportedOperations', () => {
    it('должен обновить несколько операций', async () => {
      const sessionId = 'session-1';
      const operationIds = ['op-1', 'op-2'];

      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importSession.findFirst>
      >);

      mockPrisma.importedOperation.updateMany.mockResolvedValueOnce({
        count: 2,
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importedOperation.updateMany>
      >);

      const result = await importsService.bulkUpdateImportedOperations(
        sessionId,
        companyId,
        operationIds,
        {
          confirmed: true,
        }
      );

      expect(result.updated).toBe(2);
    });
  });

  describe('applyRules', () => {
    it('должен применить правила маппинга к сессии', async () => {
      const sessionId = 'session-1';

      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importSession.findFirst>
      >);

      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([
        {
          id: 'op-1',
          description: 'Оплата налогов',
        },
      ] as unknown as Awaited<
        ReturnType<typeof mockPrisma.importedOperation.findMany>
      >);

      mockPrisma.mappingRule.findMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          ruleType: 'contains',
          pattern: 'налог',
          targetType: 'article',
          targetId: 'article-1',
        },
      ] as unknown as Awaited<
        ReturnType<typeof mockPrisma.mappingRule.findMany>
      >);

      mockPrisma.article.findFirst.mockResolvedValueOnce({
        id: 'article-1',
        type: 'expense',
        isActive: true,
      } as unknown as Awaited<ReturnType<typeof mockPrisma.article.findFirst>>);

      mockPrisma.mappingRule.update.mockResolvedValueOnce(
        {} as unknown as Awaited<
          ReturnType<typeof mockPrisma.mappingRule.update>
        >
      );
      mockPrisma.importedOperation.update.mockResolvedValueOnce(
        {} as unknown as Awaited<
          ReturnType<typeof mockPrisma.importedOperation.update>
        >
      );

      const result = await importsService.applyRules(sessionId, companyId);

      expect(result.applied).toBeGreaterThanOrEqual(0);
      expect(result.updated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('importOperations', () => {
    it('должен импортировать подтвержденные операции', async () => {
      const sessionId = 'session-1';

      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importSession.findFirst>
      >);

      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([
        {
          id: 'op-1',
          companyId,
          date: new Date(),
          amount: 1000,
          description: 'Test',
          direction: 'expense',
          matchedArticleId: 'article-1',
          matchedCounterpartyId: 'counterparty-1',
          matchedAccountId: 'account-1',
          currency: 'RUB',
          confirmed: true,
          processed: false,
        },
      ] as unknown as Awaited<
        ReturnType<typeof mockPrisma.importedOperation.findMany>
      >);

      mockPrisma.operation.create.mockResolvedValueOnce({
        id: 'operation-1',
      } as unknown as Awaited<ReturnType<typeof mockPrisma.operation.create>>);

      mockPrisma.importedOperation.update.mockResolvedValueOnce(
        {} as unknown as Awaited<
          ReturnType<typeof mockPrisma.importedOperation.update>
        >
      );
      mockPrisma.importSession.update.mockResolvedValueOnce({
        processedCount: 1,
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importSession.update>
      >);

      const result = await importsService.importOperations(
        sessionId,
        companyId,
        userId,
        undefined
      );

      expect(result.imported).toBe(1);
      expect(result.created).toBe(1);
    });
  });

  describe('deleteSession', () => {
    it('должен удалить сессию и все связанные операции', async () => {
      const sessionId = 'session-1';

      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importSession.findFirst>
      >);

      mockPrisma.importedOperation.deleteMany.mockResolvedValueOnce({
        count: 5,
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.importedOperation.deleteMany>
      >);

      mockPrisma.importSession.delete.mockResolvedValueOnce(
        {} as unknown as Awaited<
          ReturnType<typeof mockPrisma.importSession.delete>
        >
      );

      const result = await importsService.deleteSession(sessionId, companyId);

      expect(result.deleted).toBe(6); // 5 operations + 1 session
    });
  });

  describe('Mapping Rules CRUD', () => {
    it('должен создать правило маппинга', async () => {
      mockPrisma.mappingRule.create.mockResolvedValueOnce({
        id: 'rule-1',
        companyId,
        userId,
        ruleType: 'contains',
        pattern: 'налог',
        targetType: 'article',
        targetId: 'article-1',
        sourceField: 'description',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.mappingRule.create>
      >);

      const result = await importsService.createMappingRule(companyId, userId, {
        ruleType: 'contains',
        pattern: 'налог',
        targetType: 'article',
        targetId: 'article-1',
        sourceField: 'description',
      });

      expect(result.id).toBe('rule-1');
      expect(result.pattern).toBe('налог');
    });

    it('должен получить список правил', async () => {
      mockPrisma.mappingRule.findMany.mockResolvedValueOnce([
        {
          id: 'rule-1',
          companyId,
          ruleType: 'contains',
          pattern: 'налог',
          targetType: 'article',
        },
      ] as unknown as Awaited<
        ReturnType<typeof mockPrisma.mappingRule.findMany>
      >);

      const result = await importsService.getMappingRules(companyId, {
        targetType: 'article',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rule-1');
    });

    it('должен обновить правило', async () => {
      mockPrisma.mappingRule.findFirst.mockResolvedValueOnce({
        id: 'rule-1',
        companyId,
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.mappingRule.findFirst>
      >);

      mockPrisma.mappingRule.update.mockResolvedValueOnce({
        id: 'rule-1',
        pattern: 'обновленный паттерн',
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.mappingRule.update>
      >);

      const result = await importsService.updateMappingRule(
        'rule-1',
        companyId,
        {
          pattern: 'обновленный паттерн',
        }
      );

      expect(result.pattern).toBe('обновленный паттерн');
    });

    it('должен удалить правило', async () => {
      mockPrisma.mappingRule.findFirst.mockResolvedValueOnce({
        id: 'rule-1',
        companyId,
      } as unknown as Awaited<
        ReturnType<typeof mockPrisma.mappingRule.findFirst>
      >);

      mockPrisma.mappingRule.delete.mockResolvedValueOnce(
        {} as unknown as Awaited<
          ReturnType<typeof mockPrisma.mappingRule.delete>
        >
      );

      await importsService.deleteMappingRule('rule-1', companyId);

      expect(mockPrisma.mappingRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
    });
  });
});
