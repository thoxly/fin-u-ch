import {
  startOfDay,
  endOfDay,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  isWithinInterval,
  format,
} from 'date-fns';
import { PeriodFormat } from '@fin-u-ch/shared';
import {
  getAggregationIntervals as getIntervals,
  createDefaultIntervals as createIntervals,
} from './dateIntervals';

export interface AggregatedDataPoint {
  date: string;
  label: string;
  income: number;
  expense: number;
  netCashFlow: number;
}

export interface OperationData {
  operationDate: string;
  amount: number;
  type: 'income' | 'expense';
  [key: string]: unknown;
}

export interface AccountBalanceData {
  date: string;
  accountId: string;
  balance: number;
  [key: string]: unknown;
}

/**
 * Агрегирует операции по интервалам (динамика потока за каждый интервал)
 */
export const aggregateOperationsByIntervals = (
  operations: OperationData[],
  intervals: Array<{ start: Date; end: Date; label: string }>
): AggregatedDataPoint[] => {
  return intervals.map((interval) => {
    const intervalOperations = operations.filter((op) => {
      // Создаем дату операции в местном времени (без времени)
      const opDate = new Date(op.operationDate);
      const opDateLocal = new Date(
        opDate.getFullYear(),
        opDate.getMonth(),
        opDate.getDate()
      );

      // Используем даты интервала напрямую, так как они уже созданы с startOfDay/endOfDay
      const intervalStart = interval.start;
      const intervalEnd = interval.end;

      // Проверяем, что дата операции находится в интервале (включительно)
      const isWithin =
        opDateLocal >= intervalStart && opDateLocal <= intervalEnd;

      return isWithin;
    });

    const intervalIncome = intervalOperations
      .filter((op) => op.type === 'income')
      .reduce((sum, op) => sum + op.amount, 0);

    const intervalExpense = intervalOperations
      .filter((op) => op.type === 'expense')
      .reduce((sum, op) => sum + op.amount, 0);

    const result = {
      date: format(interval.start, 'yyyy-MM-dd'),
      label: interval.label,
      income: intervalIncome,
      expense: intervalExpense,
      netCashFlow: intervalIncome - intervalExpense,
    };

    console.log(`Interval ${interval.label}:`, result);
    return result;
  });
};

/**
 * Получает данные за предыдущий период (без пересечения с текущим)
 */
export const getPreviousPeriodData = (
  operations: OperationData[],
  _periodFormat: PeriodFormat,
  fromDate: Date
): { income: number; expense: number; netCashFlow: number } => {
  let previousPeriodStart: Date;
  let previousPeriodEnd: Date;

  // Чётко обрезаем предыдущий период, чтобы не пересекаться с текущим
  const currentPeriodStart = startOfDay(fromDate);

  // Определяем предыдущий период в зависимости от формата
  switch (_periodFormat) {
    case 'week': {
      previousPeriodEnd = endOfDay(addDays(currentPeriodStart, -1));
      previousPeriodStart = startOfDay(addWeeks(previousPeriodEnd, -1));
      break;
    }
    case 'month': {
      previousPeriodEnd = endOfDay(addDays(currentPeriodStart, -1));
      previousPeriodStart = startOfDay(addMonths(previousPeriodEnd, -1));
      break;
    }
    case 'quarter': {
      previousPeriodEnd = endOfDay(addDays(currentPeriodStart, -1));
      previousPeriodStart = startOfDay(addQuarters(previousPeriodEnd, -1));
      break;
    }
    case 'year': {
      previousPeriodEnd = endOfDay(addDays(currentPeriodStart, -1));
      previousPeriodStart = startOfDay(addYears(previousPeriodEnd, -1));
      break;
    }
    default: {
      previousPeriodEnd = endOfDay(addDays(currentPeriodStart, -1));
      previousPeriodStart = startOfDay(addDays(previousPeriodEnd, -30));
    }
  }

  // Фильтруем операции за предыдущий период
  const previousPeriodOperations = operations.filter((op) => {
    const opDate = new Date(op.operationDate);
    return isWithinInterval(opDate, {
      start: previousPeriodStart,
      end: previousPeriodEnd,
    });
  });

  // Считаем суммы за предыдущий период
  const income = previousPeriodOperations
    .filter((op) => op.type === 'income')
    .reduce((sum, op) => sum + op.amount, 0);

  const expense = previousPeriodOperations
    .filter((op) => op.type === 'expense')
    .reduce((sum, op) => sum + op.amount, 0);

  return {
    income,
    expense,
    netCashFlow: income - expense,
  };
};

/**
 * Агрегирует остатки по счетам по интервалам
 */
export const aggregateAccountBalancesByIntervals = (
  balances: AccountBalanceData[],
  intervals: Array<{ start: Date; end: Date; label: string }>
): Array<{
  date: string;
  label: string;
  [accountId: string]: number | string;
}> => {
  return intervals.map((interval) => {
    const intervalBalances = balances.filter((balance) => {
      const balanceDate = new Date(balance.date);
      return isWithinInterval(balanceDate, {
        start: interval.start,
        end: interval.end,
      });
    });

    // Группируем по счетам и берем последний баланс для каждого счета в интервале
    const accountBalances: Record<string, number> = {};
    intervalBalances.forEach((balance) => {
      accountBalances[balance.accountId] = balance.balance;
    });

    return {
      date: format(interval.start, 'yyyy-MM-dd'),
      label: interval.label,
      ...accountBalances,
    };
  });
};

/**
 * Основная функция для агрегации данных дашборда
 */
export const aggregateDashboardData = (
  operations: OperationData[],
  _periodFormat: PeriodFormat,
  fromDate: Date,
  toDate: Date,
  getAggregationIntervals?: (
    periodFormat: PeriodFormat,
    fromDate: Date,
    toDate: Date,
    operationCount: number
  ) => Array<{ start: Date; end: Date; label: string }>,
  createDefaultIntervals?: (
    periodFormat: PeriodFormat,
    fromDate: Date,
    toDate: Date
  ) => Array<{ start: Date; end: Date; label: string }>
): {
  incomeExpenseData: AggregatedDataPoint[];
  accountBalancesData: Array<{
    date: string;
    label: string;
    [accountId: string]: number | string;
  }>;
} => {
  // Если функции не переданы, используем импортированные функции
  if (!getAggregationIntervals || !createDefaultIntervals) {
    getAggregationIntervals = getIntervals;
    createDefaultIntervals = createIntervals;
  }

  // Для месяца всегда используем интервалы по дням
  // Для других периодов используем умную логику
  const intervals =
    _periodFormat === 'month'
      ? getAggregationIntervals(
          _periodFormat,
          fromDate,
          toDate,
          operations.length
        )
      : createDefaultIntervals(_periodFormat, fromDate, toDate);

  // Агрегируем операции по интервалам (динамика потока)
  const incomeExpenseData = aggregateOperationsByIntervals(
    operations,
    intervals
  );

  // Для остатков по счетам пока используем заглушку
  // В реальном приложении здесь будет логика получения остатков
  const accountBalancesData: Array<{
    date: string;
    label: string;
    [accountId: string]: number | string;
  }> = [];

  return {
    incomeExpenseData,
    accountBalancesData,
  };
};
