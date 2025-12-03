import prisma from '../../../config/db';
import { getMonthKey, getMonthsBetween } from '@fin-u-ch/shared';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import articlesService from '../../catalogs/articles/articles.service';
import logger from '../../../config/logger';

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
  parentId?: string | null;
  hasOperations?: boolean;
  children?: ArticleGroup[];
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
    const startTime = Date.now();
    const cacheKey = generateCacheKey(companyId, 'cashflow', params);

    logger.debug('Cashflow report generation started', {
      companyId,
      params: {
        periodFrom: params.periodFrom.toISOString(),
        periodTo: params.periodTo.toISOString(),
        activity: params.activity,
        rounding: params.rounding,
        parentArticleId: params.parentArticleId,
      },
    });

    const cached = await getCachedReport(cacheKey);
    if (cached) {
      logger.debug('Cashflow report retrieved from cache', {
        companyId,
        cacheKey,
      });
      return cached as CashflowReport;
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

    // Получаем все операции за период
    logger.debug('Fetching operations for cashflow report', {
      companyId,
      periodFrom: params.periodFrom.toISOString(),
      periodTo: params.periodTo.toISOString(),
      articleIdsFilter: articleIdsFilter?.length || 0,
    });

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

    logger.debug('Operations fetched for cashflow report', {
      companyId,
      operationsCount: operations.length,
    });

    const months = getMonthsBetween(params.periodFrom, params.periodTo);

    // Фильтруем операции по активности, если указана
    const filteredOperations = params.activity
      ? operations.filter(
          (op: (typeof operations)[0]) =>
            op.article?.activity === params.activity
        )
      : operations;

    // Находим все уникальные статьи, по которым есть операции (уже отфильтрованные)
    const articlesWithOperations = new Set<string>();
    for (const op of filteredOperations) {
      if (op.article) {
        articlesWithOperations.add(op.article.id);
      }
    }

    // Для каждой статьи с операциями получаем всех родителей и всех потомков
    const allArticleIds = new Set<string>();
    for (const articleId of articlesWithOperations) {
      allArticleIds.add(articleId);

      // Получаем всех родителей
      const ancestorIds = await articlesService.getAncestorIds(
        articleId,
        companyId
      );
      ancestorIds.forEach((id) => allArticleIds.add(id));

      // Получаем всех потомков
      const descendantIds = await articlesService.getDescendantIds(
        articleId,
        companyId
      );
      descendantIds.forEach((id) => allArticleIds.add(id));
    }

    // Получаем данные всех статей из иерархии
    const allArticles = await prisma.article.findMany({
      where: {
        id: { in: Array.from(allArticleIds) },
        companyId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        activity: true,
        type: true,
      },
    });

    // Создаем Map для быстрого доступа к статьям
    type ArticleData = {
      id: string;
      name: string;
      parentId: string | null;
      activity: string | null;
      type: string;
    };
    const articleDataMap = new Map<string, ArticleData>(
      allArticles.map((a: ArticleData) => [a.id, a])
    );

    // Агрегируем операции по статьям (используем уже отфильтрованные операции)
    const operationsByArticle = new Map<string, CashflowRow>();

    for (const op of filteredOperations) {
      if (!op.article) continue;

      const articleId = op.article.id;

      if (!operationsByArticle.has(articleId)) {
        const articleData = articleDataMap.get(articleId);
        if (!articleData) continue;

        operationsByArticle.set(articleId, {
          articleId: articleData.id,
          articleName: articleData.name,
          activity: articleData.activity || 'unknown',
          type: articleData.type,
          months: Object.fromEntries(months.map((m) => [m, 0])),
          total: 0,
        });
      }

      const row = operationsByArticle.get(articleId)!;
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

    // Создаем иерархическую структуру статей
    // Сначала создаем плоский список всех ArticleGroup
    const articleGroupMap = new Map<string, ArticleGroup>();

    for (const articleData of allArticles) {
      const operationsData = operationsByArticle.get(articleData.id);
      const hasOps = operationsData !== undefined;

      const monthsData: MonthlyData[] = months.map((m) => ({
        month: m,
        amount: applyRounding(operationsData?.months[m] || 0),
      }));

      articleGroupMap.set(articleData.id, {
        articleId: articleData.id,
        articleName: articleData.name,
        type: articleData.type as 'income' | 'expense',
        months: monthsData,
        total: applyRounding(operationsData?.total || 0),
        parentId: articleData.parentId,
        hasOperations: hasOps,
        children: [],
      });
    }

    // Строим иерархию: добавляем дочерние статьи к родителям
    const rootArticles: ArticleGroup[] = [];

    for (const articleGroup of articleGroupMap.values()) {
      if (articleGroup.parentId && articleGroupMap.has(articleGroup.parentId)) {
        const parent = articleGroupMap.get(articleGroup.parentId)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(articleGroup);
      } else {
        rootArticles.push(articleGroup);
      }
    }

    // Агрегируем суммы от дочерних статей к родительским (снизу вверх)
    const aggregateFromChildren = (article: ArticleGroup): void => {
      if (article.children && article.children.length > 0) {
        // Сначала обрабатываем всех детей
        for (const child of article.children) {
          aggregateFromChildren(child);
        }

        // Начинаем с текущих сумм родительской статьи (уже содержат операции по этой статье)
        const aggregatedMonths = new Map<string, number>();
        // Инициализируем карту текущими суммами родительской статьи
        for (const monthData of article.months) {
          aggregatedMonths.set(monthData.month, monthData.amount);
        }
        let aggregatedTotal = article.total;

        // Добавляем суммы всех дочерних статей к суммам родителя
        for (const child of article.children) {
          for (const monthData of child.months) {
            const current = aggregatedMonths.get(monthData.month) || 0;
            aggregatedMonths.set(monthData.month, current + monthData.amount);
          }
          aggregatedTotal += child.total;
        }

        // Обновляем суммы родительской статьи (родитель + все дети)
        article.months = months.map((m) => ({
          month: m,
          amount: applyRounding(aggregatedMonths.get(m) || 0),
        }));
        article.total = applyRounding(aggregatedTotal);
      }
    };

    // Агрегируем для всех корневых статей
    for (const rootArticle of rootArticles) {
      aggregateFromChildren(rootArticle);
    }

    // Сортируем статьи по имени
    const sortArticles = (articles: ArticleGroup[]): ArticleGroup[] => {
      return articles
        .sort((a, b) => a.articleName.localeCompare(b.articleName))
        .map((article) => ({
          ...article,
          children: article.children
            ? sortArticles(article.children)
            : undefined,
        }));
    };

    const sortedRootArticles = sortArticles(rootArticles);

    // Группируем по активностям
    // В incomeGroups/expenseGroups попадают только корневые статьи (без родителей)
    const byActivity: Map<string, ActivityGroup> = new Map();

    for (const rootArticle of sortedRootArticles) {
      const articleData = articleDataMap.get(rootArticle.articleId);
      if (!articleData) continue;

      const activity = (articleData.activity ||
        'unknown') as ActivityGroup['activity'];

      // Если указан фильтр по активности, пропускаем статьи с другой активностью
      // Но включаем их, если они являются родителями или потомками статей с нужной активностью
      // (это уже учтено при фильтрации операций выше)
      if (params.activity && articleData.activity !== params.activity) {
        // Проверяем, есть ли у этой статьи операции (hasOperations)
        // Если нет операций, значит это родительская/дочерняя статья, и мы её включаем
        // Если есть операции, но активность не совпадает, пропускаем
        if (rootArticle.hasOperations) {
          continue;
        }
      }

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

      if (rootArticle.type === 'income') {
        group.incomeGroups.push(rootArticle);
        group.totalIncome += rootArticle.total;
      } else if (rootArticle.type === 'expense') {
        group.expenseGroups.push(rootArticle);
        group.totalExpense += rootArticle.total;
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

    const duration = Date.now() - startTime;
    logger.info('Cashflow report generated successfully', {
      companyId,
      duration: `${duration}ms`,
      activitiesCount: response.activities.length,
      operationsCount: operations.length,
    });

    return response;
  }
}

export default new CashflowService();
