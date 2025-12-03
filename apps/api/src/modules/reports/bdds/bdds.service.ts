import prisma from '../../../config/db';
import { getMonthsBetween } from '@fin-u-ch/shared';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import plansService from '../../plans/plans.service';
import articlesService from '../../catalogs/articles/articles.service';
import logger from '../../../config/logger';

export interface BDDSParams {
  periodFrom: Date;
  periodTo: Date;
  budgetId?: string;
  parentArticleId?: string; // ID родительской статьи для суммирования по потомкам
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
    const startTime = Date.now();

    logger.debug('BDDS report generation started', {
      companyId,
      params: {
        periodFrom: params.periodFrom.toISOString(),
        periodTo: params.periodTo.toISOString(),
        budgetId: params.budgetId,
        parentArticleId: params.parentArticleId,
      },
    });

    // If no budgetId provided, return empty result
    if (!params.budgetId) {
      logger.debug('BDDS report skipped: no budgetId provided', {
        companyId,
      });
      return [];
    }

    const cacheKey = generateCacheKey(companyId, 'bdds', params);
    const cached = await getCachedReport(cacheKey);
    if (cached) {
      logger.debug('BDDS report retrieved from cache', {
        companyId,
        cacheKey,
      });
      return cached as BDDSActivity[];
    }

    // Если указан parentArticleId, получаем все ID потомков
    let articleIdsFilter: string[] | undefined;
    if (params.parentArticleId) {
      const descendantIds = await articlesService.getDescendantIds(
        params.parentArticleId,
        companyId
      );
      // Включаем саму родительскую статью и всех потомков
      articleIdsFilter = [params.parentArticleId, ...descendantIds];
    }

    const planItems = await prisma.planItem.findMany({
      where: {
        companyId,
        budgetId: params.budgetId,
        status: 'active',
        startDate: { lte: params.periodTo },
        OR: [{ endDate: null }, { endDate: { gte: params.periodFrom } }],
        // Если указан parentArticleId, фильтруем по статье и её потомкам
        ...(articleIdsFilter && {
          articleId: { in: articleIdsFilter },
        }),
      },
      include: {
        article: {
          select: { id: true, name: true, type: true, activity: true },
        },
      },
    });

    const months = getMonthsBetween(params.periodFrom, params.periodTo);
    const monthsIndex = new Map(months.map((m, idx) => [m, idx]));

    // Если указан parentArticleId, получаем данные родительской статьи один раз
    let parentArticle: {
      id: string;
      name: string;
      activity: string | null;
      type: string;
    } | null = null;
    if (params.parentArticleId) {
      parentArticle = await prisma.article.findFirst({
        where: { id: params.parentArticleId, companyId },
        select: { id: true, name: true, activity: true, type: true },
      });
      if (!parentArticle) {
        // Если родительская статья не найдена, возвращаем пустой результат
        return [];
      }
    }

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

    // Если указан parentArticleId, группируем все планы под одной записью родительской статьи
    const aggregationKey = params.parentArticleId || null;

    for (const planItem of planItems) {
      if (!planItem.article || !planItem.article.activity) continue;

      const activity = activitiesMap.get(planItem.article.activity);
      if (!activity) continue;

      const expanded = plansService.expandPlan(
        planItem,
        params.periodFrom,
        params.periodTo
      );

      // Если указан parentArticleId, используем его ID как ключ для агрегации
      // Иначе используем ID самой статьи
      const key = aggregationKey || planItem.article.id;

      if (!articleMap.has(key)) {
        // Если агрегируем по родительской статье, используем её данные
        if (aggregationKey && parentArticle) {
          const row = {
            articleId: parentArticle.id,
            articleName: parentArticle.name,
            type: parentArticle.type,
            months: months.map((m) => ({ month: m, amount: 0 })),
            total: 0,
          };
          articleMap.set(key, row);

          if (parentArticle.type === 'income') {
            activity.incomeGroups.push(row);
          } else {
            activity.expenseGroups.push(row);
          }
        } else {
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

    const duration = Date.now() - startTime;
    logger.info('BDDS report generated successfully', {
      companyId,
      duration: `${duration}ms`,
      budgetId: params.budgetId,
      planItemsCount: planItems.length,
      activitiesCount: activities.length,
    });

    return activities;
  }
}

export default new BDDSService();
