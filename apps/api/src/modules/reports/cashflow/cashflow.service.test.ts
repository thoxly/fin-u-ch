import { CashflowService } from './cashflow.service';

// Mock the prisma import
jest.mock('../../../config/db', () => ({
  __esModule: true,
  default: {
    operation: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../utils/cache', () => ({
  cacheReport: jest.fn(),
  getCachedReport: jest.fn().mockResolvedValue(null),
  generateCacheKey: jest.fn().mockReturnValue('test-cache-key'),
}));

import prisma from '../../../config/db';
const mockOperationFindMany = prisma.operation.findMany as jest.Mock;

describe('CashflowService', () => {
  let service: CashflowService;

  beforeEach(() => {
    service = new CashflowService();
    jest.clearAllMocks();
  });

  describe('getCashflow', () => {
    it('should return empty activities when no operations found', async () => {
      mockOperationFindMany.mockResolvedValue([]);

      const result = await service.getCashflow('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
      });

      expect(result.activities).toEqual([]);
      expect(result.periodFrom).toBe('2025-01-01');
      expect(result.periodTo).toBe('2025-01-31');
      expect(mockOperationFindMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-id',
          operationDate: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-01-31'),
          },
          type: { in: ['income', 'expense'] },
        },
        include: {
          article: {
            select: { id: true, name: true, activity: true, type: true },
          },
        },
      });
    });

    it('should handle operations with income and expense groups', async () => {
      const mockOperations = [
        {
          id: '1',
          amount: 1000,
          type: 'income',
          companyId: 'company-id',
          article: {
            id: 'art-1',
            name: 'Sales',
            activity: 'operating',
            type: 'income',
          },
          operationDate: new Date('2025-01-15'),
        },
        {
          id: '2',
          amount: 500,
          type: 'expense',
          companyId: 'company-id',
          article: {
            id: 'art-2',
            name: 'Salary',
            activity: 'operating',
            type: 'expense',
          },
          operationDate: new Date('2025-01-20'),
        },
      ];

      mockOperationFindMany.mockResolvedValue(mockOperations);

      const result = await service.getCashflow('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
      });

      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].activity).toBe('operating');
      expect(result.activities[0].netCashflow).toBe(500);
      expect(result.activities[0].incomeGroups).toHaveLength(1);
      expect(result.activities[0].expenseGroups).toHaveLength(1);
    });

    it('should filter operations by activity when provided', async () => {
      const mockOperations = [
        {
          id: '1',
          amount: 1000,
          type: 'income',
          companyId: 'company-id',
          article: {
            id: 'art-1',
            name: 'Sales',
            activity: 'operating',
            type: 'income',
          },
          operationDate: new Date('2025-01-15'),
        },
        {
          id: '2',
          amount: 2000,
          type: 'income',
          companyId: 'company-id',
          article: {
            id: 'art-3',
            name: 'Investment',
            activity: 'investing',
            type: 'income',
          },
          operationDate: new Date('2025-01-20'),
        },
      ];

      mockOperationFindMany.mockResolvedValue(mockOperations);

      const result = await service.getCashflow('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
        activity: 'operating',
      });

      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].activity).toBe('operating');
      expect(result.activities[0].totalIncome).toBe(1000);
    });

    it('should apply rounding when provided', async () => {
      const mockOperations = [
        {
          id: '1',
          amount: 1234.56,
          type: 'income',
          companyId: 'company-id',
          article: {
            id: 'art-1',
            name: 'Sales',
            activity: 'operating',
            type: 'income',
          },
          operationDate: new Date('2025-01-15'),
        },
      ];

      mockOperationFindMany.mockResolvedValue(mockOperations);

      const result = await service.getCashflow('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
        rounding: 100,
      });

      expect(result.activities[0].totalIncome).toBe(1200);
    });

    it('should handle operations without articles', async () => {
      const mockOperations = [
        {
          id: '1',
          amount: 1000,
          type: 'income',
          companyId: 'company-id',
          article: null,
          operationDate: new Date('2025-01-15'),
        },
      ];

      mockOperationFindMany.mockResolvedValue(mockOperations);

      const result = await service.getCashflow('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
      });

      expect(result.activities).toEqual([]);
    });

    it('should group operations by month correctly', async () => {
      const mockOperations = [
        {
          id: '1',
          amount: 100,
          type: 'income',
          companyId: 'company-id',
          article: {
            id: 'art-1',
            name: 'Sales',
            activity: 'operating',
            type: 'income',
          },
          operationDate: new Date('2025-01-15'),
        },
        {
          id: '2',
          amount: 200,
          type: 'income',
          companyId: 'company-id',
          article: {
            id: 'art-1',
            name: 'Sales',
            activity: 'operating',
            type: 'income',
          },
          operationDate: new Date('2025-02-15'),
        },
      ];

      mockOperationFindMany.mockResolvedValue(mockOperations);

      const result = await service.getCashflow('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-02-28'),
      });

      const salesGroup = result.activities[0].incomeGroups[0];
      expect(salesGroup.months).toHaveLength(2);
      expect(salesGroup.months[0].amount).toBe(100);
      expect(salesGroup.months[1].amount).toBe(200);
      expect(salesGroup.total).toBe(300);
    });
  });
});
