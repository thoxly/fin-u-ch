import prisma from '../../../config/db';
import { getMonthKey } from '../utils/date';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';

export interface DashboardParams {
  periodFrom: Date;
  periodTo: Date;
  mode: 'plan' | 'fact' | 'both';
}

export interface DashboardResponse {
  income: number;
  expense: number;
  netProfit: number;
  balancesByAccount: Array<{ accountId: string; accountName: string; balance: number }>;
  series: Array<{ month: string; income: number; expense: number; plan?: number }>;
}

export class DashboardService {
  async getDashboard(companyId: string, params: DashboardParams): Promise<DashboardResponse> {
    const cacheKey = generateCacheKey(companyId, 'dashboard', params);
    const cached = await getCachedReport(cacheKey);
    if (cached) return cached;

    const result: DashboardResponse = {
      income: 0,
      expense: 0,
      netProfit: 0,
      balancesByAccount: [],
      series: [],
    };

    // Get actual operations
    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: params.periodFrom,
          lte: params.periodTo,
        },
      },
      include: {
        account: { select: { id: true, name: true } },
      },
    });

    // Calculate totals
    const incomeOps = operations.filter((op: any) => op.type === 'income');
    const expenseOps = operations.filter((op: any) => op.type === 'expense');

    result.income = incomeOps.reduce((sum: number, op: any) => sum + op.amount, 0);
    result.expense = expenseOps.reduce((sum: number, op: any) => sum + op.amount, 0);
    result.netProfit = result.income - result.expense;

    // Calculate balances by account
    const accounts = await prisma.account.findMany({
      where: { companyId, isActive: true },
    });

    for (const account of accounts) {
      const accountOps = operations.filter(
        (op: any) => op.accountId === account.id || op.sourceAccountId === account.id || op.targetAccountId === account.id
      );

      let balance = account.openingBalance;
      for (const op of accountOps) {
        if (op.type === 'income' && op.accountId === account.id) {
          balance += op.amount;
        } else if (op.type === 'expense' && op.accountId === account.id) {
          balance -= op.amount;
        } else if (op.type === 'transfer') {
          if (op.sourceAccountId === account.id) balance -= op.amount;
          if (op.targetAccountId === account.id) balance += op.amount;
        }
      }

      result.balancesByAccount.push({
        accountId: account.id,
        accountName: account.name,
        balance,
      });
    }

    // Build time series
    const monthsMap = new Map<string, { income: number; expense: number }>();

    for (const op of operations) {
      const month = getMonthKey(new Date(op.operationDate));
      if (!monthsMap.has(month)) {
        monthsMap.set(month, { income: 0, expense: 0 });
      }
      const data = monthsMap.get(month)!;
      if (op.type === 'income') data.income += op.amount;
      if (op.type === 'expense') data.expense += op.amount;
    }

    result.series = Array.from(monthsMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    await cacheReport(cacheKey, result);
    return result;
  }
}

export default new DashboardService();

