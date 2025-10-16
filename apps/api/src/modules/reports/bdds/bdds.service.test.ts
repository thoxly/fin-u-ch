import { BddsService } from './bdds.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    plan: {
      findMany: jest.fn(),
    },
  })),
}));

describe('BddsService', () => {
  let service: BddsService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new BddsService(mockPrisma);
  });

  describe('getBdds', () => {
    it('should return empty rows when no plans found', async () => {
      mockPrisma.plan.findMany.mockResolvedValue([]);

      const result = await service.getBdds(
        'company-id',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.rows).toEqual([]);
    });

    it('should aggregate plans by article', async () => {
      const mockPlans = [
        {
          id: '1',
          amount: 1000,
          article: { name: 'Sales' },
          month: '2025-01',
        },
        {
          id: '2',
          amount: 2000,
          article: { name: 'Sales' },
          month: '2025-02',
        },
      ];

      mockPrisma.plan.findMany.mockResolvedValue(mockPlans as never);

      const result = await service.getBdds(
        'company-id',
        '2025-01-01',
        '2025-02-28'
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].articleName).toBe('Sales');
      expect(result.rows[0].total).toBe(3000);
    });
  });
});
