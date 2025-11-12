import { useState } from 'react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { PeriodFilters } from '../shared/ui/PeriodFilters';
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
import { PeriodFiltersState } from '@fin-u-ch/shared';
import { getPeriodRange } from '../shared/lib/period';
import { usePermissions } from '../shared/hooks/usePermissions';

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
        [accountName: string]: string | number;
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
        operations: series.operations,
        hasOperations: series.hasOperations,
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Дашборд
          </h1>
        </div>

        {/* Фильтры периода */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <PeriodFilters value={periodFilters} onChange={setPeriodFilters} />
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
            {/* Карточки с показателями */}
            {canViewOperations && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Поступления */}
                <Card className="bg-white dark:bg-gray-800 border-l-4 border-l-green-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Поступления
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {formatMoney(dashboardData.summary.income)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        за период {periodFilters.range.from} -{' '}
                        {periodFilters.range.to}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-green-600 dark:text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4"
                        />
                      </svg>
                    </div>
                  </div>
                </Card>

                {/* Списания */}
                <Card className="bg-white dark:bg-gray-800 border-l-4 border-l-red-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Списания
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {formatMoney(dashboardData.summary.expense)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        за период {periodFilters.range.from} -{' '}
                        {periodFilters.range.to}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-red-600 dark:text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 17h8m0 0V9m0 8l-8-8-4 4"
                        />
                      </svg>
                    </div>
                  </div>
                </Card>

                {/* Чистый поток */}
                <Card className="bg-white dark:bg-gray-800 border-l-4 border-l-blue-500 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Чистый поток
                      </div>
                      <div
                        className={`text-2xl font-bold mb-1 ${
                          dashboardData.summary.netProfit >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {dashboardData.summary.netProfit >= 0 ? '+' : ''}
                        {formatMoney(dashboardData.summary.netProfit)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        за период {periodFilters.range.from} -{' '}
                        {periodFilters.range.to}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                  </div>
                </Card>
              </div>
            )}

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
