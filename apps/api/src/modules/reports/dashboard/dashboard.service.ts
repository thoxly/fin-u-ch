import prisma from '../../../config/db';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import { createIntervals, PeriodFormat, Interval } from '@fin-u-ch/shared';
import logger from '../../../config/logger';

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

  // Серии для графика поступлений/списаний
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
    operations: Array<{
      id: string;
      type: string;
      amount: number;
      description: string | null;
      accountId: string | null;
      sourceAccountId: string | null;
      targetAccountId: string | null;
      article: {
        id: string;
        name: string;
      } | null;
    }>;
    hasOperations: boolean;
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
  // Накопительные данные для графика поступлений/списаний/чистого потока
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

// Тип операции из Prisma
type PrismaOperation = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  operationDate: Date;
  accountId: string | null;
  sourceAccountId: string | null;
  targetAccountId: string | null;
  article?: { id: string; name: string } | null;
  account?: { id: string; name: string } | null;
  sourceAccount?: { id: string; name: string } | null;
  targetAccount?: { id: string; name: string } | null;
};

// Тип аккаунта
type AccountType = {
  id: string;
  name: string;
  openingBalance: number;
};

export class DashboardService {
  async getDashboard(
    companyId: string,
    params: DashboardParams
  ): Promise<DashboardResponse> {
    const startTime = Date.now();
    const cacheKey = generateCacheKey(companyId, 'dashboard', params);

    logger.debug('Dashboard generation started', {
      companyId,
      params: {
        periodFrom: params.periodFrom.toISOString(),
        periodTo: params.periodTo.toISOString(),
        mode: params.mode,
        periodFormat: params.periodFormat,
      },
    });

    const cached = await getCachedReport(cacheKey);
    if (cached) {
      logger.debug('Dashboard retrieved from cache', {
        companyId,
        cacheKey,
      });
      return cached as DashboardResponse;
    }

    // Определяем формат периода (по умолчанию день)
    const periodFormat = params.periodFormat || 'day';

    logger.debug('Fetching operations for dashboard', {
      companyId,
      periodFrom: params.periodFrom.toISOString(),
      periodTo: params.periodTo.toISOString(),
    });

    // Получаем все операции за период (только реальные, не шаблоны)
    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: params.periodFrom,
          lte: params.periodTo,
        },
        isConfirmed: true,
        isTemplate: false,
      },
      include: {
        account: { select: { id: true, name: true } },
        sourceAccount: { select: { id: true, name: true } },
        targetAccount: { select: { id: true, name: true } },
        article: { select: { id: true, name: true } },
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

    // 1. Рассчитываем поступления/списания по интервалам
    const incomeExpenseSeries = intervals.map((interval) => {
      const intervalOps = operations.filter((op: PrismaOperation) => {
        const opDate = new Date(op.operationDate);
        return opDate >= interval.start && opDate <= interval.end;
      });

      const income = intervalOps
        .filter((op: PrismaOperation) => op.type === 'income')
        .reduce((sum: number, op: PrismaOperation) => sum + op.amount, 0);

      const expense = intervalOps
        .filter((op: PrismaOperation) => op.type === 'expense')
        .reduce((sum: number, op: PrismaOperation) => sum + op.amount, 0);

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
        operations,
        intervals
      );

    // 4. Рассчитываем финальные балансы на конец периода
    const finalBalances =
      accountBalancesSeries.length > 0
        ? Object.entries(
            accountBalancesSeries[accountBalancesSeries.length - 1].accounts
          ).map(([accountId, balance]) => {
            const account = accounts.find(
              (a: AccountType) => a.id === accountId
            );
            return {
              accountId,
              accountName: account?.name || 'Unknown',
              balance,
            };
          })
        : [];

    // 5. Формируем справочник счетов
    const accountsList = accounts.map((acc: AccountType) => ({
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

    const duration = Date.now() - startTime;
    logger.info('Dashboard generated successfully', {
      companyId,
      duration: `${duration}ms`,
      operationsCount: operations.length,
      accountsCount: accounts.length,
      intervalsCount: incomeExpenseSeries.length,
    });

    return result;
  }

  /**
   * Получает накопительные данные для графика поступлений/списаний/чистого потока
   */
  async getCumulativeCashFlow(
    companyId: string,
    params: DashboardParams
  ): Promise<CumulativeCashFlowResponse> {
    const startTime = Date.now();
    const cacheKey = generateCacheKey(
      companyId,
      'cumulative-cash-flow',
      params
    );

    logger.debug('Cumulative cashflow generation started', {
      companyId,
      params: {
        periodFrom: params.periodFrom.toISOString(),
        periodTo: params.periodTo.toISOString(),
        mode: params.mode,
        periodFormat: params.periodFormat,
      },
    });

    const cached = await getCachedReport(cacheKey);
    if (cached) {
      logger.debug('Cumulative cashflow retrieved from cache', {
        companyId,
        cacheKey,
      });
      return cached as CumulativeCashFlowResponse;
    }

    // Определяем формат периода (по умолчанию день)
    const periodFormat = params.periodFormat || 'day';

    // Нормализуем даты для запроса к БД (устанавливаем время в начало/конец дня)
    const normalizedPeriodFrom = new Date(params.periodFrom);
    normalizedPeriodFrom.setHours(0, 0, 0, 0);
    const normalizedPeriodTo = new Date(params.periodTo);
    normalizedPeriodTo.setHours(23, 59, 59, 999);

    logger.debug('Fetching operations for cumulative cashflow', {
      companyId,
      periodFrom: normalizedPeriodFrom.toISOString(),
      periodTo: normalizedPeriodTo.toISOString(),
    });

    // Получаем все операции за период (только реальные, не шаблоны)
    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: normalizedPeriodFrom,
          lte: normalizedPeriodTo,
        },
        isConfirmed: true,
        isTemplate: false,
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

    // Создаем интервалы (используем уже нормализованные даты из запроса к БД)
    // ВАЖНО: Создаем новые Date объекты, чтобы избежать проблем с мутацией
    const intervalsFromDate = new Date(
      normalizedPeriodFrom.getFullYear(),
      normalizedPeriodFrom.getMonth(),
      normalizedPeriodFrom.getDate()
    );
    const intervalsToDate = new Date(
      normalizedPeriodTo.getFullYear(),
      normalizedPeriodTo.getMonth(),
      normalizedPeriodTo.getDate(),
      23,
      59,
      59,
      999
    );

    logger.debug('Creating intervals', {
      periodFormat,
      fromDate: intervalsFromDate.toISOString(),
      toDate: intervalsToDate.toISOString(),
      totalDays:
        Math.ceil(
          (intervalsToDate.getTime() - intervalsFromDate.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1,
    });

    const intervals = createIntervals(
      periodFormat,
      intervalsFromDate,
      intervalsToDate
    );

    logger.debug('Intervals created', {
      intervalsCount: intervals.length,
      firstInterval: intervals[0]
        ? {
            start: intervals[0].start.toISOString(),
            end: intervals[0].end.toISOString(),
            label: intervals[0].label,
          }
        : null,
      lastInterval: intervals[intervals.length - 1]
        ? {
            start: intervals[intervals.length - 1].start.toISOString(),
            end: intervals[intervals.length - 1].end.toISOString(),
            label: intervals[intervals.length - 1].label,
          }
        : null,
    });

    // Рассчитываем накопительные данные
    const cumulativeSeries = intervals.map((interval, index) => {
      // Считаем суммы за все интервалы до текущего включительно
      let cumulativeIncome = 0;
      let cumulativeExpense = 0;

      for (let i = 0; i <= index; i++) {
        const currentInterval = intervals[i];
        const intervalOps = operations.filter((op: PrismaOperation) => {
          const opDate = new Date(op.operationDate);
          return (
            opDate >= currentInterval.start && opDate <= currentInterval.end
          );
        });

        const intervalIncome = intervalOps
          .filter((op: PrismaOperation) => op.type === 'income')
          .reduce((sum: number, op: PrismaOperation) => sum + op.amount, 0);

        const intervalExpense = intervalOps
          .filter((op: PrismaOperation) => op.type === 'expense')
          .reduce((sum: number, op: PrismaOperation) => sum + op.amount, 0);

        cumulativeIncome += intervalIncome;
        cumulativeExpense += intervalExpense;
      }

      // Получаем операции для текущего интервала
      const currentIntervalOps = operations.filter((op: PrismaOperation) => {
        const opDate = new Date(op.operationDate);
        return opDate >= interval.start && opDate <= interval.end;
      });

      return {
        date: interval.start.toISOString().split('T')[0],
        label: interval.label,
        cumulativeIncome,
        cumulativeExpense,
        cumulativeNetCashFlow: cumulativeIncome - cumulativeExpense,
        operations: currentIntervalOps.map((op: PrismaOperation) => ({
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
      .filter((op: PrismaOperation) => op.type === 'income')
      .reduce((sum: number, op: PrismaOperation) => sum + op.amount, 0);

    const totalExpense = operations
      .filter((op: PrismaOperation) => op.type === 'expense')
      .reduce((sum: number, op: PrismaOperation) => sum + op.amount, 0);

    const result: CumulativeCashFlowResponse = {
      cumulativeSeries,
      summary: {
        totalIncome,
        totalExpense,
        totalNetCashFlow: totalIncome - totalExpense,
      },
    };

    await cacheReport(cacheKey, result);

    const duration = Date.now() - startTime;
    logger.info('Cumulative cashflow generated successfully', {
      companyId,
      duration: `${duration}ms`,
      operationsCount: operations.length,
      intervalsCount: cumulativeSeries.length,
    });

    return result;
  }

  /**
   * Рассчитывает балансы по счетам на каждый интервал
   * Оптимизированная версия с использованием Map и reduce для лучшей производительности
   */
  private async calculateAccountBalancesByIntervals(
    companyId: string,
    accounts: Array<{ id: string; name: string; openingBalance: number }>,
    operations: PrismaOperation[],
    intervals: Interval[]
  ): Promise<
    Array<{
      date: string;
      label: string;
      accounts: Record<string, number>;
      operations: Array<{
        id: string;
        type: string;
        amount: number;
        description: string | null;
        accountId: string | null;
        sourceAccountId: string | null;
        targetAccountId: string | null;
        article: {
          id: string;
          name: string;
        } | null;
      }>;
      hasOperations: boolean;
    }>
  > {
    const accountIds = accounts.map((a) => a.id);
    const accountIdsSet = new Set(accountIds);

    // Получаем все операции с начала истории (для расчета начальных балансов, только реальные, не шаблоны)
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
        isConfirmed: true,
        isTemplate: false,
      },
      orderBy: {
        operationDate: 'asc',
      },
    });

    // Создаем Map для быстрого доступа к операциям по интервалам
    const operationsByInterval = new Map<number, PrismaOperation[]>();

    // Предварительно группируем операции по интервалам
    intervals.forEach((interval, index) => {
      const intervalOps = operations.filter((op) => {
        const opDate = new Date(op.operationDate);
        return opDate >= interval.start && opDate <= interval.end;
      });
      operationsByInterval.set(index, intervalOps);
    });

    // Создаем Map для накопления изменений балансов
    const balanceChanges = new Map<string, number>();

    // Инициализируем начальные балансы
    accounts.forEach((account) => {
      balanceChanges.set(account.id, account.openingBalance);
    });

    // Применяем исторические операции один раз
    allOperations.forEach((op: PrismaOperation) => {
      this.applyOperationToBalances(balanceChanges, op, accountIdsSet);
    });

    const result: Array<{
      date: string;
      label: string;
      accounts: Record<string, number>;
      operations: Array<{
        id: string;
        type: string;
        amount: number;
        description: string | null;
        accountId: string | null;
        sourceAccountId: string | null;
        targetAccountId: string | null;
        article: {
          id: string;
          name: string;
        } | null;
      }>;
      hasOperations: boolean;
    }> = [];

    // Для каждого интервала вычисляем балансы
    intervals.forEach((interval, index) => {
      // Копируем текущие балансы для этого интервала
      const currentBalances = new Map(balanceChanges);

      // Применяем операции из текущего интервала
      const currentIntervalOps = operationsByInterval.get(index) || [];
      currentIntervalOps.forEach((op) => {
        this.applyOperationToBalances(currentBalances, op, accountIdsSet);
      });

      // Конвертируем Map в объект для результата
      const balancesObj: Record<string, number> = {};
      accounts.forEach((account) => {
        balancesObj[account.id] = currentBalances.get(account.id) || 0;
      });

      // Формируем операции для интервала
      const intervalOperations = currentIntervalOps.map((op) => ({
        id: op.id,
        type: op.type,
        amount: op.amount,
        description: op.description,
        accountId: op.accountId,
        sourceAccountId: op.sourceAccountId,
        targetAccountId: op.targetAccountId,
        article: op.article || null,
      }));

      result.push({
        date: interval.start.toISOString().split('T')[0],
        label: interval.label,
        accounts: balancesObj,
        operations: intervalOperations,
        hasOperations: currentIntervalOps.length > 0,
      });

      // Обновляем накопленные балансы для следующего интервала
      currentIntervalOps.forEach((op) => {
        this.applyOperationToBalances(balanceChanges, op, accountIdsSet);
      });
    });

    return result;
  }

  /**
   * Применяет операцию к балансам счетов
   */
  private applyOperationToBalances(
    balances: Map<string, number>,
    op: {
      type: string;
      amount: number;
      accountId?: string | null;
      sourceAccountId?: string | null;
      targetAccountId?: string | null;
    },
    accountIdsSet: Set<string>
  ): void {
    if (
      op.type === 'income' &&
      op.accountId &&
      accountIdsSet.has(op.accountId)
    ) {
      const currentBalance = balances.get(op.accountId) || 0;
      balances.set(op.accountId, currentBalance + op.amount);
    } else if (
      op.type === 'expense' &&
      op.accountId &&
      accountIdsSet.has(op.accountId)
    ) {
      const currentBalance = balances.get(op.accountId) || 0;
      balances.set(op.accountId, currentBalance - op.amount);
    } else if (op.type === 'transfer') {
      if (op.sourceAccountId && accountIdsSet.has(op.sourceAccountId)) {
        const currentBalance = balances.get(op.sourceAccountId) || 0;
        balances.set(op.sourceAccountId, currentBalance - op.amount);
      }
      if (op.targetAccountId && accountIdsSet.has(op.targetAccountId)) {
        const currentBalance = balances.get(op.targetAccountId) || 0;
        balances.set(op.targetAccountId, currentBalance + op.amount);
      }
    }
  }
}

export default new DashboardService();
