import { CashflowService } from './cashflow.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  operation: {
    findMany: jest.fn(),
  },
} as any;

describe('CashflowService', () => {
  let service: CashflowService;

  beforeEach(() => {
    service = new CashflowService();
  });

  describe('getCashflow', () => {
    it('should return empty activities when no operations found', async () => {
      mockPrisma.operation.findMany.mockResolvedValue([]);

      const result = await service.getCashflow('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
      });

      expect(result.activities).toEqual([]);
    });

    it('should handle operations with income and expense groups', async () => {
      const mockOperations = [
        {
          id: '1',
          amount: 1000,
          type: 'income',
          article: { name: 'Sales', activity: 'operating' },
          operationDate: new Date('2025-01-15'),
        },
        {
          id: '2',
          amount: 500,
          type: 'expense',
          article: { name: 'Salary', activity: 'operating' },
          operationDate: new Date('2025-01-20'),
        },
      ];

      mockPrisma.operation.findMany.mockResolvedValue(mockOperations as never);

      const result = await service.getCashflow('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
      });

      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].activity).toBe('operating');
      expect(result.activities[0].netCashflow).toBe(500);
    });
  });
});
