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
  planItemId?: string; // Optional to maintain backward compatibility
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

    // Проверяем и корректируем дату, если она не существует в месяце
    const startDate =
      data.startDate instanceof Date
        ? data.startDate
        : new Date(data.startDate);
    const adjustedStartDate = new Date(startDate);
    const originalDay = startDate.getDate();
    const testDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      originalDay
    );

    if (testDate.getDate() !== originalDay) {
      // День не существует в этом месяце, устанавливаем последний день месяца
      adjustedStartDate.setDate(0);
    }

    // Конвертируем endDate если он передан
    const endDate = data.endDate
      ? data.endDate instanceof Date
        ? data.endDate
        : new Date(data.endDate)
      : undefined;

    const result = await prisma.planItem.create({
      data: {
        ...data,
        startDate: adjustedStartDate,
        endDate,
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

    // Если обновляется startDate, проверяем и корректируем дату
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...data };
    if (data.startDate) {
      const startDate =
        data.startDate instanceof Date
          ? data.startDate
          : new Date(data.startDate);
      const adjustedStartDate = new Date(startDate);
      const originalDay = startDate.getDate();
      const testDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        originalDay
      );

      if (testDate.getDate() !== originalDay) {
        // День не существует в этом месяце, устанавливаем последний день месяца
        adjustedStartDate.setDate(0);
        updateData.startDate = adjustedStartDate;
      } else {
        updateData.startDate = adjustedStartDate;
      }
    }

    // Конвертируем endDate если он передан
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate
        ? data.endDate instanceof Date
          ? data.endDate
          : new Date(data.endDate)
        : null;
    }

    const result = await prisma.planItem.update({
      where: { id },
      data: updateData,
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
      id?: string;
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
      result.push({ month, amount: planItem.amount, planItemId: planItem.id });
      return result;
    }

    // Calculate occurrences based on repeat frequency
    // eslint-disable-next-line prefer-const
    let currentDate = new Date(planItem.startDate);
    const endDate = planItem.endDate ? new Date(planItem.endDate) : periodEnd;

    // Нормализуем даты для корректного сравнения (без времени)
    const normalizeDate = (date: Date): Date => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };

    const normalizedPeriodStart = normalizeDate(periodStart);
    const normalizedPeriodEnd = normalizeDate(periodEnd);
    const normalizedEndDate = normalizeDate(endDate);
    let normalizedCurrentDate = normalizeDate(currentDate);

    while (
      normalizedCurrentDate <= normalizedEndDate &&
      normalizedCurrentDate <= normalizedPeriodEnd
    ) {
      // Проверяем, попадает ли текущая дата в период
      // Используем >= чтобы включить первую дату, если она попадает в период
      if (normalizedCurrentDate >= normalizedPeriodStart) {
        // Определяем месяц из текущей даты (до любых модификаций)
        // Важно: используем currentDate ДО того, как он будет изменен в switch ниже
        const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        // Проверяем, нет ли уже этого месяца для этого плана в результате
        // Используем комбинацию month и planItem.id для правильной обработки нескольких планов на одну статью
        const existingMonth = result.find(
          (r) => r.month === month && r.planItemId === planItem.id
        );
        if (!existingMonth) {
          result.push({
            month,
            amount: planItem.amount,
            planItemId: planItem.id,
          });
        } else {
          // Если месяц уже есть для этого плана, добавляем сумму
          existingMonth.amount += planItem.amount;
        }
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
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();

          // Переходим на следующий месяц, сохраняя день
          const nextMonth = currentMonth + 1;
          const nextYear = nextMonth === 12 ? currentYear + 1 : currentYear;
          const normalizedNextMonth = nextMonth === 12 ? 0 : nextMonth;

          // Создаем дату следующего месяца с тем же днем
          const nextDate = new Date(nextYear, normalizedNextMonth, originalDay);

          // Если день не существует в следующем месяце (например, 31 января -> нет 31 февраля),
          // устанавливаем последний день следующего месяца
          if (nextDate.getDate() !== originalDay) {
            // Устанавливаем на 1-е число следующего месяца, затем откатываемся на 1 день назад
            nextDate.setDate(0); // Это устанавливает последний день предыдущего месяца (нужного нам)
          }

          currentDate = nextDate;
          break;
        }
        case 'quarterly': {
          // Для квартального повтора также учитываем последний день месяца
          const originalDayQuarterly = currentDate.getDate();
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();

          // Переходим на 3 месяца вперед
          const nextMonth = currentMonth + 3;
          const nextYear =
            nextMonth >= 12
              ? currentYear + Math.floor(nextMonth / 12)
              : currentYear;
          const normalizedNextMonth = nextMonth % 12;

          const nextDate = new Date(
            nextYear,
            normalizedNextMonth,
            originalDayQuarterly
          );

          if (nextDate.getDate() !== originalDayQuarterly) {
            nextDate.setDate(0);
          }

          currentDate = nextDate;
          break;
        }
        case 'semiannual': {
          // Для полугодового повтора также учитываем последний день месяца
          const originalDaySemiannual = currentDate.getDate();
          const currentMonth = currentDate.getMonth();
          const currentYear = currentDate.getFullYear();

          // Переходим на 6 месяцев вперед
          const nextMonth = currentMonth + 6;
          const nextYear =
            nextMonth >= 12
              ? currentYear + Math.floor(nextMonth / 12)
              : currentYear;
          const normalizedNextMonth = nextMonth % 12;

          const nextDate = new Date(
            nextYear,
            normalizedNextMonth,
            originalDaySemiannual
          );

          if (nextDate.getDate() !== originalDaySemiannual) {
            nextDate.setDate(0);
          }

          currentDate = nextDate;
          break;
        }
        case 'annual': {
          // Для годового повтора также учитываем последний день месяца
          const originalDayAnnual = currentDate.getDate();
          const nextYear = currentDate.getFullYear() + 1;
          const currentMonth = currentDate.getMonth();

          const nextDate = new Date(nextYear, currentMonth, originalDayAnnual);

          if (nextDate.getDate() !== originalDayAnnual) {
            nextDate.setDate(0);
          }

          currentDate = nextDate;
          break;
        }
        default:
          return result;
      }

      // Обновляем нормализованную дату после изменения currentDate
      normalizedCurrentDate = normalizeDate(currentDate);
    }

    return result;
  }
}

export default new PlansService();
