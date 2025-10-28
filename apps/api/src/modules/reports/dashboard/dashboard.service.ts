import prisma from '../../../config/db';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import { createIntervals, PeriodFormat, Interval } from '../utils/date';

export interface DashboardParams {
  periodFrom: Date;
  periodTo: Date;
  mode: 'plan' | 'fact' | 'both';
  periodFormat?: PeriodFormat; // Новый параметр
}

export interface DashboardResponse {
  // Общие суммы
  summary: {
    income: number;
    expense: number;
    netProfit: number;
  };

  // Серии для графика доходов/расходов
  incomeExpenseSeries: Array<{
    date: string;
    label: string;
    income: number;
    expense: number;
    netCashFlow: number;
  }>;

  // Остатки по счетам по интервалам
  accountBalancesSeries: Array<{
    date: string;
    label: string;
    accounts: Record<string, number>;
  }>;

  // Справочник счетов
  accounts: Array<{
    id: string;
    name: string;
  }>;

  // Финальные балансы на конец периода
  finalBalances: Array<{
    accountId: string;
    accountName: string;
    balance: number;
  }>;
}

export interface CumulativeCashFlowResponse {
  // Накопительные данные для графика доходов/расходов/чистого потока
  cumulativeSeries: Array<{
    date: string;
    label: string;
    cumulativeIncome: number;
    cumulativeExpense: number;
    cumulativeNetCashFlow: number;
    operations: Array<{
      id: string;
      type: string;
      amount: number;
      description: string | null;
      article: {
        id: string;
        name: string;
      } | null;
    }>;
    hasOperations: boolean; // Флаг, есть ли операции в этот день
  }>;

  // Общие суммы за период
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalNetCashFlow: number;
  };
}

export class DashboardService {
  async getDashboard(
    companyId: string,
    params: DashboardParams
  ): Promise<DashboardResponse> {
    const cacheKey = generateCacheKey(companyId, 'dashboard', params);
    const cached = await getCachedReport(cacheKey);
    if (cached) return cached as DashboardResponse;

    // Определяем формат периода (по умолчанию день)
    const periodFormat = params.periodFormat || 'day';

    // Получаем все операции за период
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
        sourceAccount: { select: { id: true, name: true } },
        targetAccount: { select: { id: true, name: true } },
      },
      orderBy: {
        operationDate: 'asc',
      },
    });

    // Получаем все активные счета
    const accounts = await prisma.account.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' },
    });

    // Создаем интервалы
    const intervals = createIntervals(
      periodFormat,
      params.periodFrom,
      params.periodTo
    );

    // 1. Рассчитываем доходы/расходы по интервалам
    const incomeExpenseSeries = intervals.map((interval) => {
      const intervalOps = operations.filter((op) => {
        const opDate = new Date(op.operationDate);
        return opDate >= interval.start && opDate <= interval.end;
      });

      const income = intervalOps
        .filter((op) => op.type === 'income')
        .reduce((sum, op) => sum + op.amount, 0);

      const expense = intervalOps
        .filter((op) => op.type === 'expense')
        .reduce((sum, op) => sum + op.amount, 0);

      return {
        date: interval.start.toISOString().split('T')[0],
        label: interval.label,
        income,
        expense,
        netCashFlow: income - expense,
      };
    });

    // 2. Рассчитываем общие суммы
    const totalIncome = incomeExpenseSeries.reduce(
      (sum, point) => sum + point.income,
      0
    );
    const totalExpense = incomeExpenseSeries.reduce(
      (sum, point) => sum + point.expense,
      0
    );

    // 3. Рассчитываем балансы по счетам на каждый интервал
    const accountBalancesSeries =
      await this.calculateAccountBalancesByIntervals(
        companyId,
        accounts,
        operations.map((op) => ({
          type: op.type,
          amount: op.amount,
          accountId: op.accountId || undefined,
          sourceAccountId: op.sourceAccountId || undefined,
          targetAccountId: op.targetAccountId || undefined,
          operationDate: op.operationDate.toISOString(),
        })),
        intervals
      );

    // 4. Рассчитываем финальные балансы на конец периода
    const finalBalances =
      accountBalancesSeries.length > 0
        ? Object.entries(
            accountBalancesSeries[accountBalancesSeries.length - 1].accounts
          ).map(([accountId, balance]) => {
            const account = accounts.find((a) => a.id === accountId);
            return {
              accountId,
              accountName: account?.name || 'Unknown',
              balance,
            };
          })
        : [];

    // 5. Формируем справочник счетов
    const accountsList = accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
    }));

    const result: DashboardResponse = {
      summary: {
        income: totalIncome,
        expense: totalExpense,
        netProfit: totalIncome - totalExpense,
      },
      incomeExpenseSeries,
      accountBalancesSeries,
      accounts: accountsList,
      finalBalances,
    };

    await cacheReport(cacheKey, result);
    return result;
  }

  /**
   * Получает накопительные данные для графика доходов/расходов/чистого потока
   */
  async getCumulativeCashFlow(
    companyId: string,
    params: DashboardParams
  ): Promise<CumulativeCashFlowResponse> {
    const cacheKey = generateCacheKey(
      companyId,
      'cumulative-cash-flow',
      params
    );
    const cached = await getCachedReport(cacheKey);
    if (cached) return cached as CumulativeCashFlowResponse;

    // Определяем формат периода (по умолчанию день)
    const periodFormat = params.periodFormat || 'day';

    // Получаем все операции за период
    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: params.periodFrom,
          lte: params.periodTo,
        },
      },
      include: {
        article: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        operationDate: 'asc',
      },
    });

    // Создаем интервалы
    const intervals = createIntervals(
      periodFormat,
      params.periodFrom,
      params.periodTo
    );

    // Рассчитываем накопительные данные
    const cumulativeSeries = intervals.map((interval, index) => {
      // Считаем суммы за все интервалы до текущего включительно
      let cumulativeIncome = 0;
      let cumulativeExpense = 0;

      for (let i = 0; i <= index; i++) {
        const currentInterval = intervals[i];
        const intervalOps = operations.filter((op) => {
          const opDate = new Date(op.operationDate);
          return (
            opDate >= currentInterval.start && opDate <= currentInterval.end
          );
        });

        const intervalIncome = intervalOps
          .filter((op) => op.type === 'income')
          .reduce((sum, op) => sum + op.amount, 0);

        const intervalExpense = intervalOps
          .filter((op) => op.type === 'expense')
          .reduce((sum, op) => sum + op.amount, 0);

        cumulativeIncome += intervalIncome;
        cumulativeExpense += intervalExpense;
      }

      // Получаем операции для текущего интервала
      const currentIntervalOps = operations.filter((op) => {
        const opDate = new Date(op.operationDate);
        return opDate >= interval.start && opDate <= interval.end;
      });

      return {
        date: interval.start.toISOString().split('T')[0],
        label: interval.label,
        cumulativeIncome,
        cumulativeExpense,
        cumulativeNetCashFlow: cumulativeIncome - cumulativeExpense,
        operations: currentIntervalOps.map((op) => ({
          id: op.id,
          type: op.type,
          amount: op.amount,
          description: op.description,
          article: op.article
            ? { id: op.article.id, name: op.article.name }
            : null,
        })),
        hasOperations: currentIntervalOps.length > 0,
      };
    });

    // Рассчитываем общие суммы за период
    const totalIncome = operations
      .filter((op) => op.type === 'income')
      .reduce((sum, op) => sum + op.amount, 0);

    const totalExpense = operations
      .filter((op) => op.type === 'expense')
      .reduce((sum, op) => sum + op.amount, 0);

    const result: CumulativeCashFlowResponse = {
      cumulativeSeries,
      summary: {
        totalIncome,
        totalExpense,
        totalNetCashFlow: totalIncome - totalExpense,
      },
    };

    await cacheReport(cacheKey, result);
    return result;
  }

  /**
   * Рассчитывает балансы по счетам на каждый интервал
   */
  private async calculateAccountBalancesByIntervals(
    companyId: string,
    accounts: Array<{ id: string; name: string; openingBalance: number }>,
    operations: Array<{
      type: string;
      amount: number;
      accountId?: string;
      sourceAccountId?: string;
      targetAccountId?: string;
      operationDate: string;
    }>,
    intervals: Interval[]
  ): Promise<
    Array<{ date: string; label: string; accounts: Record<string, number> }>
  > {
    const result: Array<{
      date: string;
      label: string;
      accounts: Record<string, number>;
    }> = [];
    const accountIds = accounts.map((a) => a.id);

    // Получаем все операции с начала истории (для расчета начальных балансов)
    const allOperations = await prisma.operation.findMany({
      where: {
        companyId,
        OR: [
          { accountId: { in: accountIds } },
          { sourceAccountId: { in: accountIds } },
          { targetAccountId: { in: accountIds } },
        ],
        operationDate: {
          lt: intervals[0].start, // До начала периода
        },
      },
      orderBy: {
        operationDate: 'asc',
      },
    });

    // Для каждого интервала вычисляем балансы
    intervals.forEach((interval, index) => {
      // Начинаем с начального баланса для каждого счета
      const balances: Record<string, number> = {};

      accounts.forEach((account) => {
        balances[account.id] = account.openingBalance;
      });

      // Применяем все операции до текущего интервала
      // 1. Исторические операции (до первого интервала)
      allOperations.forEach((op) => {
        if (op.type === 'income' && op.accountId) {
          if (balances[op.accountId] !== undefined) {
            balances[op.accountId] += op.amount;
          }
        } else if (op.type === 'expense' && op.accountId) {
          if (balances[op.accountId] !== undefined) {
            balances[op.accountId] -= op.amount;
          }
        } else if (op.type === 'transfer') {
          if (
            op.sourceAccountId &&
            balances[op.sourceAccountId] !== undefined
          ) {
            balances[op.sourceAccountId] -= op.amount;
          }
          if (
            op.targetAccountId &&
            balances[op.targetAccountId] !== undefined
          ) {
            balances[op.targetAccountId] += op.amount;
          }
        }
      });

      // 2. Операции из текущего периода до текущего интервала
      for (let i = 0; i < index; i++) {
        const prevInterval = intervals[i];
        operations
          .filter((op) => {
            const opDate = new Date(op.operationDate);
            return opDate >= prevInterval.start && opDate <= prevInterval.end;
          })
          .forEach((op) => {
            if (op.type === 'income' && op.accountId) {
              if (balances[op.accountId] !== undefined) {
                balances[op.accountId] += op.amount;
              }
            } else if (op.type === 'expense' && op.accountId) {
              if (balances[op.accountId] !== undefined) {
                balances[op.accountId] -= op.amount;
              }
            } else if (op.type === 'transfer') {
              if (
                op.sourceAccountId &&
                balances[op.sourceAccountId] !== undefined
              ) {
                balances[op.sourceAccountId] -= op.amount;
              }
              if (
                op.targetAccountId &&
                balances[op.targetAccountId] !== undefined
              ) {
                balances[op.targetAccountId] += op.amount;
              }
            }
          });
      }

      // 3. Операции из текущего интервала
      operations
        .filter((op) => {
          const opDate = new Date(op.operationDate);
          return opDate >= interval.start && opDate <= interval.end;
        })
        .forEach((op) => {
          if (op.type === 'income' && op.accountId) {
            if (balances[op.accountId] !== undefined) {
              balances[op.accountId] += op.amount;
            }
          } else if (op.type === 'expense' && op.accountId) {
            if (balances[op.accountId] !== undefined) {
              balances[op.accountId] -= op.amount;
            }
          } else if (op.type === 'transfer') {
            if (
              op.sourceAccountId &&
              balances[op.sourceAccountId] !== undefined
            ) {
              balances[op.sourceAccountId] -= op.amount;
            }
            if (
              op.targetAccountId &&
              balances[op.targetAccountId] !== undefined
            ) {
              balances[op.targetAccountId] += op.amount;
            }
          }
        });

      result.push({
        date: interval.start.toISOString().split('T')[0],
        label: interval.label,
        accounts: { ...balances },
      });
    });

    return result;
  }
}

export default new DashboardService();
