import prisma from '../../../config/db';
import { cacheReport, getCachedReport, generateCacheKey } from '../utils/cache';
import {
  createIntervals,
  PeriodFormat,
  Interval,
  formatIntervalLabel,
} from '@fin-u-ch/shared';
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

  async getDashboard(
    companyId: string,
    params: DashboardParams
  ): Promise<DashboardResponse> {
    logger.info('=== Dashboard.getDashboard CALLED ===', {
      companyId,
      periodFrom: params.periodFrom.toISOString(),
      periodTo: params.periodTo.toISOString(),
      mode: params.mode,
      periodFormat: params.periodFormat,
    });

    const cacheKey = generateCacheKey(companyId, 'dashboard', params);
    const cached = await getCachedReport(cacheKey);
    if (cached) {
      logger.info('Dashboard: returning cached data', { companyId });
      return cached as DashboardResponse;
    }

    // Определяем формат периода (по умолчанию день)
    const periodFormat = params.periodFormat || 'day';

    // Получаем текущую дату для фильтрации будущих операций
    const todayStart = this.getTodayStart();
    // Используем минимальное значение между концом периода и сегодняшним днем
    const maxDate = new Date(
      Math.min(params.periodTo.getTime(), todayStart.getTime())
    );

    logger.info('Dashboard: filtering future operations', {
      companyId,
      periodFrom: params.periodFrom.toISOString(),
      periodTo: params.periodTo.toISOString(),
      todayStart: todayStart.toISOString(),
      maxDate: maxDate.toISOString(),
      periodFormat,
    });

    // Получаем все операции за период (только реальные, не шаблоны, не будущие)
    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: params.periodFrom,
          lte: maxDate, // Исключаем операции в будущем
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

    logger.info('Dashboard: operations fetched', {
      companyId,
      operationsCount: operations.length,
      periodFrom: params.periodFrom.toISOString(),
      maxDate: maxDate.toISOString(),
      sampleOperations: operations.slice(0, 3).map((op) => ({
        id: op.id,
        date: op.operationDate.toISOString(),
        type: op.type,
        amount: op.amount,
      })),
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
    logger.info('Dashboard: starting interval mapping', {
      companyId,
      intervalsCount: intervals.length,
      operationsCount: operations.length,
      firstInterval: intervals[0]
        ? {
            start: intervals[0].start.toISOString(),
            end: intervals[0].end.toISOString(),
            label: intervals[0].label,
          }
        : null,
      firstOperation: operations[0]
        ? {
            date: operations[0].operationDate.toISOString(),
            type: operations[0].type,
            amount: operations[0].amount,
          }
        : null,
    });

    const incomeExpenseSeries = intervals.map((interval) => {
      const intervalOps = operations.filter((op: PrismaOperation) => {
        const opDate = new Date(op.operationDate);
        // Нормализуем дату операции до начала дня в UTC для корректного сравнения
        const opDateNormalized = new Date(
          Date.UTC(
            opDate.getUTCFullYear(),
            opDate.getUTCMonth(),
            opDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        // Сравниваем нормализованные даты
        const intervalStartNormalized = new Date(
          Date.UTC(
            interval.start.getUTCFullYear(),
            interval.start.getUTCMonth(),
            interval.start.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        const intervalEndNormalized = new Date(
          Date.UTC(
            interval.end.getUTCFullYear(),
            interval.end.getUTCMonth(),
            interval.end.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        return (
          opDateNormalized >= intervalStartNormalized &&
          opDateNormalized <= intervalEndNormalized
        );
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

    logger.info('Dashboard: incomeExpenseSeries calculated', {
      companyId,
      seriesLength: incomeExpenseSeries.length,
      totalIncome,
      totalExpense,
      seriesWithData: incomeExpenseSeries.filter(
        (p) => p.income > 0 || p.expense > 0
      ).length,
      sampleSeries: incomeExpenseSeries
        .filter((p) => p.income > 0 || p.expense > 0)
        .slice(0, 5),
    });

    // 3. Рассчитываем балансы по счетам на каждый интервал
    // ВАЖНО: Для графика остатков всегда используем дневные интервалы,
    // чтобы показать изменения баланса по дням, а не только по месяцам/кварталам
    const accountBalancesIntervals = this.createDailyIntervals(
      params.periodFrom,
      params.periodTo
    );
    const accountBalancesSeries =
      await this.calculateAccountBalancesByIntervals(
        companyId,
        accounts,
        operations,
        accountBalancesIntervals
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
    return result;
  }

  /**
   * Получает накопительные данные для графика поступлений/списаний/чистого потока
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

    // Получаем текущую дату для фильтрации будущих операций
    const todayStart = this.getTodayStart();
    // Используем минимальное значение между концом периода и сегодняшним днем
    const maxDate = new Date(
      Math.min(params.periodTo.getTime(), todayStart.getTime())
    );

    logger.info('CumulativeCashFlow: filtering future operations', {
      companyId,
      periodFrom: params.periodFrom.toISOString(),
      periodTo: params.periodTo.toISOString(),
      todayStart: todayStart.toISOString(),
      maxDate: maxDate.toISOString(),
      periodFormat,
    });

    // Получаем все операции за период (только реальные, не шаблоны, не будущие)
    const operations = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          gte: params.periodFrom,
          lte: maxDate, // Исключаем операции в будущем
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

    logger.info('CumulativeCashFlow: operations fetched', {
      companyId,
      operationsCount: operations.length,
      periodFrom: params.periodFrom.toISOString(),
      maxDate: maxDate.toISOString(),
      sampleOperations: operations.slice(0, 3).map((op) => ({
        id: op.id,
        date: op.operationDate.toISOString(),
        type: op.type,
        amount: op.amount,
      })),
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
        const intervalOps = operations.filter((op: PrismaOperation) => {
          const opDate = new Date(op.operationDate);
          // Нормализуем дату операции до начала дня в UTC для корректного сравнения
          const opDateNormalized = new Date(
            Date.UTC(
              opDate.getUTCFullYear(),
              opDate.getUTCMonth(),
              opDate.getUTCDate(),
              0,
              0,
              0,
              0
            )
          );
          // Сравниваем нормализованные даты
          const intervalStartNormalized = new Date(
            Date.UTC(
              currentInterval.start.getUTCFullYear(),
              currentInterval.start.getUTCMonth(),
              currentInterval.start.getUTCDate(),
              0,
              0,
              0,
              0
            )
          );
          const intervalEndNormalized = new Date(
            Date.UTC(
              currentInterval.end.getUTCFullYear(),
              currentInterval.end.getUTCMonth(),
              currentInterval.end.getUTCDate(),
              0,
              0,
              0,
              0
            )
          );
          return (
            opDateNormalized >= intervalStartNormalized &&
            opDateNormalized <= intervalEndNormalized
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
        // Нормализуем дату операции до начала дня в UTC для корректного сравнения
        const opDateNormalized = new Date(
          Date.UTC(
            opDate.getUTCFullYear(),
            opDate.getUTCMonth(),
            opDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        // Сравниваем нормализованные даты
        const intervalStartNormalized = new Date(
          Date.UTC(
            interval.start.getUTCFullYear(),
            interval.start.getUTCMonth(),
            interval.start.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        const intervalEndNormalized = new Date(
          Date.UTC(
            interval.end.getUTCFullYear(),
            interval.end.getUTCMonth(),
            interval.end.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        return (
          opDateNormalized >= intervalStartNormalized &&
          opDateNormalized <= intervalEndNormalized
        );
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

    logger.info('CumulativeCashFlow: cumulativeSeries calculated', {
      companyId,
      seriesLength: cumulativeSeries.length,
      totalIncome,
      totalExpense,
      seriesWithData: cumulativeSeries.filter(
        (p) =>
          (p.cumulativeIncome !== null && p.cumulativeIncome !== 0) ||
          (p.cumulativeExpense !== null && p.cumulativeExpense !== 0) ||
          (p.cumulativeNetCashFlow !== null && p.cumulativeNetCashFlow !== 0)
      ).length,
      sampleSeries: cumulativeSeries
        .filter(
          (p) =>
            (p.cumulativeIncome !== null && p.cumulativeIncome !== 0) ||
            (p.cumulativeExpense !== null && p.cumulativeExpense !== 0) ||
            (p.cumulativeNetCashFlow !== null && p.cumulativeNetCashFlow !== 0)
        )
        .slice(0, 5),
    });

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
   * Создает ежедневные интервалы для графика остатков
   * Всегда создает интервалы по дням, независимо от длины периода
   */
  private createDailyIntervals(fromDate: Date, toDate: Date): Interval[] {
    const intervals: Interval[] = [];

    // Нормализуем даты для корректного вычисления (используем UTC)
    const fromDateNormalized = new Date(
      Date.UTC(
        fromDate.getUTCFullYear(),
        fromDate.getUTCMonth(),
        fromDate.getUTCDate()
      )
    );
    const toDateNormalized = new Date(
      Date.UTC(
        toDate.getUTCFullYear(),
        toDate.getUTCMonth(),
        toDate.getUTCDate()
      )
    );

    const totalDays =
      Math.ceil(
        (toDateNormalized.getTime() - fromDateNormalized.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    // Создаем интервал для каждого дня
    const dayDate = new Date(fromDateNormalized);

    for (let dayCount = 0; dayCount < totalDays; dayCount++) {
      const start = new Date(
        Date.UTC(
          dayDate.getUTCFullYear(),
          dayDate.getUTCMonth(),
          dayDate.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );
      const end = new Date(
        Date.UTC(
          dayDate.getUTCFullYear(),
          dayDate.getUTCMonth(),
          dayDate.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      intervals.push({
        start,
        end,
        label: formatIntervalLabel(start, end, 'day'),
      });

      // Переходим к следующему дню
      dayDate.setUTCDate(dayDate.getUTCDate() + 1);
    }

    return intervals;
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
    // ВАЖНО: Для дневных интервалов нормализуем даты для корректного сравнения
    intervals.forEach((interval, index) => {
      const intervalOps = operations.filter((op) => {
        const opDate = new Date(op.operationDate);
        // Нормализуем дату операции до начала дня в UTC для корректного сравнения
        const opDateNormalized = new Date(
          Date.UTC(
            opDate.getUTCFullYear(),
            opDate.getUTCMonth(),
            opDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        // Нормализуем даты интервала
        const intervalStartNormalized = new Date(
          Date.UTC(
            interval.start.getUTCFullYear(),
            interval.start.getUTCMonth(),
            interval.start.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        const intervalEndNormalized = new Date(
          Date.UTC(
            interval.end.getUTCFullYear(),
            interval.end.getUTCMonth(),
            interval.end.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        // Для дневных интервалов start и end могут быть одинаковыми (начало дня)
        // В этом случае проверяем, что дата операции совпадает с датой интервала
        if (
          intervalStartNormalized.getTime() === intervalEndNormalized.getTime()
        ) {
          return (
            opDateNormalized.getTime() === intervalStartNormalized.getTime()
          );
        }
        return (
          opDateNormalized >= intervalStartNormalized &&
          opDateNormalized <= intervalEndNormalized
        );
      });
      // Сортируем операции по дате для правильного расчета балансов
      intervalOps.sort(
        (a, b) =>
          new Date(a.operationDate).getTime() -
          new Date(b.operationDate).getTime()
      );
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
    // ВАЖНО: Балансы накапливаются день за днем, показывая изменения по времени
    intervals.forEach((interval, index) => {
      // Получаем операции из текущего интервала (уже отсортированные по дате)
      const currentIntervalOps = operationsByInterval.get(index) || [];

      // Балансы на НАЧАЛО дня (до применения операций этого дня)
      // Для первого дня это баланс после всех исторических операций
      // Для последующих дней это баланс после всех операций предыдущих дней
      const balancesAtStartOfDay = new Map(balanceChanges);

      // Применяем операции из текущего интервала для получения баланса на КОНЕЦ дня
      const balancesAtEndOfDay = new Map(balancesAtStartOfDay);
      currentIntervalOps.forEach((op) => {
        this.applyOperationToBalances(balancesAtEndOfDay, op, accountIdsSet);
      });

      // Конвертируем Map в объект для результата
      // Показываем баланс на КОНЕЦ дня (после всех операций этого дня)
      // ВАЖНО: Включаем ВСЕ счета, даже если у них нет операций в этот день
      // Это позволяет видеть изменения баланса день за днем
      const balancesObj: Record<string, number> = {};
      accounts.forEach((account) => {
        const balance = balancesAtEndOfDay.get(account.id) || 0;
        balancesObj[account.id] = balance;
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
      // Это баланс на КОНЕЦ текущего дня, который станет балансом на НАЧАЛО следующего дня
      currentIntervalOps.forEach((op) => {
        this.applyOperationToBalances(balanceChanges, op, accountIdsSet);
      });
    });

    logger.info('AccountBalances: calculated balances', {
      companyId,
      intervalsCount: intervals.length,
      resultCount: result.length,
      sampleResult: result.slice(0, 3).map((r) => ({
        date: r.date,
        label: r.label,
        accountsCount: Object.keys(r.accounts).length,
        hasOperations: r.hasOperations,
        sampleBalances: Object.entries(r.accounts).slice(0, 2),
      })),
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
