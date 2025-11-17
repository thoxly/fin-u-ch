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
    operation: {
      findMany: jest.fn(),
    },
    importedOperation: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '../../../../config/db';
import { DuplicateDetectionService } from '../duplicate-detection.service';
import { ParsedDocument, DuplicateCheckResult } from '@fin-u-ch/shared';

// Используем правильную типизацию моков
const mockPrisma = prisma as any;

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;
  const companyId = 'company-1';

  beforeEach(() => {
    service = new DuplicateDetectionService();
    jest.clearAllMocks();
  });

  describe('detectDuplicate', () => {
    it('должен вернуть isDuplicate: false для новой операции', async () => {
      const doc: ParsedDocument = {
        date: new Date('2024-01-15'),
        amount: 1000,
        purpose: 'Test payment',
      };

      mockPrisma.operation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([]);

      const result = await service.detectDuplicate(companyId, doc);

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateOfId).toBeUndefined();
    });

    it('должен обнаружить дубликат по описанию в таблице operation', async () => {
      const doc: ParsedDocument = {
        date: new Date('2024-01-15'),
        amount: 1000,
        purpose: 'Payment for services rendered',
      };

      const existingOperation = {
        id: 'op-1',
        operationDate: new Date('2024-01-15'),
        amount: 1000,
        description: 'Payment for services rendered',
      };

      mockPrisma.operation.findMany.mockResolvedValueOnce([existingOperation]);
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([]);

      const result = await service.detectDuplicate(companyId, doc);

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateOfId).toBe('op-1');
      expect(result.existingOperation).toEqual(existingOperation);
    });

    it.skip('должен обнаружить дубликат по номеру документа в importedOperation', async () => {
      const doc: ParsedDocument = {
        date: new Date('2024-01-15'),
        amount: 1000,
        number: '12345',
        purpose: 'Test payment',
      };

      const existingImported = {
        id: 'imp-1',
        date: new Date('2024-01-15'),
        amount: 1000,
        number: '12345', // Прямое совпадение номера
        payerInn: null,
        receiverInn: null,
        payer: null,
        receiver: null,
        description: 'Test payment',
      };

      mockPrisma.operation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([
        existingImported,
      ]);

      const result = await service.detectDuplicate(companyId, doc);

      // Проверяем, что номер документа совпадает (прямое совпадение)
      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateOfId).toBe('imp-1');
    });

    it.skip('должен обнаружить дубликат по ИНН плательщика', async () => {
      const doc: ParsedDocument = {
        date: new Date('2024-01-15'),
        amount: 1000,
        payerInn: '1234567890',
        purpose: 'Test payment',
      };

      const existingImported = {
        id: 'imp-1',
        date: new Date('2024-01-15'),
        amount: 1000,
        number: null,
        payerInn: '1234567890',
        receiverInn: null,
        payer: null,
        receiver: null,
        description: 'Test payment',
      };

      mockPrisma.operation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([
        existingImported,
      ]);

      const result = await service.detectDuplicate(companyId, doc);

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateOfId).toBe('imp-1');
    });

    it.skip('должен обнаружить дубликат по ИНН получателя', async () => {
      const doc: ParsedDocument = {
        date: new Date('2024-01-15'),
        amount: 1000,
        receiverInn: '9876543210',
        purpose: 'Test payment',
      };

      const existingImported = {
        id: 'imp-1',
        date: new Date('2024-01-15'),
        amount: 1000,
        number: null,
        payerInn: null,
        receiverInn: '9876543210',
        payer: null,
        receiver: null,
        description: 'Test payment',
      };

      mockPrisma.operation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([
        existingImported,
      ]);

      const result = await service.detectDuplicate(companyId, doc);

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateOfId).toBe('imp-1');
    });

    it.skip('должен обнаружить дубликат по имени плательщика и получателя с совпадением description', async () => {
      // Тест проверяет, что если совпадают оба имени (payer и receiver) И description,
      // то это считается дубликатом
      const doc: ParsedDocument = {
        date: new Date('2024-01-15'),
        amount: 1000,
        payer: 'Company A',
        receiver: 'Company B',
        purpose: 'Payment for services rendered',
      };

      const existingImported = {
        id: 'imp-1',
        date: new Date('2024-01-15'),
        amount: 1000,
        number: null,
        payerInn: null,
        receiverInn: null,
        payer: 'Company A',
        receiver: 'Company B',
        description: 'Payment for services rendered',
      };

      mockPrisma.operation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([
        existingImported,
      ]);

      const result = await service.detectDuplicate(companyId, doc);

      // Проверяем совпадение по именам и description
      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateOfId).toBe('imp-1');
    });

    it('должен учитывать диапазон дат ±2 дня', async () => {
      const doc: ParsedDocument = {
        date: new Date('2024-01-15'),
        amount: 1000,
        purpose: 'Test payment',
      };

      const existingOperation = {
        id: 'op-1',
        operationDate: new Date('2024-01-13'), // -2 дня
        amount: 1000,
        description: 'Test payment',
      };

      mockPrisma.operation.findMany.mockResolvedValueOnce([existingOperation]);
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([]);

      const result = await service.detectDuplicate(companyId, doc);

      expect(result.isDuplicate).toBe(true);
    });

    it('не должен обнаружить дубликат, если дата вне диапазона', async () => {
      const doc: ParsedDocument = {
        date: new Date('2024-01-15'),
        amount: 1000,
        purpose: 'Test payment description that is long enough',
      };

      // Prisma фильтрует по дате, поэтому findMany вернет пустой массив
      // если дата вне диапазона
      mockPrisma.operation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([]);

      const result = await service.detectDuplicate(companyId, doc);

      expect(result.isDuplicate).toBe(false);
    });

    it('не должен обнаружить дубликат, если сумма не совпадает', async () => {
      const doc: ParsedDocument = {
        date: new Date('2024-01-15'),
        amount: 1000,
        purpose: 'Test payment',
      };

      mockPrisma.operation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([]);

      const result = await service.detectDuplicate(companyId, doc);

      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('detectDuplicatesBatch', () => {
    it('должен вернуть пустой Map для пустого массива', async () => {
      const result = await service.detectDuplicatesBatch(companyId, []);

      expect(result.size).toBe(0);
    });

    it('должен обработать несколько документов', async () => {
      const docs: ParsedDocument[] = [
        {
          date: new Date('2024-01-15'),
          amount: 1000,
          purpose: 'Payment 1',
        },
        {
          date: new Date('2024-01-16'),
          amount: 2000,
          purpose: 'Payment 2',
        },
      ];

      mockPrisma.operation.findMany.mockResolvedValueOnce([]);
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([]);

      const result = await service.detectDuplicatesBatch(companyId, docs);

      expect(result.size).toBe(2);
      expect(result.get(docs[0])?.isDuplicate).toBe(false);
      expect(result.get(docs[1])?.isDuplicate).toBe(false);
    });

    it('должен обнаружить дубликаты в батче', async () => {
      const docs: ParsedDocument[] = [
        {
          date: new Date('2024-01-15'),
          amount: 1000,
          purpose: 'Payment for services rendered',
        },
        {
          date: new Date('2024-01-16'),
          amount: 2000,
          purpose: 'Another payment',
        },
      ];

      const existingOperation = {
        id: 'op-1',
        operationDate: new Date('2024-01-15'),
        amount: 1000,
        description: 'Payment for services rendered',
      };

      mockPrisma.operation.findMany.mockResolvedValueOnce([existingOperation]);
      mockPrisma.importedOperation.findMany.mockResolvedValueOnce([]);

      const result = await service.detectDuplicatesBatch(companyId, docs);

      expect(result.size).toBe(2);
      expect(result.get(docs[0])?.isDuplicate).toBe(true);
      expect(result.get(docs[1])?.isDuplicate).toBe(false);
    });
  });
});
