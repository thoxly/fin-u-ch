import { useState } from 'react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { DateRangePicker } from '../shared/ui/DateRangePicker';
import { IncomeExpenseChart } from '../shared/ui/IncomeExpenseChart';
import { WeeklyFlowChart } from '../shared/ui/WeeklyFlowChart';
import { AccountBalancesChart } from '../shared/ui/AccountBalancesChart';
import { RecentOperationsTable } from '../shared/ui/RecentOperationsTable';
import CardSkeleton from '../shared/ui/CardSkeleton';
import {
  useGetDashboardQuery,
  useGetCumulativeCashFlowQuery,
} from '../store/api/reportsApi';
import { useGetOperationsQuery } from '../store/api/operationsApi';
import { formatMoney } from '../shared/lib/money';
import { PeriodFiltersState, PeriodFormat } from '@fin-u-ch/shared';
import {
  getPeriodRange,
  getNextPeriod,
  getPreviousPeriod,
} from '../shared/lib/period';
import {
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// Автоматически определяет формат периода на основе диапазона дат
const detectPeriodFormat = (from: string, to: string): PeriodFormat => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const daysDiff =
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) +
    1;

  if (daysDiff === 1) {
    return 'day';
  } else if (daysDiff <= 7) {
    return 'week';
  } else if (daysDiff <= 31) {
    return 'month';
  } else if (daysDiff <= 93) {
    return 'quarter';
  } else {
    return 'year';
  }
};

export const DashboardPage = () => {
  const today = new Date();

  // Инициализируем фильтры периода с текущим месяцем
  const [periodFilters, setPeriodFilters] = useState<PeriodFiltersState>(() => {
    const currentMonth = getPeriodRange(today, 'month');
    return {
      format: 'month',
      range: currentMonth,
    };
  });

  // Обработчики навигации по периодам
  const handlePreviousPeriod = () => {
    const format = detectPeriodFormat(
      periodFilters.range.from,
      periodFilters.range.to
    );
    const newRange = getPreviousPeriod(periodFilters.range, format);
    const newFormat = detectPeriodFormat(newRange.from, newRange.to);
    setPeriodFilters({
      format: newFormat,
      range: newRange,
    });
  };

  const handleNextPeriod = () => {
    const format = detectPeriodFormat(
      periodFilters.range.from,
      periodFilters.range.to
    );
    const newRange = getNextPeriod(periodFilters.range, format);
    const newFormat = detectPeriodFormat(newRange.from, newRange.to);
    setPeriodFilters({
      format: newFormat,
      range: newRange,
    });
  };

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    const formatDateForAPI = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const newRange = {
      from: formatDateForAPI(startDate),
      to: formatDateForAPI(endDate),
    };
    const format = detectPeriodFormat(newRange.from, newRange.to);
    setPeriodFilters({
      format,
      range: newRange,
    });
  };

  // Получаем данные дашборда из API
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useGetDashboardQuery({
    periodFrom: periodFilters.range.from,
    periodTo: periodFilters.range.to,
    mode: 'both',
    periodFormat: periodFilters.format, // Передаем формат периода
  });

  // Получаем накопительные данные для графика поступлений/списаний
  const { data: cumulativeData, isLoading: cumulativeLoading } =
    useGetCumulativeCashFlowQuery({
      periodFrom: periodFilters.range.from,
      periodTo: periodFilters.range.to,
      mode: 'both',
      periodFormat: periodFilters.format,
    });

  // Получаем последние операции
  const { data: operations = [] } = useGetOperationsQuery({
    dateFrom: periodFilters.range.from,
    dateTo: periodFilters.range.to,
  });

  // Трансформируем данные для графиков
  const incomeExpenseData = cumulativeData?.cumulativeSeries || [];
  const weeklyFlowData = dashboardData?.incomeExpenseSeries || [];

  const accountBalancesData =
    dashboardData?.accountBalancesSeries.map((series) => {
      const result: {
        date: string;
        label: string;
        [key: string]:
          | string
          | number
          | boolean
          | Array<{
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
            }>
          | undefined;
        operations?: Array<{
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
        hasOperations?: boolean;
      } = {
        date: series.date,
        label: series.label,
        ...('operations' in series && {
          operations: (
            series as typeof series & {
              operations?: Array<{
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
            }
          ).operations,
        }),
        ...('hasOperations' in series && {
          hasOperations: (series as typeof series & { hasOperations?: boolean })
            .hasOperations,
        }),
      };

      // Добавляем данные по каждому счету
      Object.entries(series.accounts).forEach(([accountId, balance]) => {
        const account = dashboardData?.accounts.find(
          (acc) => acc.id === accountId
        );
        const accountName = account?.name || accountId;
        result[accountName] = balance;
      });

      return result;
    }) || [];

  const startDate = periodFilters.range.from
    ? new Date(periodFilters.range.from)
    : new Date();
  const endDate = periodFilters.range.to
    ? new Date(periodFilters.range.to)
    : new Date();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Дашборд
          </h1>
        </div>

        {/* Компактная панель: фильтр периода + метрики */}
        <Card className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Навигация и фильтр периода */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Кнопка "Назад" */}
            <button
              type="button"
              onClick={handlePreviousPeriod}
              className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              aria-label="Предыдущий период"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Фильтр периода */}
            <div className="flex-shrink-0">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={handleDateRangeChange}
              />
            </div>

            {/* Кнопка "Вперёд" */}
            <button
              type="button"
              onClick={handleNextPeriod}
              className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              aria-label="Следующий период"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Метрики в виде мини-карточек */}
          {dashboardData && (
            <div className="flex items-center gap-4 flex-wrap">
              {/* Поступления */}
              <div className="flex items-center gap-1 text-sm">
                {/* Иконка для мобильных */}
                <ArrowDownCircleIcon className="w-5 h-5 text-green-500 dark:text-green-400 sm:hidden" />
                {/* Текст для десктопа */}
                <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
                  Поступления:
                </span>
                <span className="font-semibold text-green-500 dark:text-green-400">
                  {formatMoney(dashboardData.summary.income)}
                </span>
              </div>

              {/* Списания */}
              <div className="flex items-center gap-1 text-sm">
                {/* Иконка для мобильных */}
                <ArrowUpCircleIcon className="w-5 h-5 text-red-500 dark:text-red-400 sm:hidden" />
                {/* Текст для десктопа */}
                <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
                  Списания:
                </span>
                <span className="font-semibold text-red-500 dark:text-red-400">
                  {formatMoney(dashboardData.summary.expense)}
                </span>
              </div>

              {/* Чистый поток */}
              <div className="flex items-center gap-1 text-sm">
                {/* Иконка для мобильных */}
                <ChartBarIcon
                  className={`w-5 h-5 sm:hidden ${
                    dashboardData.summary.netProfit >= 0
                      ? 'text-blue-500 dark:text-blue-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                />
                {/* Текст для десктопа */}
                <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
                  Чистый поток:
                </span>
                <span
                  className={`font-semibold ${
                    dashboardData.summary.netProfit >= 0
                      ? 'text-blue-500 dark:text-blue-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {dashboardData.summary.netProfit >= 0 ? '+' : ''}
                  {formatMoney(dashboardData.summary.netProfit)}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Loading state */}
        {(isLoading || cumulativeLoading) && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CardSkeleton size="md" lines={2} />
              <CardSkeleton size="md" lines={2} />
              <CardSkeleton size="md" lines={2} />
            </div>
            <CardSkeleton size="lg" lines={4} />
            <CardSkeleton size="lg" lines={6} />
          </>
        )}

        {/* Error state */}
        {error && (
          <Card>
            <div className="text-red-600 dark:text-red-400">
              Ошибка загрузки данных. Попробуйте обновить страницу.
            </div>
          </Card>
        )}

        {/* Dashboard data */}
        {dashboardData && (
          <>
            {/* Графики и таблицы */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* График поступлений/списаний/чистого потока */}
              <IncomeExpenseChart data={incomeExpenseData} />

              {/* График динамики поступлений и списаний */}
              <WeeklyFlowChart data={weeklyFlowData} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* График остатков на счетах */}
              <AccountBalancesChart
                data={accountBalancesData}
                accounts={dashboardData?.accounts || []}
              />

              {/* Таблица последних операций */}
              <RecentOperationsTable operations={operations} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};
