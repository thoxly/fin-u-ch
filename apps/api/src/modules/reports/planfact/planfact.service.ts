import prisma from '../../../config/db';
import { getMonthKey } from '@fin-u-ch/shared';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import plansService from '../../plans/plans.service';
import articlesService from '../../catalogs/articles/articles.service';
import logger from '../../../config/logger';

export interface PlanFactParams {
  periodFrom: Date;
  periodTo: Date;
  level: 'article' | 'department' | 'deal';
  parentArticleId?: string; // ID родительской статьи для суммирования по потомкам (только для level === 'article')
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
  async getPlanFact(
    companyId: string,
    params: PlanFactParams
  ): Promise<PlanFactRow[]> {
    const startTime = Date.now();
    const cacheKey = generateCacheKey(companyId, 'planfact', params);

    logger.debug('PlanFact report generation started', {
      companyId,
      params: {
        periodFrom: params.periodFrom.toISOString(),
        periodTo: params.periodTo.toISOString(),
        level: params.level,
        parentArticleId: params.parentArticleId,
      },
    });

    const cached = await getCachedReport(cacheKey);
    if (cached) {
      logger.debug('PlanFact report retrieved from cache', {
        companyId,
        cacheKey,
      });
      return cached as PlanFactRow[];
    }

    const resultMap = new Map<string, PlanFactRow>();

    // Если указан parentArticleId и level === 'article', получаем все ID потомков
    let articleIdsFilter: string[] | undefined;
    if (params.parentArticleId && params.level === 'article') {
      const descendantIds = await articlesService.getDescendantIds(
        params.parentArticleId,
        companyId
      );
      // Включаем саму родительскую статью и всех потомков
      articleIdsFilter = [params.parentArticleId, ...descendantIds];
    }

    // Get plan data
    const planItems = await prisma.planItem.findMany({
      where: {
        companyId,
        status: 'active',
        startDate: { lte: params.periodTo },
        OR: [{ endDate: null }, { endDate: { gte: params.periodFrom } }],
        // Если указан parentArticleId и level === 'article', фильтруем по статье и её потомкам
        ...(articleIdsFilter && {
          articleId: { in: articleIdsFilter },
        }),
      },
      include: {
        article: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
    });

    // Если указан parentArticleId и level === 'article', группируем все планы под одной записью родительской статьи
    const aggregationKey =
      params.parentArticleId && params.level === 'article'
        ? params.parentArticleId
        : null;

    // Если указан parentArticleId и level === 'article', получаем данные родительской статьи
    let parentArticle: { id: string; name: string } | null = null;
    if (params.parentArticleId && params.level === 'article') {
      parentArticle = await prisma.article.findFirst({
        where: { id: params.parentArticleId, companyId },
        select: { id: true, name: true },
      });
    }

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
          // Если агрегируем по родительской статье, используем её ID и имя
          if (aggregationKey && parentArticle) {
            key = parentArticle.id;
            name = parentArticle.name;
          } else {
            key = planItem.article.id;
            name = planItem.article.name;
          }
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

    // Get fact data (только реальные операции, не шаблоны)
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
        // Если указан parentArticleId и level === 'article', фильтруем по статье и её потомкам
        ...(articleIdsFilter && {
          articleId: { in: articleIdsFilter },
        }),
      },
      include: {
        article: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    for (const op of operations) {
      const month = getMonthKey(new Date(op.operationDate));
      let key = '';
      let name = '';

      if (params.level === 'article' && op.article) {
        // Если агрегируем по родительской статье, используем её ID и имя
        if (aggregationKey && parentArticle) {
          key = parentArticle.id;
          name = parentArticle.name;
        } else {
          key = op.article.id;
          name = op.article.name;
        }
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

    await cacheReport(cacheKey, result);

    const duration = Date.now() - startTime;
    logger.info('PlanFact report generated successfully', {
      companyId,
      duration: `${duration}ms`,
      level: params.level,
      planItemsCount: planItems.length,
      operationsCount: operations.length,
      resultRowsCount: result.length,
    });

    return result;
  }
}

export default new PlanFactService();
