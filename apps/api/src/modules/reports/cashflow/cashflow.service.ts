import prisma from '../../../config/db';
import { getMonthKey, getMonthsBetween } from '../utils/date';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';

export interface CashflowParams {
  periodFrom: Date;
  periodTo: Date;
  activity?: string;
}

export interface CashflowRow {
  articleId: string;
  articleName: string;
  activity: string;
  type: string;
  months: Record<string, number>;
  total: number;
}

export class CashflowService {
  async getCashflow(
    companyId: string,
    params: CashflowParams
  ): Promise<CashflowRow[]> {
    const cacheKey = generateCacheKey(companyId, 'cashflow', params);
    const cached = await getCachedReport(cacheKey);
    if (cached) return cached;

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
        article: {
          select: { id: true, name: true, activity: true, type: true },
        },
      },
    });

    const months = getMonthsBetween(params.periodFrom, params.periodTo);
    const articleMap = new Map<string, CashflowRow>();

    for (const op of operations) {
      if (!op.article) continue;
      if (params.activity && op.article.activity !== params.activity) continue;

      const key = op.article.id;
      if (!articleMap.has(key)) {
        articleMap.set(key, {
          articleId: op.article.id,
          articleName: op.article.name,
          activity: op.article.activity || 'unknown',
          type: op.article.type,
          months: Object.fromEntries(months.map((m) => [m, 0])),
          total: 0,
        });
      }

      const row = articleMap.get(key)!;
      const month = getMonthKey(new Date(op.operationDate));
      if (row.months[month] !== undefined) {
        row.months[month] += op.amount;
        row.total += op.amount;
      }
    }

    const result = Array.from(articleMap.values()).sort(
      (a, b) =>
        a.activity.localeCompare(b.activity) ||
        a.type.localeCompare(b.type) ||
        a.articleName.localeCompare(b.articleName)
    );

    await cacheReport(cacheKey, result);
    return result;
  }
}

export default new CashflowService();
