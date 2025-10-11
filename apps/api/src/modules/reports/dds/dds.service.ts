import prisma from '../../../config/db';
import { getMonthKey, getMonthsBetween } from '../utils/date';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';

export interface DDSParams {
  periodFrom: Date;
  periodTo: Date;
  accountId?: string;
}

export interface DDSAccountBalance {
  accountId: string;
  accountName: string;
  openingBalance: number;
  closingBalance: number;
}

export interface DDSFlow {
  articleId: string;
  articleName: string;
  type: 'income' | 'expense';
  months: Record<string, number>;
  total: number;
}

export interface DDSReport {
  accounts: DDSAccountBalance[];
  inflows: DDSFlow[];
  outflows: DDSFlow[];
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netCashflow: number;
  };
}

export class DDSService {
  async getDDS(companyId: string, params: DDSParams): Promise<DDSReport> {
    const cacheKey = generateCacheKey(companyId, 'dds', params);
    const cached = await getCachedReport(cacheKey);
    if (cached) return cached;

    // Get accounts
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        isActive: true,
        ...(params.accountId && { id: params.accountId }),
      },
    });

    const months = getMonthsBetween(params.periodFrom, params.periodTo);

    // Calculate opening and closing balances
    const accountBalances: DDSAccountBalance[] = [];
    for (const account of accounts) {
      const openingBalance = await this.calculateAccountBalance(
        companyId,
        account.id,
        params.periodFrom
      );
      const closingBalance = await this.calculateAccountBalance(
        companyId,
        account.id,
        params.periodTo
      );

      accountBalances.push({
        accountId: account.id,
        accountName: account.name,
        openingBalance,
        closingBalance,
      });
    }

    // Get operations for the period
    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: params.periodFrom,
          lte: params.periodTo,
        },
        type: { in: ['income', 'expense'] },
        ...(params.accountId && { accountId: params.accountId }),
      },
      include: {
        article: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    // Group by articles
    const inflowsMap = new Map<string, DDSFlow>();
    const outflowsMap = new Map<string, DDSFlow>();
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const op of operations) {
      if (!op.article) continue;

      const month = getMonthKey(new Date(op.operationDate));
      const key = op.article.id;

      if (op.type === 'income') {
        if (!inflowsMap.has(key)) {
          inflowsMap.set(key, {
            articleId: op.article.id,
            articleName: op.article.name,
            type: 'income',
            months: Object.fromEntries(months.map((m) => [m, 0])),
            total: 0,
          });
        }
        const flow = inflowsMap.get(key)!;
        if (flow.months[month] !== undefined) {
          flow.months[month] += op.amount;
          flow.total += op.amount;
          totalInflow += op.amount;
        }
      } else if (op.type === 'expense') {
        if (!outflowsMap.has(key)) {
          outflowsMap.set(key, {
            articleId: op.article.id,
            articleName: op.article.name,
            type: 'expense',
            months: Object.fromEntries(months.map((m) => [m, 0])),
            total: 0,
          });
        }
        const flow = outflowsMap.get(key)!;
        if (flow.months[month] !== undefined) {
          flow.months[month] += op.amount;
          flow.total += op.amount;
          totalOutflow += op.amount;
        }
      }
    }

    const result: DDSReport = {
      accounts: accountBalances,
      inflows: Array.from(inflowsMap.values()).sort((a, b) =>
        a.articleName.localeCompare(b.articleName)
      ),
      outflows: Array.from(outflowsMap.values()).sort((a, b) =>
        a.articleName.localeCompare(b.articleName)
      ),
      summary: {
        totalInflow,
        totalOutflow,
        netCashflow: totalInflow - totalOutflow,
      },
    };

    await cacheReport(cacheKey, result);
    return result;
  }

  private async calculateAccountBalance(
    companyId: string,
    accountId: string,
    date: Date
  ): Promise<number> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) return 0;

    let balance = account.openingBalance;

    // Get all operations before the specified date
    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: { lt: date },
        OR: [
          { accountId, type: { in: ['income', 'expense'] } },
          { sourceAccountId: accountId, type: 'transfer' },
          { targetAccountId: accountId, type: 'transfer' },
        ],
      },
    });

    for (const op of operations) {
      if (op.type === 'income' && op.accountId === accountId) {
        balance += op.amount;
      } else if (op.type === 'expense' && op.accountId === accountId) {
        balance -= op.amount;
      } else if (op.type === 'transfer') {
        if (op.sourceAccountId === accountId) {
          balance -= op.amount;
        }
        if (op.targetAccountId === accountId) {
          balance += op.amount;
        }
      }
    }

    return balance;
  }
}

export default new DDSService();
