// Mock env.ts before importing anything that uses it
jest.mock('../../config/env', () => ({
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

import {
  BudgetsService,
  CreateBudgetDTO,
  UpdateBudgetDTO,
} from './budgets.service';
import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';

// Mock Prisma client
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    budget: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock Redis to prevent connection errors in tests
jest.mock('../../config/redis', () => {
  // Create a simple mock stream without requiring stream module
  const createMockStream = () => {
    const stream = {
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'end') {
          // Immediately call end callback
          setTimeout(() => callback(), 0);
        }
        return stream;
      }),
      push: jest.fn(),
    };
    return stream;
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
    scanStream: jest.fn(() => createMockStream()),
    quit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockRedis,
  };
});

describe('BudgetsService', () => {
  let budgetsService: BudgetsService;
  const companyId = 'test-company-id';

  beforeEach(() => {
    budgetsService = new BudgetsService();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up any async operations
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('getAll', () => {
    it('should return all budgets for company', async () => {
      const mockBudgets = [
        {
          id: '1',
          name: 'Budget 2024',
          status: 'active',
          _count: { plan_items: 5 },
        },
        {
          id: '2',
          name: 'Budget 2025',
          status: 'active',
          _count: { plan_items: 3 },
        },
      ];
      (prisma.budget.findMany as jest.Mock).mockResolvedValue(mockBudgets);

      const result = await budgetsService.getAll(companyId);

      expect(result).toEqual(mockBudgets);
      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { plan_items: true },
          },
        },
      });
    });

    it('should filter budgets by status', async () => {
      const mockBudgets = [
        {
          id: '1',
          name: 'Budget 2024',
          status: 'active',
          _count: { plan_items: 5 },
        },
      ];
      (prisma.budget.findMany as jest.Mock).mockResolvedValue(mockBudgets);

      await budgetsService.getAll(companyId, 'active');

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { companyId, status: 'active' },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { plan_items: true },
          },
        },
      });
    });
  });

  describe('getById', () => {
    it('should return budget by id', async () => {
      const mockBudget = {
        id: '1',
        name: 'Budget 2024',
        companyId,
        _count: { plan_items: 5 },
      };
      (prisma.budget.findFirst as jest.Mock).mockResolvedValue(mockBudget);

      const result = await budgetsService.getById('1', companyId);

      expect(result).toEqual(mockBudget);
    });

    it('should throw error if budget not found', async () => {
      (prisma.budget.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(budgetsService.getById('1', companyId)).rejects.toThrow(
        AppError
      );
      await expect(budgetsService.getById('1', companyId)).rejects.toThrow(
        'Budget not found'
      );
    });
  });

  describe('create', () => {
    it('should throw error if name is missing', async () => {
      const createData = {
        name: '',
        startDate: new Date('2024-01-01'),
      };

      await expect(
        budgetsService.create(companyId, createData)
      ).rejects.toThrow();
    });

    it('should throw error if end date is before start date', async () => {
      const createData: CreateBudgetDTO = {
        name: 'Budget 2024',
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'),
      };

      await expect(
        budgetsService.create(companyId, createData)
      ).rejects.toThrow(AppError);
      await expect(
        budgetsService.create(companyId, createData)
      ).rejects.toThrow('End date must be after start date');
    });
  });

  describe('update', () => {
    it('should throw error if invalid status', async () => {
      const mockBudget = {
        id: '1',
        name: 'Budget 2024',
        companyId,
        _count: { plan_items: 5 },
      };
      (prisma.budget.findFirst as jest.Mock).mockResolvedValue(mockBudget);

      const updateData = { status: 'invalid' };

      await expect(
        budgetsService.update('1', companyId, updateData)
      ).rejects.toThrow(AppError);
      await expect(
        budgetsService.update('1', companyId, updateData)
      ).rejects.toThrow('Status must be active or archived');
    });
  });

  describe('delete', () => {
    it('should throw error if budget has plan items', async () => {
      const mockBudget = {
        id: '1',
        name: 'Budget 2024',
        companyId,
        _count: { plan_items: 5 },
      };
      (prisma.budget.findFirst as jest.Mock).mockResolvedValue(mockBudget);
      (prisma.budget.findUnique as jest.Mock).mockResolvedValue(mockBudget);

      await expect(budgetsService.delete('1', companyId)).rejects.toThrow(
        AppError
      );
      await expect(budgetsService.delete('1', companyId)).rejects.toThrow(
        'Cannot delete budget with plan items'
      );
    });
  });
});
