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
import { toISODate } from '../shared/lib/date';
import { usePermissions } from '../shared/hooks/usePermissions';
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

// Автоматически определяет формат периода для API (как группировать данные)
const detectPeriodFormat = (from: string, to: string): PeriodFormat => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const daysDiff =
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) +
    1;

  // Для периодов до 31 дня - показываем каждый день
  if (daysDiff <= 31) {
    return 'day';
  }
  // Для 32-93 дней - показываем по месяцам
  else if (daysDiff <= 93) {
    return 'month';
  }
  // Для более 93 дней - показываем по месяцам или кварталам
  else if (daysDiff <= 365) {
    return 'month';
  } else {
    return 'quarter';
  }
};

// Определяет тип навигации (как переключаться между периодами)
const detectNavigationFormat = (from: string, to: string): PeriodFormat => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const daysDiff =
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) +
    1;

  if (daysDiff === 1) {
    return 'day';
  } else if (daysDiff >= 2 && daysDiff <= 8) {
    // Неделя может быть 7-8 дней из-за погрешностей вычисления
    return 'week';
  } else if (daysDiff >= 9 && daysDiff <= 32) {
    return 'month';
  } else if (daysDiff >= 33 && daysDiff <= 93) {
    return 'quarter';
  } else {
    return 'year';
  }
};

export const DashboardPage = () => {
  const today = new Date();
  const { canRead } = usePermissions();

  // Инициализируем фильтры периода с текущим месяцем
  const [periodFilters, setPeriodFilters] = useState<PeriodFiltersState>(() => {
    const currentMonth = getPeriodRange(today, 'month');
    return {
      format: 'month',
      range: currentMonth,
    };
  });

  // Проверяем права на просмотр различных виджетов
  const canViewOperations = canRead('operations');
  const canViewReports = canRead('reports');
  const canViewAccounts = canRead('accounts');

  // Получаем данные дашборда из API (только если есть права на просмотр)
  // Обработчики навигации по периодам
  const handlePreviousPeriod = () => {
    // Определяем навигационный формат (как переключаться)
    const navFormat = detectNavigationFormat(
      periodFilters.range.from,
      periodFilters.range.to
    );

    const newRange = getPreviousPeriod(periodFilters.range, navFormat);
    const newFormat = detectPeriodFormat(newRange.from, newRange.to);
    setPeriodFilters({
      format: newFormat,
      range: newRange,
    });
  };

  const handleNextPeriod = () => {
    // Определяем навигационный формат (как переключаться)
    const navFormat = detectNavigationFormat(
      periodFilters.range.from,
      periodFilters.range.to
    );

    const newRange = getNextPeriod(periodFilters.range, navFormat);
    const newFormat = detectPeriodFormat(newRange.from, newRange.to);
    setPeriodFilters({
      format: newFormat,
      range: newRange,
    });
  };

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    // Нормализуем даты до начала дня, чтобы избежать проблем с часовыми поясами
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    // Отправляем даты в формате YYYY-MM-DD (используем локальное время, а не UTC)
    const newRange = {
      from: toISODate(start),
      to: toISODate(end),
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
  } = useGetDashboardQuery(
    {
      periodFrom: periodFilters.range.from,
      periodTo: periodFilters.range.to,
      mode: 'both',
      periodFormat: periodFilters.format, // Передаем формат периода
    },
    { skip: !canViewOperations && !canViewReports }
  );

  // Получаем накопительные данные для графика поступлений/списаний
  const { data: cumulativeData, isLoading: cumulativeLoading } =
    useGetCumulativeCashFlowQuery(
      {
        periodFrom: periodFilters.range.from,
        periodTo: periodFilters.range.to,
        mode: 'both',
        periodFormat: periodFilters.format,
      },
      { skip: !canViewOperations && !canViewReports }
    );

  // Получаем последние операции (только если есть права на просмотр операций)
  const { data: operations = [] } = useGetOperationsQuery(
    {
      dateFrom: periodFilters.range.from,
      dateTo: periodFilters.range.to,
    },
    { skip: !canViewOperations }
  );

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
            {canViewReports && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* График поступлений/списаний/чистого потока */}
                <IncomeExpenseChart data={incomeExpenseData} />

                {/* График динамики поступлений и списаний */}
                <WeeklyFlowChart data={weeklyFlowData} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* График остатков на счетах */}
              {canViewAccounts && (
                <AccountBalancesChart
                  data={accountBalancesData}
                  accounts={dashboardData?.accounts || []}
                />
              )}

              {/* Таблица последних операций */}
              {canViewOperations && (
                <RecentOperationsTable operations={operations} />
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};
