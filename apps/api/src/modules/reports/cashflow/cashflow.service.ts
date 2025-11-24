import prisma from '../../../config/db';
import { getMonthKey, getMonthsBetween } from '@fin-u-ch/shared';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import articlesService from '../../catalogs/articles/articles.service';

export interface CashflowParams {
  periodFrom: Date;
  periodTo: Date;
  activity?: string;
  rounding?: number; // optional rounding unit (e.g., 1, 10, 100, 1000)
  parentArticleId?: string; // ID родительской статьи для суммирования по потомкам
}

// Internal aggregation row
interface CashflowRow {
  articleId: string;
  articleName: string;
  activity: string;
  type: string;
  months: Record<string, number>;
  total: number;
}

// API response shape
interface MonthlyData {
  month: string;
  amount: number;
}

interface ArticleGroup {
  articleId: string;
  articleName: string;
  type: 'income' | 'expense';
  months: MonthlyData[];
  total: number;
}

interface ActivityGroup {
  activity: 'operating' | 'investing' | 'financing' | 'unknown';
  incomeGroups: ArticleGroup[];
  expenseGroups: ArticleGroup[];
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
}

interface CashflowReport {
  periodFrom: string;
  periodTo: string;
  activities: ActivityGroup[];
}

export class CashflowService {
  async getCashflow(
    companyId: string,
    params: CashflowParams
  ): Promise<CashflowReport> {
    const cacheKey = generateCacheKey(companyId, 'cashflow', params);
    const cached = await getCachedReport(cacheKey);
    if (cached) return cached as CashflowReport;

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

    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: params.periodFrom,
          lte: params.periodTo,
        },
        type: { in: ['income', 'expense'] },
        isConfirmed: true,
        isTemplate: false,
        // Если указан parentArticleId, фильтруем по статье и её потомкам
        ...(articleIdsFilter && {
          articleId: { in: articleIdsFilter },
        }),
      },
      include: {
        article: {
          select: { id: true, name: true, activity: true, type: true },
        },
      },
    });

    const months = getMonthsBetween(params.periodFrom, params.periodTo);
    const articleMap = new Map<string, CashflowRow>();

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
        const response: CashflowReport = {
          periodFrom: params.periodFrom.toISOString().slice(0, 10),
          periodTo: params.periodTo.toISOString().slice(0, 10),
          activities: [],
        };
        return response;
      }
    }

    // Если указан parentArticleId, группируем все операции под одной записью родительской статьи
    const aggregationKey = params.parentArticleId || null;

    for (const op of operations) {
      if (!op.article) continue;
      if (params.activity && op.article.activity !== params.activity) continue;

      // Если указан parentArticleId, используем его ID как ключ для агрегации
      // Иначе используем ID самой статьи
      const key = aggregationKey || op.article.id;

      if (!articleMap.has(key)) {
        // Если агрегируем по родительской статье, используем её данные
        if (aggregationKey && parentArticle) {
          articleMap.set(key, {
            articleId: parentArticle.id,
            articleName: parentArticle.name,
            activity: parentArticle.activity || 'unknown',
            type: parentArticle.type,
            months: Object.fromEntries(months.map((m) => [m, 0])),
            total: 0,
          });
        } else {
          articleMap.set(key, {
            articleId: op.article.id,
            articleName: op.article.name,
            activity: op.article.activity || 'unknown',
            type: op.article.type,
            months: Object.fromEntries(months.map((m) => [m, 0])),
            total: 0,
          });
        }
      }

      const row = articleMap.get(key)!;
      const month = getMonthKey(new Date(op.operationDate));
      if (row.months[month] !== undefined) {
        row.months[month] += op.amount;
        row.total += op.amount;
      }
    }

    // Helper for rounding if provided
    const applyRounding = (value: number): number => {
      const unit = params.rounding || 0;
      if (!unit || unit <= 1) return Math.round(value * 100) / 100; // round to 2 decimals
      return Math.round(value / unit) * unit;
    };

    // Transform to activities with income/expense groups
    const byActivity: Map<string, ActivityGroup> = new Map();

    const sortedRows = Array.from(articleMap.values()).sort(
      (a, b) =>
        a.activity.localeCompare(b.activity) ||
        a.type.localeCompare(b.type) ||
        a.articleName.localeCompare(b.articleName)
    );

    for (const row of sortedRows) {
      const activity = (row.activity || 'unknown') as ActivityGroup['activity'];
      if (!byActivity.has(activity)) {
        byActivity.set(activity, {
          activity,
          incomeGroups: [],
          expenseGroups: [],
          totalIncome: 0,
          totalExpense: 0,
          netCashflow: 0,
        });
      }

      const group = byActivity.get(activity)!;
      const monthsArray: MonthlyData[] = months.map((m) => ({
        month: m,
        amount: applyRounding(row.months[m] || 0),
      }));

      const articleGroup: ArticleGroup = {
        articleId: row.articleId,
        articleName: row.articleName,
        type: row.type as 'income' | 'expense',
        months: monthsArray,
        total: applyRounding(row.total),
      };

      if (row.type === 'income') {
        group.incomeGroups.push(articleGroup);
        group.totalIncome += articleGroup.total;
      } else if (row.type === 'expense') {
        group.expenseGroups.push(articleGroup);
        group.totalExpense += articleGroup.total;
      }
    }

    // Finalize net values and optional rounding for totals
    const activities = Array.from(byActivity.values()).map((g) => ({
      ...g,
      totalIncome: applyRounding(g.totalIncome),
      totalExpense: applyRounding(g.totalExpense),
      netCashflow: applyRounding(g.totalIncome - g.totalExpense),
    }));

    const response: CashflowReport = {
      periodFrom: params.periodFrom.toISOString().slice(0, 10),
      periodTo: params.periodTo.toISOString().slice(0, 10),
      activities,
    };

    await cacheReport(cacheKey, response);
    return response;
  }
}

export default new CashflowService();
