import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { validateRequired } from '../../utils/validation';

export interface CreateBudgetDTO {
  name: string;
  startDate: Date;
  endDate?: Date;
}

export interface UpdateBudgetDTO {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
}

export class BudgetsService {
  async getAll(companyId: string, status?: string) {
    const where: { companyId: string; status?: string } = { companyId };
    if (status) {
      where.status = status;
    }

    return prisma.budget.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { planItems: true },
        },
      },
    });
  }

  async getById(id: string, companyId: string) {
    const budget = await prisma.budget.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: { planItems: true },
        },
      },
    });

    if (!budget) {
      throw new AppError('Budget not found', 404);
    }

    return budget;
  }

  async create(companyId: string, data: CreateBudgetDTO) {
    validateRequired({
      name: data.name,
      startDate: data.startDate,
    });

    // Validate date range if endDate is provided
    if (data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
      throw new AppError('End date must be after start date', 400);
    }

    return prisma.budget.create({
      data: {
        ...data,
        companyId,
        status: 'active',
      },
    });
  }

  async update(id: string, companyId: string, data: UpdateBudgetDTO) {
    await this.getById(id, companyId);

    // Validate status
    if (data.status && !['active', 'archived'].includes(data.status)) {
      throw new AppError('Status must be active or archived', 400);
    }

    // Validate date range if both dates are provided
    if (data.startDate && data.endDate) {
      if (new Date(data.startDate) > new Date(data.endDate)) {
        throw new AppError('End date must be after start date', 400);
      }
    }

    return prisma.budget.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    // Check if budget has plan items
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        _count: {
          select: { planItems: true },
        },
      },
    });

    if (budget && budget._count.planItems > 0) {
      throw new AppError(
        'Cannot delete budget with plan items. Archive it instead or delete plan items first.',
        400
      );
    }

    return prisma.budget.delete({
      where: { id },
    });
  }
}

export default new BudgetsService();
