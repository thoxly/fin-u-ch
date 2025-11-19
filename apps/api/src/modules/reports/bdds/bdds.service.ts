import prisma from '../../../config/db';
import { getMonthsBetween } from '@fin-u-ch/shared';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import plansService from '../../plans/plans.service';

export interface BDDSParams {
  periodFrom: Date;
  periodTo: Date;
  budgetId?: string;
}

export interface BDDSMonthlyData {
  month: string;
  amount: number;
}

export interface BDDSRow {
  articleId: string;
  articleName: string;
  type: string;
  months: BDDSMonthlyData[];
  total: number;
}

export interface BDDSActivity {
  activity: string;
  incomeGroups: BDDSRow[];
  expenseGroups: BDDSRow[];
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
}

export class BDDSService {
  async getBDDS(
    companyId: string,
    params: BDDSParams
  ): Promise<BDDSActivity[]> {
    // If no budgetId provided, return empty result
    if (!params.budgetId) {
      return [];
    }

    const cacheKey = generateCacheKey(companyId, 'bdds', params);
    const cached = await getCachedReport(cacheKey);
    if (cached) return cached as BDDSActivity[];

    const planItems = await prisma.planItem.findMany({
      where: {
        companyId,
        budgetId: params.budgetId,
        status: 'active',
        startDate: { lte: params.periodTo },
        OR: [{ endDate: null }, { endDate: { gte: params.periodFrom } }],
      },
      include: {
        article: {
          select: { id: true, name: true, type: true, activity: true },
        },
      },
    });

    const months = getMonthsBetween(params.periodFrom, params.periodTo);
    const monthsIndex = new Map(months.map((m, idx) => [m, idx]));

    // Group by activity
    const activitiesMap = new Map<string, BDDSActivity>();
    const activityTypes = ['operating', 'investing', 'financing'];

    // Initialize activities
    activityTypes.forEach((activity) => {
      activitiesMap.set(activity, {
        activity,
        incomeGroups: [],
        expenseGroups: [],
        totalIncome: 0,
        totalExpense: 0,
        netCashflow: 0,
      });
    });

    // Group plan items by activity and type
    const articleMap = new Map<string, BDDSRow>();

    for (const planItem of planItems) {
      if (!planItem.article || !planItem.article.activity) continue;

      // Плановые переводы между счетами не должны искажать доходы/расходы БДДС
      // Поэтому статьи с типом transfer пропускаем
      if (planItem.article.type === 'transfer') continue;

      const activity = activitiesMap.get(planItem.article.activity);
      if (!activity) continue;

      const expanded = plansService.expandPlan(
        planItem,
        params.periodFrom,
        params.periodTo
      );

      const key = planItem.article.id;
      if (!articleMap.has(key)) {
        const row = {
          articleId: planItem.article.id,
          articleName: planItem.article.name,
          type: planItem.article.type,
          months: months.map((m) => ({ month: m, amount: 0 })),
          total: 0,
        };
        articleMap.set(key, row);

        if (planItem.article.type === 'income') {
          activity.incomeGroups.push(row);
        } else {
          activity.expenseGroups.push(row);
        }
      }

      const row = articleMap.get(key)!;
      for (const { month, amount } of expanded) {
        const idx = monthsIndex.get(month);
        if (idx !== undefined) {
          row.months[idx].amount += amount;
          row.total += amount;
        }
      }
    }

    // Calculate totals for each activity
    activitiesMap.forEach((activity) => {
      activity.totalIncome = activity.incomeGroups.reduce(
        (sum, group) => sum + group.total,
        0
      );
      activity.totalExpense = activity.expenseGroups.reduce(
        (sum, group) => sum + group.total,
        0
      );
      activity.netCashflow = activity.totalIncome - activity.totalExpense;
    });

    const activities = Array.from(activitiesMap.values());
    await cacheReport(cacheKey, activities);
    return activities;
  }
}

export default new BDDSService();
