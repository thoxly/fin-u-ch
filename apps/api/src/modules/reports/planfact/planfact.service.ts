import prisma from '../../../config/db';
import { getMonthKey } from '@fin-u-ch/shared';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import plansService from '../../plans/plans.service';
import logger from '../../../config/logger';

export interface PlanFactParams {
  periodFrom: Date;
  periodTo: Date;
  level: 'article' | 'department' | 'deal';
}

export interface PlanFactRow {
  month: string;
  key: string;
  name: string;
  plan: number;
  fact: number;
  delta: number;
}

export class PlanFactService {
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

  async getPlanFact(
    companyId: string,
    params: PlanFactParams
  ): Promise<PlanFactRow[]> {
    const cacheKey = generateCacheKey(companyId, 'planfact', params);
    const cached = await getCachedReport(cacheKey);
    if (cached) return cached as PlanFactRow[];

    const resultMap = new Map<string, PlanFactRow>();

    // Get plan data
    const planItems = await prisma.planItem.findMany({
      where: {
        companyId,
        status: 'active',
        startDate: { lte: params.periodTo },
        OR: [{ endDate: null }, { endDate: { gte: params.periodFrom } }],
      },
      include: {
        article: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
    });

    for (const planItem of planItems) {
      const expanded = plansService.expandPlan(
        planItem,
        params.periodFrom,
        params.periodTo
      );

      for (const { month, amount } of expanded) {
        let key = '';
        let name = '';

        if (params.level === 'article' && planItem.article) {
          key = planItem.article.id;
          name = planItem.article.name;
        } else if (
          params.level === 'deal' &&
          planItem.dealId &&
          planItem.deal
        ) {
          key = planItem.dealId;
          name = planItem.deal.name;
        } else {
          continue;
        }

        const rowKey = `${month}:${key}`;
        if (!resultMap.has(rowKey)) {
          resultMap.set(rowKey, {
            month,
            key,
            name,
            plan: 0,
            fact: 0,
            delta: 0,
          });
        }
        resultMap.get(rowKey)!.plan += amount;
      }
    }

    // Получаем текущую дату для фильтрации будущих операций
    const todayStart = this.getTodayStart();
    // Используем минимальное значение между концом периода и сегодняшним днем
    const maxDate = new Date(
      Math.min(params.periodTo.getTime(), todayStart.getTime())
    );

    logger.info('PlanFact: filtering future operations', {
      companyId,
      periodFrom: params.periodFrom.toISOString(),
      periodTo: params.periodTo.toISOString(),
      todayStart: todayStart.toISOString(),
      maxDate: maxDate.toISOString(),
      level: params.level,
    });

    // Оптимизация: загружаем справочники отдельно, чтобы избежать JOIN для каждой операции
    const [articlesForMap, dealsForMap, departmentsForMap] = await Promise.all([
      prisma.article.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
      }),
      prisma.deal.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
      }),
      prisma.department.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
      }),
    ]);

    // Создаем Map для быстрого доступа к справочникам
    const articlesMap = new Map(
      articlesForMap.map((a) => [a.id, { id: a.id, name: a.name }])
    );
    const dealsMap = new Map(
      dealsForMap.map((d) => [d.id, { id: d.id, name: d.name }])
    );
    const departmentsMap = new Map(
      departmentsForMap.map((d) => [d.id, { id: d.id, name: d.name }])
    );

    // Get fact data (только реальные операции, не шаблоны, не будущие)
    // БЕЗ JOINов - справочники маппим в памяти
    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: params.periodFrom,
          lte: maxDate, // Исключаем операции в будущем
        },
        type: { in: ['income', 'expense'] },
        isConfirmed: true,
        isTemplate: false,
      },
      select: {
        id: true,
        type: true,
        operationDate: true,
        amount: true,
        articleId: true,
        dealId: true,
        departmentId: true,
        // Убрали JOINы - загружаем только ID, справочники маппим в памяти
      },
    });

    // Маппим справочники к операциям
    const operationsWithReferences = operations.map((op) => ({
      ...op,
      article: op.articleId ? articlesMap.get(op.articleId) || null : null,
      deal: op.dealId ? dealsMap.get(op.dealId) || null : null,
      department: op.departmentId
        ? departmentsMap.get(op.departmentId) || null
        : null,
    }));

    // Защита от переполнения памяти при больших объемах данных
    const MAX_OPERATIONS_WARNING = 10000;
    if (operationsWithReferences.length > MAX_OPERATIONS_WARNING) {
      logger.warn(
        `PlanFact: Large number of operations (${operationsWithReferences.length}), consider using aggregation or smaller period`
      );
    }

    logger.info('PlanFact: operations fetched', {
      companyId,
      operationsCount: operationsWithReferences.length,
      periodFrom: params.periodFrom.toISOString(),
      maxDate: maxDate.toISOString(),
      todayStart: todayStart.toISOString(),
      sampleOperations: operationsWithReferences.slice(0, 3).map((op) => ({
        id: op.id,
        date: op.operationDate.toISOString(),
        type: op.type,
        amount: op.amount,
      })),
    });

    for (const op of operationsWithReferences) {
      const month = getMonthKey(new Date(op.operationDate));
      let key = '';
      let name = '';

      if (params.level === 'article' && op.article) {
        key = op.article.id;
        name = op.article.name;
      } else if (params.level === 'deal' && op.dealId && op.deal) {
        key = op.dealId;
        name = op.deal.name;
      } else if (
        params.level === 'department' &&
        op.departmentId &&
        op.department
      ) {
        key = op.departmentId;
        name = op.department.name;
      } else {
        continue;
      }

      const rowKey = `${month}:${key}`;
      if (!resultMap.has(rowKey)) {
        resultMap.set(rowKey, { month, key, name, plan: 0, fact: 0, delta: 0 });
      }
      resultMap.get(rowKey)!.fact += op.amount;
    }

    // Calculate deltas
    const result = Array.from(resultMap.values()).map((row) => ({
      ...row,
      delta: row.fact - row.plan,
    }));

    result.sort(
      (a, b) => a.month.localeCompare(b.month) || a.name.localeCompare(b.name)
    );

    // Определяем, является ли период историческим (прошлые периоды кэшируем дольше)
    const isHistorical = maxDate < todayStart;
    await cacheReport(cacheKey, result, 300, isHistorical);
    return result;
  }
}

export default new PlanFactService();
