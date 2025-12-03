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

import { BDDSService } from './bdds.service';

// Mock the prisma import - must be before any imports that use it
jest.mock('../../../config/db', () => ({
  __esModule: true,
  default: {
    planItem: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../utils/cache', () => ({
  cacheReport: jest.fn(),
  getCachedReport: jest.fn().mockResolvedValue(null),
  generateCacheKey: jest.fn().mockReturnValue('test-cache-key'),
}));

jest.mock('../../plans/plans.service', () => ({
  __esModule: true,
  default: {
    expandPlan: jest.fn(),
  },
}));

import prisma from '../../../config/db';
import plansService from '../../plans/plans.service';

const mockPlanItemFindMany = prisma.planItem.findMany as jest.Mock;
const mockExpandPlan = plansService.expandPlan as jest.Mock;

describe('BDDSService', () => {
  let service: BDDSService;

  beforeEach(() => {
    service = new BDDSService();
  });

  describe('getBDDS', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return empty rows when no plans found', async () => {
      mockPlanItemFindMany.mockResolvedValue([]);

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
          companyId: 'company-id',
          amount: 1000,
          type: 'income',
          repeat: 'once',
          status: 'active',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          article: {
            id: 'art-1',
            name: 'Sales',
            type: 'income',
            activity: 'operating',
          },
        },
        {
          id: '2',
          companyId: 'company-id',
          amount: 2000,
          type: 'income',
          repeat: 'once',
          status: 'active',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-12-31'),
          article: {
            id: 'art-1',
            name: 'Sales',
            type: 'income',
            activity: 'operating',
          },
        },
      ];

      mockPlanItemFindMany.mockResolvedValue(mockPlans);
      mockExpandPlan.mockImplementation((plan) => {
        if (plan.id === '1') {
          return [
            { month: '2025-01', amount: 1000 },
            { month: '2025-02', amount: 1000 },
          ];
        }
        return [{ month: '2025-02', amount: 2000 }];
      });

      const result = await service.getBDDS('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-02-28'),
        budgetId: 'test-budget-id',
      });

      expect(result).toHaveLength(3); // operating, investing, financing activities

      // Find the operating activity (should contain our test data)
      const operatingActivity = result.find((a) => a.activity === 'operating');
      expect(operatingActivity).toBeDefined();
      expect(operatingActivity!.incomeGroups).toHaveLength(1);
      expect(operatingActivity!.incomeGroups[0].articleName).toBe('Sales');
      expect(operatingActivity!.incomeGroups[0].total).toBe(4000); // 1000 + 1000 + 2000
      expect(mockPlanItemFindMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-id',
          budgetId: 'test-budget-id',
          status: 'active',
          startDate: { lte: new Date('2025-02-28') },
          OR: [{ endDate: null }, { endDate: { gte: new Date('2025-01-01') } }],
        },
        include: {
          article: {
            select: { id: true, name: true, type: true, activity: true },
          },
        },
      });
    });

    it('should handle plans without articles', async () => {
      const mockPlans = [
        {
          id: '1',
          companyId: 'company-id',
          amount: 1000,
          type: 'income',
          repeat: 'once',
          status: 'active',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          article: null,
        },
      ];

      mockPlanItemFindMany.mockResolvedValue(mockPlans);

      const result = await service.getBDDS('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
        budgetId: 'test-budget-id',
      });

      // Should return 3 activities (operating, investing, financing) but with empty groups
      expect(result).toHaveLength(3);
      expect(
        result.every(
          (a) => a.incomeGroups.length === 0 && a.expenseGroups.length === 0
        )
      ).toBe(true);
    });

    it('should sort rows by type and article name', async () => {
      const mockPlans = [
        {
          id: '1',
          companyId: 'company-id',
          amount: 1000,
          type: 'expense',
          repeat: 'once',
          status: 'active',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          article: {
            id: 'art-2',
            name: 'Salary',
            type: 'expense',
            activity: 'operating',
          },
        },
        {
          id: '2',
          companyId: 'company-id',
          amount: 2000,
          type: 'income',
          repeat: 'once',
          status: 'active',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          article: {
            id: 'art-1',
            name: 'Sales',
            type: 'income',
            activity: 'operating',
          },
        },
      ];

      mockPlanItemFindMany.mockResolvedValue(mockPlans);
      mockExpandPlan.mockImplementation((plan) => [
        { month: '2025-01', amount: plan.amount },
      ]);

      const result = await service.getBDDS('company-id', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
        budgetId: 'test-budget-id',
      });

      expect(result).toHaveLength(3); // operating, investing, financing activities

      // Find the operating activity
      const operatingActivity = result.find((a) => a.activity === 'operating');
      expect(operatingActivity).toBeDefined();
      expect(operatingActivity!.expenseGroups).toHaveLength(1);
      expect(operatingActivity!.incomeGroups).toHaveLength(1);

      // Should be sorted by type first (expense before income), then by name
      expect(operatingActivity!.expenseGroups[0].type).toBe('expense');
      expect(operatingActivity!.incomeGroups[0].type).toBe('income');
    });

    it('should verify companyId filter is applied for security', async () => {
      mockPlanItemFindMany.mockResolvedValue([]);

      await service.getBDDS('test-company-123', {
        periodFrom: new Date('2025-01-01'),
        periodTo: new Date('2025-01-31'),
        budgetId: 'test-budget-id',
      });

      expect(mockPlanItemFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'test-company-123',
          }),
        })
      );
    });
  });
});
