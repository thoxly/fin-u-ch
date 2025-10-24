import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { validateRequired } from '../../utils/validation';

export interface CreatePlanItemDTO {
  type: string;
  startDate: Date;
  endDate?: Date;
  amount: number;
  currency?: string;
  articleId?: string;
  accountId?: string;
  dealId?: string;
  budgetId?: string;
  repeat?: string;
  status?: string;
  description?: string;
}

export interface MonthlyAmount {
  month: string;
  amount: number;
}

export class PlansService {
  async getAll(companyId: string, budgetId?: string) {
    const where: { companyId: string; budgetId?: string } = { companyId };
    if (budgetId) {
      where.budgetId = budgetId;
    }

    return prisma.planItem.findMany({
      where,
      include: {
        article: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
        budget: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getById(id: string, companyId: string) {
    const planItem = await prisma.planItem.findFirst({
      where: { id, companyId },
      include: {
        article: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
        budget: { select: { id: true, name: true } },
      },
    });

    if (!planItem) {
      throw new AppError('Plan item not found', 404);
    }

    return planItem;
  }

  async create(companyId: string, data: CreatePlanItemDTO) {
    validateRequired({
      type: data.type,
      startDate: data.startDate,
      amount: data.amount,
    });

    const validTypes = ['income', 'expense', 'transfer'];
    if (!validTypes.includes(data.type)) {
      throw new AppError('Type must be income, expense, or transfer', 400);
    }

    const validRepeat = [
      'none',
      'daily',
      'weekly',
      'monthly',
      'quarterly',
      'semiannual',
      'annual',
    ];
    if (data.repeat && !validRepeat.includes(data.repeat)) {
      throw new AppError('Invalid repeat value', 400);
    }

    return prisma.planItem.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<CreatePlanItemDTO>
  ) {
    await this.getById(id, companyId);

    return prisma.planItem.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    return prisma.planItem.delete({
      where: { id },
    });
  }

  /**
   * Expand plan item into monthly amounts based on repeat setting
   */
  expandPlan(
    planItem: {
      startDate: Date;
      endDate?: Date | null;
      amount: number;
      repeat: string;
    },
    periodStart: Date,
    periodEnd: Date
  ): MonthlyAmount[] {
    const result: MonthlyAmount[] = [];

    if (planItem.repeat === 'none') {
      const month = `${planItem.startDate.getFullYear()}-${String(planItem.startDate.getMonth() + 1).padStart(2, '0')}`;
      result.push({ month, amount: planItem.amount });
      return result;
    }

    // Calculate occurrences based on repeat frequency
    // eslint-disable-next-line prefer-const
    let currentDate = new Date(planItem.startDate);
    const endDate = planItem.endDate ? new Date(planItem.endDate) : periodEnd;

    while (currentDate <= endDate && currentDate <= periodEnd) {
      if (currentDate >= periodStart) {
        const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        result.push({ month, amount: planItem.amount });
      }

      // Advance to next occurrence
      switch (planItem.repeat) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case 'semiannual':
          currentDate.setMonth(currentDate.getMonth() + 6);
          break;
        case 'annual':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        default:
          return result;
      }
    }

    return result;
  }
}

export default new PlansService();
