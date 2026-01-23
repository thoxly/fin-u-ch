import prisma from '../../../config/db';
import {
  getMonthKey,
  getMonthsBetween,
  CashflowBreakdown,
} from '@fin-u-ch/shared';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import articlesService from '../../catalogs/articles/articles.service';
import logger from '../../../config/logger';
import { withSpan } from '../../../utils/tracing';

export interface CashflowParams {
  periodFrom: Date;
  periodTo: Date;
  activity?: string;
  rounding?: number; // optional rounding unit (e.g., 1, 10, 100, 1000)
  parentArticleId?: string; // ID группы статьи для суммирования по потомкам
  breakdown?: CashflowBreakdown; // Разрез отчета: по видам деятельности, сделкам, счетам, подразделениям, контрагентам
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
  key?: string; // ID сделки/счета/подразделения/контрагента
  name?: string; // Название сделки/счета/подразделения/контрагента
  incomeGroups: ArticleGroup[];
  expenseGroups: ArticleGroup[];
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
}

interface CashflowReport {
  periodFrom: string;
  periodTo: string;
  breakdown?: CashflowBreakdown;
  activities: ActivityGroup[];
}

export class CashflowService {
  /**
   * Получает текущую дату (начало дня в UTC) для фильтрации будущих операций
   * Использует UTC, чтобы избежать проблем с часовыми поясами
   */
  private getTodayStart(): Date {
    const now = new Date();
    // Используем UTC для согласованности с данными в БД
    const today = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
    return today;
  }

  async getCashflow(
    companyId: string,
    params: CashflowParams
  ): Promise<CashflowReport> {
    return await withSpan('reports.cashflow.generate', async (span) => {
      span.setAttribute('company.id', companyId);
      span.setAttribute('report.period.from', params.periodFrom.toISOString());
      span.setAttribute('report.period.to', params.periodTo.toISOString());
      span.setAttribute('report.breakdown', params.breakdown || 'activity');

      const startTime = Date.now();
      const breakdown = params.breakdown || 'activity';
      const cacheKey = generateCacheKey(companyId, 'cashflow', params);

      logger.debug('Cashflow report generation started', {
        companyId,
        params: {
          periodFrom: params.periodFrom.toISOString(),
          periodTo: params.periodTo.toISOString(),
          activity: params.activity,
          rounding: params.rounding,
          parentArticleId: params.parentArticleId,
          breakdown,
        },
      });

      const cached = await getCachedReport(cacheKey);
      if (cached) {
        span.setAttribute('report.cached', true);
        logger.debug('Cashflow report retrieved from cache', {
          companyId,
          cacheKey,
        });
        return cached as CashflowReport;
      }
      span.setAttribute('report.cached', false);

      // Если указан parentArticleId, получаем все ID потомков
      let articleIdsFilter: string[] | undefined;
      if (params.parentArticleId) {
        const descendantIds = await articlesService.getDescendantIds(
          params.parentArticleId,
          companyId
        );
        // Включаем саму группу статьи и всех потомков
        articleIdsFilter = [params.parentArticleId, ...descendantIds];
      }

      // Получаем все операции за период
      logger.debug('Fetching operations for cashflow report', {
        companyId,
        periodFrom: params.periodFrom.toISOString(),
        periodTo: params.periodTo.toISOString(),
        articleIdsFilter: articleIdsFilter?.length || 0,
        breakdown,
      });

      // Получаем текущую дату для фильтрации будущих операций
      const todayStart = this.getTodayStart();
      // Используем минимальное значение между концом периода и сегодняшним днем
      const maxDate = new Date(
        Math.min(params.periodTo.getTime(), todayStart.getTime())
      );

      logger.info('Cashflow: filtering future operations', {
        companyId,
        periodFrom: params.periodFrom.toISOString(),
        periodTo: params.periodTo.toISOString(),
        todayStart: todayStart.toISOString(),
        maxDate: maxDate.toISOString(),
        breakdown,
      });

      // Оптимизация: загружаем справочники отдельно, чтобы избежать JOIN для каждой операции
      const [
        articlesForMap,
        dealsForMap,
        accountsForMap,
        departmentsForMap,
        counterpartiesForMap,
      ] = await Promise.all([
        prisma.article.findMany({
          where: {
            companyId,
            isActive: true,
            ...(params.activity ? { activity: params.activity } : {}),
            ...(articleIdsFilter ? { id: { in: articleIdsFilter } } : {}),
          },
          select: { id: true, name: true, activity: true, type: true },
        }),
        breakdown === 'deal'
          ? prisma.deal.findMany({
              where: { companyId },
              select: { id: true, name: true },
            })
          : Promise.resolve([]),
        breakdown === 'account'
          ? prisma.account.findMany({
              where: { companyId, isActive: true },
              select: { id: true, name: true },
            })
          : Promise.resolve([]),
        breakdown === 'department'
          ? prisma.department.findMany({
              where: { companyId },
              select: { id: true, name: true },
            })
          : Promise.resolve([]),
        breakdown === 'counterparty'
          ? prisma.counterparty.findMany({
              where: { companyId },
              select: { id: true, name: true },
            })
          : Promise.resolve([]),
      ]);

      // Создаем Map для быстрого доступа к справочникам
      const articlesMap = new Map(
        articlesForMap.map((a: { id: string; name: string; activity: string; type: string }) => [
          a.id,
          { id: a.id, name: a.name, activity: a.activity, type: a.type },
        ])
      );
      const dealsMap = new Map(
        dealsForMap.map((d: { id: string; name: string }) => [d.id, { id: d.id, name: d.name }])
      );
      const accountsMap = new Map(
        accountsForMap.map((a: { id: string; name: string }) => [a.id, { id: a.id, name: a.name }])
      );
      const departmentsMap = new Map(
        departmentsForMap.map((d: { id: string; name: string }) => [d.id, { id: d.id, name: d.name }])
      );
      const counterpartiesMap = new Map(
        counterpartiesForMap.map((c: { id: string; name: string }) => [c.id, { id: c.id, name: c.name }])
      );

      // Формируем фильтр для операций в зависимости от разреза
      const whereClause: any = {
        companyId,
        operationDate: {
          gte: params.periodFrom,
          lte: maxDate, // Исключаем операции в будущем
        },
        type: { in: ['income', 'expense'] },
        isConfirmed: true,
        isTemplate: false,
        // Если указан parentArticleId, фильтруем по статье и её потомкам
        ...(articleIdsFilter && {
          articleId: { in: articleIdsFilter },
        }),
      };

      // Фильтруем операции по наличию нужного атрибута для разрезов
      if (breakdown === 'deal') {
        whereClause.dealId = { not: null };
      } else if (breakdown === 'account') {
        whereClause.accountId = { not: null };
      } else if (breakdown === 'department') {
        whereClause.departmentId = { not: null };
      } else if (breakdown === 'counterparty') {
        whereClause.counterpartyId = { not: null };
      }

      // Загружаем операции БЕЗ JOINов - справочники маппим в памяти
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const operations = (await prisma.operation.findMany({
        where: whereClause,
        select: {
          id: true,
          type: true,
          operationDate: true,
          amount: true,
          currency: true,
          originalAmount: true,
          originalCurrency: true,
          articleId: true,
          dealId: true,
          accountId: true,
          departmentId: true,
          counterpartyId: true,
          // Убрали JOINы - загружаем только ID, справочники маппим в памяти
        },
      })) as any[];

      // Маппим справочники к операциям
      const operationsWithRelations = operations.map((op) => ({
        ...op,
        article: op.articleId ? articlesMap.get(op.articleId) || null : null,
        deal: op.dealId ? dealsMap.get(op.dealId) || null : null,
        account: op.accountId ? accountsMap.get(op.accountId) || null : null,
        department: op.departmentId
          ? departmentsMap.get(op.departmentId) || null
          : null,
        counterparty: op.counterpartyId
          ? counterpartiesMap.get(op.counterpartyId) || null
          : null,
      }));

      // Загружаем счета для конвертации валют (всегда нужен currency)
      // accountsForMap используется только для маппинга в breakdown === 'account'
      // Для конвертации валют всегда загружаем отдельно с полем currency
      const accountsForCurrency = await prisma.account.findMany({
        where: { companyId, isActive: true },
        select: { id: true, currency: true },
      });

      // Создаем Map счетов для быстрого доступа (для конвертации валют)
      const accountsMapForCurrency = new Map<string, { currency: string }>(
        accountsForCurrency.map((acc: { id: string; currency: string }) => [acc.id, { currency: acc.currency }])
      );

      // Пересчитываем суммы операций в базовую валюту
      // Если операция уже имеет originalAmount и originalCurrency, значит она уже конвертирована
      // и мы используем amount и currency напрямую (они уже в базовой валюте)
      const { convertOperationAmountToBase, getOperationCurrency } =
        await import('../../../utils/currency-converter');

      const operationsWithConvertedAmounts = await Promise.all(
        operationsWithRelations.map(async (op: any) => {
          // Если операция уже конвертирована (есть originalAmount), используем значения из БД
          if (op.originalAmount != null && op.originalCurrency) {
            return {
              ...op,
              amount: op.amount, // Уже в базовой валюте
              currency: op.currency, // Уже базовая валюта
            };
          }

          // Старая операция без конвертации - пересчитываем
          const operationCurrency = getOperationCurrency(
            {
              type: op.type,
              accountId: op.accountId,
              sourceAccountId: op.sourceAccountId,
              targetAccountId: op.targetAccountId,
              currency: op.currency,
            },
            accountsMapForCurrency
          );

          const convertedAmount = await convertOperationAmountToBase(
            op.amount,
            operationCurrency,
            companyId,
            op.operationDate
          );

          return {
            ...op,
            amount: convertedAmount,
            originalAmount: op.amount,
            originalCurrency: operationCurrency,
          };
        })
      );

      logger.info('Operations fetched and converted for cashflow report', {
        companyId,
        operationsCount: operationsWithConvertedAmounts.length,
        periodFrom: params.periodFrom.toISOString(),
        periodTo: params.periodTo.toISOString(),
        maxDate: maxDate.toISOString(),
        todayStart: todayStart.toISOString(),
        sampleOperations: operationsWithConvertedAmounts
          .slice(0, 3)
          .map((op: any) => ({
            id: op.id,
            date: op.operationDate.toISOString(),
            type: op.type,
            amount: op.amount,
          })),
      });

      const months = getMonthsBetween(params.periodFrom, params.periodTo);

      // Фильтруем операции по активности, если указана
      const filteredOperations = params.activity
        ? operationsWithConvertedAmounts.filter(
            (op: any) => op.article?.activity === params.activity
          )
        : operationsWithConvertedAmounts;

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
        if (
          articleGroup.parentId &&
          articleGroupMap.has(articleGroup.parentId)
        ) {
          const parent = articleGroupMap.get(articleGroup.parentId)!;
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(articleGroup);
        } else {
          rootArticles.push(articleGroup);
        }
      }

      // Агрегируем суммы от дочерних статей к группам (снизу вверх)
      const aggregateFromChildren = (article: ArticleGroup): void => {
        if (article.children && article.children.length > 0) {
          // Сначала обрабатываем всех детей
          for (const child of article.children) {
            aggregateFromChildren(child);
          }

          // Начинаем с текущих сумм группы статьи (уже содержат операции по этой статье)
          const aggregatedMonths = new Map<string, number>();
          // Инициализируем карту текущими суммами группы статьи
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

          // Обновляем суммы группы статьи (группа + все дети)
          article.months = months.map((m) => ({
            month: m,
            amount: applyRounding(aggregatedMonths.get(m) || 0),
          }));
          article.total = applyRounding(aggregatedTotal);
        }
      };

      // Агрегируем для всех статей без группы
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

      // Группируем по выбранному разрезу
      const byBreakdown: Map<string, ActivityGroup> = new Map();

      if (breakdown === 'activity') {
        // Текущая логика группировки по активностям
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
            // Если нет операций, значит это группа/дочерняя статья, и мы её включаем
            // Если есть операции, но активность не совпадает, пропускаем
            if (rootArticle.hasOperations) {
              continue;
            }
          }

          if (!byBreakdown.has(activity)) {
            byBreakdown.set(activity, {
              activity,
              incomeGroups: [],
              expenseGroups: [],
              totalIncome: 0,
              totalExpense: 0,
              netCashflow: 0,
            });
          }

          const group = byBreakdown.get(activity)!;

          if (rootArticle.type === 'income') {
            group.incomeGroups.push(rootArticle);
            group.totalIncome += rootArticle.total;
          } else if (rootArticle.type === 'expense') {
            group.expenseGroups.push(rootArticle);
            group.totalExpense += rootArticle.total;
          }
        }
      } else {
        // Группировка по другим разрезам (deal, account, department, counterparty)
        // Сначала группируем операции по выбранному разрезу
        const operationsByBreakdown = new Map<
          string,
          { id: string; name: string; operations: typeof filteredOperations }
        >();

        for (const op of filteredOperations) {
          if (!op.article) continue;

          let breakdownKey: string | null = null;
          let breakdownName: string | null = null;

          if (breakdown === 'deal' && op.dealId && op.deal) {
            breakdownKey = op.dealId;
            breakdownName = op.deal.name;
          } else if (breakdown === 'account' && op.accountId && op.account) {
            breakdownKey = op.accountId;
            breakdownName = op.account.name;
          } else if (
            breakdown === 'department' &&
            op.departmentId &&
            op.department
          ) {
            breakdownKey = op.departmentId;
            breakdownName = op.department.name;
          } else if (
            breakdown === 'counterparty' &&
            op.counterpartyId &&
            op.counterparty
          ) {
            breakdownKey = op.counterpartyId;
            breakdownName = op.counterparty.name;
          }

          if (!breakdownKey || !breakdownName) continue;

          if (!operationsByBreakdown.has(breakdownKey)) {
            operationsByBreakdown.set(breakdownKey, {
              id: breakdownKey,
              name: breakdownName,
              operations: [],
            });
          }

          operationsByBreakdown.get(breakdownKey)!.operations.push(op);
        }

        // Для каждого значения разреза создаем группу и агрегируем статьи
        for (const [breakdownKey, breakdownData] of operationsByBreakdown) {
          // Агрегируем операции по статьям для этого разреза
          const breakdownOperationsByArticle = new Map<string, CashflowRow>();

          for (const op of breakdownData.operations) {
            if (!op.article) continue;

            const articleId = op.article.id;
            const articleData = articleDataMap.get(articleId);
            if (!articleData) continue;

            if (!breakdownOperationsByArticle.has(articleId)) {
              breakdownOperationsByArticle.set(articleId, {
                articleId: articleData.id,
                articleName: articleData.name,
                activity: articleData.activity || 'unknown',
                type: articleData.type,
                months: Object.fromEntries(months.map((m) => [m, 0])),
                total: 0,
              });
            }

            const row = breakdownOperationsByArticle.get(articleId)!;
            const month = getMonthKey(new Date(op.operationDate));
            if (row.months[month] !== undefined) {
              row.months[month] += op.amount;
              row.total += op.amount;
            }
          }

          // Создаем ArticleGroup для этого разреза, используя уже полученные allArticles
          const breakdownArticleGroupMap = new Map<string, ArticleGroup>();

          for (const articleData of allArticles) {
            const operationsData = breakdownOperationsByArticle.get(
              articleData.id
            );
            const hasOps = operationsData !== undefined;

            const monthsData: MonthlyData[] = months.map((m) => ({
              month: m,
              amount: applyRounding(operationsData?.months[m] || 0),
            }));

            breakdownArticleGroupMap.set(articleData.id, {
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

          // Строим иерархию
          const breakdownRootArticles: ArticleGroup[] = [];

          for (const articleGroup of breakdownArticleGroupMap.values()) {
            if (
              articleGroup.parentId &&
              breakdownArticleGroupMap.has(articleGroup.parentId)
            ) {
              const parent = breakdownArticleGroupMap.get(
                articleGroup.parentId
              )!;
              if (!parent.children) {
                parent.children = [];
              }
              parent.children.push(articleGroup);
            } else {
              breakdownRootArticles.push(articleGroup);
            }
          }

          // Агрегируем от детей к родителям
          for (const rootArticle of breakdownRootArticles) {
            aggregateFromChildren(rootArticle);
          }

          // Сортируем статьи
          const sortedBreakdownArticles = sortArticles(breakdownRootArticles);

          // Разделяем на доходы и расходы
          const incomeGroups: ArticleGroup[] = [];
          const expenseGroups: ArticleGroup[] = [];
          let totalIncome = 0;
          let totalExpense = 0;

          for (const article of sortedBreakdownArticles) {
            if (article.type === 'income') {
              incomeGroups.push(article);
              totalIncome += article.total;
            } else if (article.type === 'expense') {
              expenseGroups.push(article);
              totalExpense += article.total;
            }
          }

          byBreakdown.set(breakdownKey, {
            activity: 'unknown', // Для не-activity разрезов используем 'unknown'
            key: breakdownData.id,
            name: breakdownData.name,
            incomeGroups,
            expenseGroups,
            totalIncome: applyRounding(totalIncome),
            totalExpense: applyRounding(totalExpense),
            netCashflow: applyRounding(totalIncome - totalExpense),
          });
        }
      }

      // Finalize net values and optional rounding for totals
      const activities = Array.from(byBreakdown.values()).map((g) => ({
        ...g,
        totalIncome: applyRounding(g.totalIncome),
        totalExpense: applyRounding(g.totalExpense),
        netCashflow: applyRounding(g.totalIncome - g.totalExpense),
      }));

      // Сортируем группы по имени для не-activity разрезов
      if (breakdown !== 'activity') {
        activities.sort((a, b) => {
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB);
        });
      }

      const response: CashflowReport = {
        periodFrom: params.periodFrom.toISOString().slice(0, 10),
        periodTo: params.periodTo.toISOString().slice(0, 10),
        breakdown,
        activities,
      };

      await withSpan('reports.cache', async (cacheSpan) => {
        // Определяем, является ли период историческим (прошлые периоды кэшируем дольше)
        const todayStart = this.getTodayStart();
        const maxDate = new Date(
          Math.min(params.periodTo.getTime(), todayStart.getTime())
        );
        const isHistorical = maxDate < todayStart;
        await cacheReport(cacheKey, response, 300, isHistorical);
        cacheSpan.setAttribute('cache.key', cacheKey);
      });

      const duration = Date.now() - startTime;
      span.setAttribute('report.duration.ms', duration);
      span.setAttribute('report.activities.count', response.activities.length);
      span.setAttribute('report.operations.count', operations.length);

      logger.info('Cashflow report generated successfully', {
        companyId,
        duration: `${duration}ms`,
        activitiesCount: response.activities.length,
        operationsCount: operations.length,
      });

      return response;
    });
  }
}

export default new CashflowService();
