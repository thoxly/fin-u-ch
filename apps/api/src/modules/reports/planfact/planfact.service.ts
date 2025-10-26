import prisma from '../../../config/db';
import { getMonthKey } from '../utils/date';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import plansService from '../../plans/plans.service';

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
  async getPlanFact(
    companyId: string,
    params: PlanFactParams
  ): Promise<PlanFactRow[]> {
    const cacheKey = generateCacheKey(companyId, 'planfact', params);
    const cached = await getCachedReport(cacheKey);
    if (cached) return cached;

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

    // Get fact data
    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: params.periodFrom,
          lte: params.periodTo,
        },
        type: { in: ['income', 'expense'] },
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

    await cacheReport(cacheKey, result);
    return result;
  }
}

export default new PlanFactService();
