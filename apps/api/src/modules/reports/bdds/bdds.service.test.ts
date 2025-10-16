import { BDDSService } from './bdds.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  planItem: {
    findMany: jest.fn(),
  },
} as any;

// Mock the prisma import
jest.mock('../../../config/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

describe('BDDSService', () => {
  let service: BDDSService;

  beforeEach(() => {
    service = new BDDSService();
  });

  describe('getBDDS', () => {
    it('should return empty rows when no plans found', async () => {
      mockPrisma.planItem.findMany.mockResolvedValue([]);

      const result = await service.getBDDS('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
      });

      expect(result).toEqual([]);
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

      mockPrisma.planItem.findMany.mockResolvedValue(mockPlans as never);

      const result = await service.getBDDS('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-02-28'),
      });

      expect(result).toHaveLength(1);
      expect(result[0].articleName).toBe('Sales');
      expect(result[0].total).toBe(3000);
    });
  });
});
