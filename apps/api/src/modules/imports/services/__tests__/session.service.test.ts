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
    importSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    importedOperation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import prisma from '../../../../config/db';
import { SessionService, IMPORT_SESSION_STATUS } from '../session.service';
import { AppError } from '../../../../middlewares/error';

// Используем правильную типизацию моков
const mockPrisma = prisma as any;

describe('SessionService', () => {
  let service: SessionService;
  const companyId = 'company-1';
  const userId = 'user-1';
  const sessionId = 'session-1';

  beforeEach(() => {
    service = new SessionService();
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('должен создать сессию импорта', async () => {
      const sessionData = {
        id: sessionId,
        companyId,
        userId,
        fileName: 'statement.txt',
        status: IMPORT_SESSION_STATUS.DRAFT,
        importedCount: 10,
        confirmedCount: 0,
        processedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.importSession.create.mockResolvedValueOnce(sessionData);

      const result = await service.createSession(
        companyId,
        userId,
        'statement.txt',
        10
      );

      expect(result).toEqual(sessionData);
      expect(mockPrisma.importSession.create).toHaveBeenCalledWith({
        data: {
          companyId,
          userId,
          fileName: 'statement.txt',
          status: IMPORT_SESSION_STATUS.DRAFT,
          importedCount: 10,
        },
      });
    });
  });

  describe('getSession', () => {
    it('должен вернуть сессию импорта', async () => {
      const sessionData = {
        id: sessionId,
        companyId,
        userId,
        fileName: 'statement.txt',
        status: IMPORT_SESSION_STATUS.DRAFT,
        importedCount: 10,
        confirmedCount: 0,
        processedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.importSession.findFirst.mockResolvedValueOnce(sessionData);

      const result = await service.getSession(sessionId, companyId);

      expect(result).toEqual(sessionData);
      expect(mockPrisma.importSession.findFirst).toHaveBeenCalledWith({
        where: { id: sessionId, companyId },
      });
    });

    it('должен выбросить ошибку, если сессия не найдена', async () => {
      mockPrisma.importSession.findFirst.mockResolvedValueOnce(null);

      await expect(service.getSession(sessionId, companyId)).rejects.toThrow(
        AppError
      );
      await expect(service.getSession(sessionId, companyId)).rejects.toThrow(
        'Import session not found'
      );
    });
  });

  describe('updateSessionCounters', () => {
    it('должен обновить счетчики сессии', async () => {
      const sessionData = {
        id: sessionId,
        companyId,
        importedCount: 10,
        confirmedCount: 0,
        processedCount: 0,
      };

      mockPrisma.importedOperation.count
        .mockResolvedValueOnce(5) // confirmedCount
        .mockResolvedValueOnce(3); // processedCount
      mockPrisma.importSession.findFirst.mockResolvedValueOnce(sessionData);
      mockPrisma.importSession.update.mockResolvedValueOnce({
        ...sessionData,
        confirmedCount: 5,
        processedCount: 3,
        status: IMPORT_SESSION_STATUS.CONFIRMED,
      });

      await service.updateSessionCounters(sessionId, companyId);

      expect(mockPrisma.importedOperation.count).toHaveBeenCalledWith({
        where: { importSessionId: sessionId, companyId, confirmed: true },
      });
      expect(mockPrisma.importedOperation.count).toHaveBeenCalledWith({
        where: { importSessionId: sessionId, companyId, processed: true },
      });
      expect(mockPrisma.importSession.update).toHaveBeenCalledWith({
        where: { id: sessionId, companyId },
        data: {
          confirmedCount: 5,
          processedCount: 3,
          status: IMPORT_SESSION_STATUS.CONFIRMED,
        },
      });
    });

    it('должен установить статус PROCESSED, если все операции обработаны', async () => {
      const sessionData = {
        id: sessionId,
        companyId,
        importedCount: 10,
        confirmedCount: 0,
        processedCount: 0,
      };

      mockPrisma.importedOperation.count
        .mockResolvedValueOnce(10) // confirmedCount
        .mockResolvedValueOnce(10); // processedCount
      mockPrisma.importSession.findFirst.mockResolvedValueOnce(sessionData);
      mockPrisma.importSession.update.mockResolvedValueOnce({
        ...sessionData,
        confirmedCount: 10,
        processedCount: 10,
        status: IMPORT_SESSION_STATUS.PROCESSED,
      });

      await service.updateSessionCounters(sessionId, companyId);

      expect(mockPrisma.importSession.update).toHaveBeenCalledWith({
        where: { id: sessionId, companyId },
        data: {
          confirmedCount: 10,
          processedCount: 10,
          status: IMPORT_SESSION_STATUS.PROCESSED,
        },
      });
    });
  });

  describe('deleteSession', () => {
    it('должен удалить сессию импорта', async () => {
      const sessionData = {
        id: sessionId,
        companyId,
        userId,
        fileName: 'statement.txt',
        status: IMPORT_SESSION_STATUS.DRAFT,
        importedCount: 10,
        confirmedCount: 0,
        processedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.importSession.findFirst.mockResolvedValueOnce(sessionData);
      mockPrisma.importedOperation.count.mockResolvedValueOnce(5);
      mockPrisma.importSession.delete.mockResolvedValueOnce(sessionData);

      const result = await service.deleteSession(sessionId, companyId);

      expect(result.deleted).toBe(6); // 5 operations + 1 session
      expect(mockPrisma.importSession.delete).toHaveBeenCalledWith({
        where: { id: sessionId, companyId },
      });
    });
  });

  describe('getImportSessions', () => {
    it('должен вернуть список сессий импорта', async () => {
      const sessions = [
        {
          id: sessionId,
          companyId,
          userId,
          fileName: 'statement.txt',
          status: IMPORT_SESSION_STATUS.DRAFT,
          importedCount: 10,
          confirmedCount: 0,
          processedCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.importSession.findMany.mockResolvedValueOnce(sessions);
      mockPrisma.importSession.count.mockResolvedValueOnce(1);

      const result = await service.getImportSessions(companyId);

      expect(result.sessions).toEqual(sessions);
      expect(result.total).toBe(1);
      expect(mockPrisma.importSession.findMany).toHaveBeenCalledWith({
        where: { companyId },
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('должен фильтровать по статусу', async () => {
      mockPrisma.importSession.findMany.mockResolvedValueOnce([]);
      mockPrisma.importSession.count.mockResolvedValueOnce(0);

      await service.getImportSessions(companyId, {
        status: IMPORT_SESSION_STATUS.CONFIRMED,
      });

      expect(mockPrisma.importSession.findMany).toHaveBeenCalledWith({
        where: { companyId, status: IMPORT_SESSION_STATUS.CONFIRMED },
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('должен фильтровать по датам', async () => {
      const dateFrom = '2024-01-01';
      const dateTo = '2024-01-31';

      mockPrisma.importSession.findMany.mockResolvedValueOnce([]);
      mockPrisma.importSession.count.mockResolvedValueOnce(0);

      await service.getImportSessions(companyId, {
        dateFrom,
        dateTo,
      });

      const expectedDateTo = new Date('2024-01-31');
      expectedDateTo.setHours(23, 59, 59, 999);

      expect(mockPrisma.importSession.findMany).toHaveBeenCalledWith({
        where: {
          companyId,
          createdAt: {
            gte: new Date(dateFrom),
            lte: expectedDateTo,
          },
        },
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getImportedOperations', () => {
    it('должен вернуть список импортированных операций', async () => {
      const operations = [
        {
          id: 'op-1',
          importSessionId: sessionId,
          companyId,
          date: new Date(),
          amount: 1000,
          description: 'Test',
          matchedArticle: null,
          matchedCounterparty: null,
          matchedAccount: null,
          matchedDeal: null,
          matchedDepartment: null,
        },
      ];

      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
      });
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce(operations);
      mockPrisma.importedOperation.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(0) // confirmed
        .mockResolvedValueOnce(1) // unmatched
        .mockResolvedValueOnce(0); // duplicates

      const result = await service.getImportedOperations(sessionId, companyId);

      expect(result.operations).toEqual(operations);
      expect(result.total).toBe(1);
      expect(result.confirmed).toBe(0);
      expect(result.unmatched).toBe(1);
      expect(result.duplicates).toBe(0);
    });

    it('должен фильтровать по confirmed', async () => {
      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
      });
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await service.getImportedOperations(sessionId, companyId, {
        confirmed: true,
      });

      expect(mockPrisma.importedOperation.findMany).toHaveBeenCalledWith({
        where: {
          importSessionId: sessionId,
          companyId,
          confirmed: true,
        },
        include: expect.any(Object),
        take: 20,
        skip: 0,
        orderBy: expect.any(Array),
      });
    });

    it('должен фильтровать по matched', async () => {
      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
      });
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await service.getImportedOperations(sessionId, companyId, {
        matched: true,
      });

      expect(mockPrisma.importedOperation.findMany).toHaveBeenCalledWith({
        where: {
          importSessionId: sessionId,
          companyId,
          matchedBy: { not: null },
        },
        include: expect.any(Object),
        take: 20,
        skip: 0,
        orderBy: expect.any(Array),
      });
    });

    it('должен фильтровать по duplicate', async () => {
      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
      });
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await service.getImportedOperations(sessionId, companyId, {
        duplicate: true,
      });

      expect(mockPrisma.importedOperation.findMany).toHaveBeenCalledWith({
        where: {
          importSessionId: sessionId,
          companyId,
          isDuplicate: true,
        },
        include: expect.any(Object),
        take: 20,
        skip: 0,
        orderBy: expect.any(Array),
      });
    });
  });

  describe('updateImportedOperation', () => {
    it('должен обновить импортированную операцию', async () => {
      const operation = {
        id: 'op-1',
        importSessionId: sessionId,
        companyId,
        matchedArticleId: null,
        matchedCounterpartyId: null,
        matchedAccountId: null,
        matchedDealId: null,
        matchedDepartmentId: null,
        currency: null,
        repeat: null,
        confirmed: false,
        direction: null,
        matchedBy: null,
      };

      const updatedOperation = {
        ...operation,
        matchedArticleId: 'article-1',
        matchedArticle: { id: 'article-1', name: 'Article 1' },
        matchedCounterparty: null,
        matchedAccount: null,
        matchedDeal: null,
        matchedDepartment: null,
      };

      mockPrisma.importedOperation.findFirst.mockResolvedValueOnce(operation);
      mockPrisma.importedOperation.update.mockResolvedValueOnce(
        updatedOperation
      );

      // Мокаем updateSessionCounters
      mockPrisma.importedOperation.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
        importedCount: 10,
      });
      mockPrisma.importSession.update.mockResolvedValueOnce({});

      const result = await service.updateImportedOperation('op-1', companyId, {
        matchedArticleId: 'article-1',
      });

      expect(result.matchedArticleId).toBe('article-1');
      expect(mockPrisma.importedOperation.update).toHaveBeenCalled();
    });

    it('должен установить matchedBy в manual, если операция полностью сопоставлена', async () => {
      const operation = {
        id: 'op-1',
        importSessionId: sessionId,
        companyId,
        matchedArticleId: null,
        matchedCounterpartyId: null,
        matchedAccountId: null,
        matchedDealId: null,
        matchedDepartmentId: null,
        currency: null,
        repeat: null,
        confirmed: false,
        direction: null,
        matchedBy: null,
      };

      const updatedOperation = {
        ...operation,
        matchedArticleId: 'article-1',
        matchedCounterpartyId: 'counterparty-1',
        matchedAccountId: 'account-1',
        currency: 'RUB',
        matchedArticle: { id: 'article-1', name: 'Article 1' },
        matchedCounterparty: { id: 'counterparty-1', name: 'Counterparty 1' },
        matchedAccount: { id: 'account-1', name: 'Account 1' },
        matchedDeal: null,
        matchedDepartment: null,
      };

      mockPrisma.importedOperation.findFirst.mockResolvedValueOnce(operation);
      mockPrisma.importedOperation.update
        .mockResolvedValueOnce(updatedOperation)
        .mockResolvedValueOnce({
          ...updatedOperation,
          matchedBy: 'manual',
        });

      mockPrisma.importedOperation.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.importSession.findFirst.mockResolvedValueOnce({
        id: sessionId,
        companyId,
        importedCount: 10,
      });
      mockPrisma.importSession.update.mockResolvedValueOnce({});

      const result = await service.updateImportedOperation('op-1', companyId, {
        matchedArticleId: 'article-1',
        matchedCounterpartyId: 'counterparty-1',
        matchedAccountId: 'account-1',
        currency: 'RUB',
      });

      expect(result.matchedBy).toBe('manual');
    });

    it('должен выбросить ошибку, если операция не найдена', async () => {
      mockPrisma.importedOperation.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateImportedOperation('op-1', companyId, {
          matchedArticleId: 'article-1',
        })
      ).rejects.toThrow(AppError);
      await expect(
        service.updateImportedOperation('op-1', companyId, {
          matchedArticleId: 'article-1',
        })
      ).rejects.toThrow('Imported operation not found');
    });
  });

  describe('bulkUpdateImportedOperations', () => {
    it('должен обновить несколько операций', async () => {
      const operations = [
        {
          id: 'op-1',
          importSessionId: sessionId,
          companyId,
        },
        {
          id: 'op-2',
          importSessionId: sessionId,
          companyId,
        },
      ];

      mockPrisma.importedOperation.findMany.mockResolvedValueOnce(operations);
      mockPrisma.importedOperation.updateMany.mockResolvedValueOnce({
        count: 2,
      });

      const result = await service.bulkUpdateImportedOperations(
        sessionId,
        companyId,
        ['op-1', 'op-2'],
        {
          matchedArticleId: 'article-1',
        }
      );

      expect(result.updated).toBe(2);
      expect(mockPrisma.importedOperation.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['op-1', 'op-2'] },
          importSessionId: sessionId,
          companyId,
        },
        data: expect.objectContaining({
          matchedArticleId: 'article-1',
          matchedBy: 'manual',
        }),
      });
    });

    it('должен выбросить ошибку, если не все операции найдены', async () => {
      const operations = [
        {
          id: 'op-1',
          importSessionId: sessionId,
          companyId,
        },
      ];

      mockPrisma.importedOperation.findMany.mockResolvedValueOnce(operations);

      await expect(
        service.bulkUpdateImportedOperations(
          sessionId,
          companyId,
          ['op-1', 'op-2'],
          {
            matchedArticleId: 'article-1',
          }
        )
      ).rejects.toThrow(AppError);

      await expect(
        service.bulkUpdateImportedOperations(
          sessionId,
          companyId,
          ['op-1', 'op-2'],
          {
            matchedArticleId: 'article-1',
          }
        )
      ).rejects.toThrow('Some operations not found');
    });
  });
});
