import { useMemo } from 'react';
import { format } from 'date-fns';
import { useGetOperationsQuery } from '../../store/api/operationsApi';
import { PeriodFiltersState } from '../types/period';
import { 
  aggregateDashboardData, 
  formatChartData,
  getAggregationIntervals,
  OperationData,
  AggregatedDataPoint 
} from '../lib/dataAggregation';

export interface UsePeriodDataResult {
  incomeExpenseData: AggregatedDataPoint[];
  accountBalancesData: Array<{ date: string; label: string; [accountId: string]: number | string }>;
  isLoading: boolean;
  error: any;
  totalIncome: number;
  totalExpense: number;
  totalNetProfit: number;
}

/**
 * Хук для работы с данными по периодам
 * Автоматически агрегирует данные в зависимости от выбранного формата периода
 */
export const usePeriodData = (periodFilters: PeriodFiltersState): UsePeriodDataResult => {
  const { data: operations = [], isLoading, error } = useGetOperationsQuery({
    dateFrom: periodFilters.range.from,
    dateTo: periodFilters.range.to,
  });

  const aggregatedData = useMemo(() => {
    const fromDate = new Date(periodFilters.range.from);
    const toDate = new Date(periodFilters.range.to);

    // Всегда создаем интервалы, даже если нет операций
    const intervals = getAggregationIntervals(periodFilters.format, fromDate, toDate);
    
    if (!operations.length) {
      // Создаем пустые данные для всех интервалов
      const emptyData = intervals.map(interval => ({
        date: format(interval.start, 'yyyy-MM-dd'),
        label: interval.label,
        income: 0,
        expense: 0,
        netCashFlow: 0
      }));

      return {
        incomeExpenseData: emptyData,
        accountBalancesData: [],
        totalIncome: 0,
        totalExpense: 0,
        totalNetProfit: 0
      };
    }

    // Преобразуем операции в формат для агрегации
    const operationData: OperationData[] = operations.map(op => ({
      operationDate: op.operationDate,
      amount: op.amount,
      type: op.type === 'income' ? 'income' : 'expense'
    }));

    const { incomeExpenseData, accountBalancesData } = aggregateDashboardData(
      operationData,
      periodFilters.format,
      fromDate,
      toDate
    );


    // Вычисляем общие суммы
    const totalIncome = incomeExpenseData.reduce((sum, point) => sum + point.income, 0);
    const totalExpense = incomeExpenseData.reduce((sum, point) => sum + point.expense, 0);
    const totalNetProfit = totalIncome - totalExpense;

    return {
      incomeExpenseData: formatChartData(incomeExpenseData, periodFilters.format),
      accountBalancesData,
      totalIncome,
      totalExpense,
      totalNetProfit
    };
  }, [operations, periodFilters]);

  return {
    ...aggregatedData,
    isLoading,
    error
  };
};

/**
 * Хук для получения данных конкретного графика
 */
export const useChartData = (
  periodFilters: PeriodFiltersState,
  chartType: 'incomeExpense' | 'accountBalances' | 'weeklyFlow'
) => {
  const periodData = usePeriodData(periodFilters);

  return useMemo(() => {
    switch (chartType) {
      case 'incomeExpense':
        return {
          data: periodData.incomeExpenseData,
          isLoading: periodData.isLoading,
          error: periodData.error
        };
      
      case 'accountBalances':
        return {
          data: periodData.accountBalancesData,
          isLoading: periodData.isLoading,
          error: periodData.error
        };
      
      case 'weeklyFlow':
        // Для weeklyFlow можно использовать те же данные, но с другой группировкой
        return {
          data: periodData.incomeExpenseData,
          isLoading: periodData.isLoading,
          error: periodData.error
        };
      
      default:
        return {
          data: [],
          isLoading: periodData.isLoading,
          error: periodData.error
        };
    }
  }, [periodData, chartType]);
};
