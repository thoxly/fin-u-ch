import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { validateRequired } from '../../utils/validation';
import { invalidateReportCache } from '../reports/utils/cache';

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

    const result = await prisma.planItem.create({
      data: {
        ...data,
        companyId,
      },
    });

    // Инвалидируем кэш отчетов после создания плановой записи
    await invalidateReportCache(companyId);

    return result;
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<CreatePlanItemDTO>
  ) {
    await this.getById(id, companyId);

    const result = await prisma.planItem.update({
      where: { id },
      data,
    });

    // Инвалидируем кэш отчетов после обновления плановой записи
    await invalidateReportCache(companyId);

    return result;
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    const result = await prisma.planItem.delete({
      where: { id },
    });

    // Инвалидируем кэш отчетов после удаления плановой записи
    await invalidateReportCache(companyId);

    return result;
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
        case 'monthly': {
          // Для ежемесячного повтора учитываем последний день месяца
          const originalDay = currentDate.getDate();
          currentDate.setMonth(currentDate.getMonth() + 1);

          // Если день месяца изменился (например, 31 января -> 3 марта),
          // значит мы "перекатились" на следующий месяц
          if (currentDate.getDate() !== originalDay) {
            // Устанавливаем последний день предыдущего месяца
            currentDate.setDate(0); // Это устанавливает последний день предыдущего месяца
          }
          break;
        }
        case 'quarterly': {
          // Для квартального повтора также учитываем последний день месяца
          const originalDayQuarterly = currentDate.getDate();
          currentDate.setMonth(currentDate.getMonth() + 3);

          if (currentDate.getDate() !== originalDayQuarterly) {
            currentDate.setDate(0);
          }
          break;
        }
        case 'semiannual': {
          // Для полугодового повтора также учитываем последний день месяца
          const originalDaySemiannual = currentDate.getDate();
          currentDate.setMonth(currentDate.getMonth() + 6);

          if (currentDate.getDate() !== originalDaySemiannual) {
            currentDate.setDate(0);
          }
          break;
        }
        case 'annual': {
          // Для годового повтора также учитываем последний день месяца
          const originalDayAnnual = currentDate.getDate();
          currentDate.setFullYear(currentDate.getFullYear() + 1);

          if (currentDate.getDate() !== originalDayAnnual) {
            currentDate.setDate(0);
          }
          break;
        }
        default:
          return result;
      }
    }

    return result;
  }
}

export default new PlansService();
