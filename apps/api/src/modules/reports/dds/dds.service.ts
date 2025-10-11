import prisma from '../../../config/db';
import { getMonthKey, getMonthsBetween } from '../utils/date';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';

export interface DDSParams {
  periodFrom: Date;
  periodTo: Date;
  accountId?: string;
  limit?: number;
  offset?: number;
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

    // Get accounts with explicit companyId validation
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        isActive: true,
        ...(params.accountId && { id: params.accountId }),
      },
    });

    // CRITICAL SECURITY: Verify all accounts belong to this company
    if (accounts.length > 0) {
      const invalidAccounts = accounts.filter(
        (acc) => acc.companyId !== companyId
      );
      if (invalidAccounts.length > 0) {
        throw new Error(
          'Security violation: Account does not belong to company'
        );
      }
    }

    const months = getMonthsBetween(params.periodFrom, params.periodTo);

    // Calculate opening and closing balances - batch processing to avoid N+1
    const accountBalances: DDSAccountBalance[] =
      await this.calculateAccountBalances(
        companyId,
        accounts,
        params.periodFrom,
        params.periodTo
      );

    // Get operations for the period with pagination support
    const limit = params.limit || 10000; // Default limit for large datasets
    const offset = params.offset || 0;

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
      orderBy: {
        operationDate: 'desc',
      },
      take: limit,
      skip: offset,
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

  private async calculateAccountBalances(
    companyId: string,
    accounts: Array<{ id: string; name: string; openingBalance: number }>,
    periodFrom: Date,
    periodTo: Date
  ): Promise<DDSAccountBalance[]> {
    // Validate all accounts belong to the company
    const accountIds = accounts.map((a) => a.id);

    // SECURITY: Explicit validation that all accounts belong to the company
    const accountsToValidate = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
      },
      select: {
        id: true,
        companyId: true,
      },
    });

    // Verify each account belongs to the company
    for (const acc of accountsToValidate) {
      if (acc.companyId !== companyId) {
        throw new Error(
          `Security violation: Account ${acc.id} does not belong to company ${companyId}`
        );
      }
    }

    // Get all operations in a single query with date range limit
    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: { lt: periodTo },
        OR: [
          {
            accountId: { in: accountIds },
            type: { in: ['income', 'expense'] },
          },
          { sourceAccountId: { in: accountIds }, type: 'transfer' },
          { targetAccountId: { in: accountIds }, type: 'transfer' },
        ],
      },
      orderBy: {
        operationDate: 'asc',
      },
    });

    const balances: DDSAccountBalance[] = [];

    for (const account of accounts) {
      if (!account.id) continue;

      let openingBalance = account.openingBalance;
      let closingBalance = account.openingBalance;

      // Calculate balances from operations
      for (const op of operations) {
        const opDate = new Date(op.operationDate);
        let delta = 0;

        if (op.type === 'income' && op.accountId === account.id) {
          delta = op.amount;
        } else if (op.type === 'expense' && op.accountId === account.id) {
          delta = -op.amount;
        } else if (op.type === 'transfer') {
          if (op.sourceAccountId === account.id) {
            delta = -op.amount;
          }
          if (op.targetAccountId === account.id) {
            delta += op.amount;
          }
        }

        if (opDate < periodFrom) {
          openingBalance += delta;
        }
        if (opDate < periodTo) {
          closingBalance += delta;
        }
      }

      balances.push({
        accountId: account.id,
        accountName: account.name,
        openingBalance,
        closingBalance,
      });
    }

    return balances;
  }
}

export default new DDSService();
