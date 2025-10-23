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

describe('BudgetsService', () => {
  let budgetsService: BudgetsService;
  const companyId = 'test-company-id';

  beforeEach(() => {
    budgetsService = new BudgetsService();
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all budgets for company', async () => {
      const mockBudgets = [
        {
          id: '1',
          name: 'Budget 2024',
          status: 'active',
          _count: { planItems: 5 },
        },
        {
          id: '2',
          name: 'Budget 2025',
          status: 'active',
          _count: { planItems: 3 },
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
            select: { planItems: true },
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
          _count: { planItems: 5 },
        },
      ];
      (prisma.budget.findMany as jest.Mock).mockResolvedValue(mockBudgets);

      await budgetsService.getAll(companyId, 'active');

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { companyId, status: 'active' },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { planItems: true },
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
        _count: { planItems: 5 },
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
    it('should create a budget', async () => {
      const createData: CreateBudgetDTO = {
        name: 'Budget 2024',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };
      const mockBudget = {
        id: '1',
        ...createData,
        companyId,
        status: 'active',
      };
      (prisma.budget.create as jest.Mock).mockResolvedValue(mockBudget);

      const result = await budgetsService.create(companyId, createData);

      expect(result).toEqual(mockBudget);
      expect(prisma.budget.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          companyId,
          status: 'active',
        },
      });
    });

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
    it('should update a budget', async () => {
      const mockBudget = {
        id: '1',
        name: 'Budget 2024',
        companyId,
        _count: { planItems: 5 },
      };
      (prisma.budget.findFirst as jest.Mock).mockResolvedValue(mockBudget);
      (prisma.budget.update as jest.Mock).mockResolvedValue({
        ...mockBudget,
        name: 'Updated Budget',
      });

      const updateData: UpdateBudgetDTO = { name: 'Updated Budget' };
      const result = await budgetsService.update('1', companyId, updateData);

      expect(result.name).toBe('Updated Budget');
      expect(prisma.budget.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      });
    });

    it('should throw error if invalid status', async () => {
      const mockBudget = {
        id: '1',
        name: 'Budget 2024',
        companyId,
        _count: { planItems: 5 },
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
    it('should delete a budget without plan items', async () => {
      const mockBudget = {
        id: '1',
        name: 'Budget 2024',
        companyId,
        _count: { planItems: 0 },
      };
      (prisma.budget.findFirst as jest.Mock).mockResolvedValue(mockBudget);
      (prisma.budget.findUnique as jest.Mock).mockResolvedValue(mockBudget);
      (prisma.budget.delete as jest.Mock).mockResolvedValue(mockBudget);

      await budgetsService.delete('1', companyId);

      expect(prisma.budget.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw error if budget has plan items', async () => {
      const mockBudget = {
        id: '1',
        name: 'Budget 2024',
        companyId,
        _count: { planItems: 5 },
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
