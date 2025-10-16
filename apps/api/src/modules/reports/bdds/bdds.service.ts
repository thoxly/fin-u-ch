import prisma from '../../../config/db';
import { getMonthsBetween } from '../utils/date';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import plansService from '../../plans/plans.service';

export interface BDDSParams {
  periodFrom: Date;
  periodTo: Date;
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

export class BDDSService {
  async getBDDS(companyId: string, params: BDDSParams): Promise<BDDSRow[]> {
    const cacheKey = generateCacheKey(companyId, 'bdds', params);
    const cached = await getCachedReport(cacheKey);
    if (cached) return cached;

    const planItems = await prisma.planItem.findMany({
      where: {
        companyId,
        status: 'active',
        startDate: { lte: params.periodTo },
        OR: [{ endDate: null }, { endDate: { gte: params.periodFrom } }],
      },
      include: {
        article: { select: { id: true, name: true, type: true } },
      },
    });

    const months = getMonthsBetween(params.periodFrom, params.periodTo);
    const monthsIndex = new Map(months.map((m, idx) => [m, idx]));
    const articleMap = new Map<string, BDDSRow>();

    for (const planItem of planItems) {
      if (!planItem.article) continue;

      const expanded = plansService.expandPlan(
        planItem,
        params.periodFrom,
        params.periodTo
      );

      const key = planItem.article.id;
      if (!articleMap.has(key)) {
        articleMap.set(key, {
          articleId: planItem.article.id,
          articleName: planItem.article.name,
          type: planItem.article.type,
          months: months.map((m) => ({ month: m, amount: 0 })),
          total: 0,
        });
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

    const result = Array.from(articleMap.values()).sort(
      (a, b) =>
        a.type.localeCompare(b.type) ||
        a.articleName.localeCompare(b.articleName)
    );

    await cacheReport(cacheKey, result);
    return result;
  }
}

export default new BDDSService();
