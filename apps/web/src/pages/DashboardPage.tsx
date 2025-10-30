import { useEffect, useMemo, useState } from 'react';
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
import {
  useGetAccountsQuery,
  useGetArticlesQuery,
} from '../store/api/catalogsApi';
import { useHighContrast } from '../shared/hooks/useHighContrast';
import type { Article } from '@shared/types/catalogs';

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

  // Получаем накопительные данные для графика доходов/расходов
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

  // Справочники: счета и статьи
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: articles = [] } = useGetArticlesQuery();
  const [highContrast, setHighContrast] = useHighContrast();

  // Фильтры счетов и категорий (сохранение в сессии)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
    try {
      const v = sessionStorage.getItem('dashboard.selectedAccounts');
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>(() => {
    try {
      const v = sessionStorage.getItem('dashboard.selectedArticles');
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  });

  // Сохраняем выбор в сессии
  useEffect(() => {
    try {
      sessionStorage.setItem(
        'dashboard.selectedAccounts',
        JSON.stringify(selectedAccountIds)
      );
    } catch {
      // ignore storage errors (private mode or disabled storage)
    }
  }, [selectedAccountIds]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        'dashboard.selectedArticles',
        JSON.stringify(selectedArticleIds)
      );
    } catch {
      // ignore storage errors (private mode or disabled storage)
    }
  }, [selectedArticleIds]);

  // Применяем фильтры к операциям
  const filteredOperations = useMemo(() => {
    if (!operations || operations.length === 0) return [] as typeof operations;

    const accountFilterActive = selectedAccountIds.length > 0;
    const articleFilterActive = selectedArticleIds.length > 0;

    return operations.filter((op) => {
      // Типы доход/расход/перевод
      const isIncome = op.type === 'income';
      const isExpense = op.type === 'expense';

      // Фильтр по статьям применяем только к доходам/расходам
      if (articleFilterActive && (isIncome || isExpense)) {
        if (!op.article?.id) return false;
        if (!selectedArticleIds.includes(op.article.id)) return false;
      }

      // Фильтр по счетам: учитываем accountId для доход/расход,
      // а для переводов учитываем source/target
      if (accountFilterActive) {
        const ids = new Set(selectedAccountIds);
        if (isIncome || isExpense) {
          if (!op.accountId || !ids.has(op.accountId)) return false;
        } else {
          const match =
            (op.sourceAccountId && ids.has(op.sourceAccountId)) ||
            (op.targetAccountId && ids.has(op.targetAccountId));
          if (!match) return false;
        }
      }

      return true;
    });
  }, [operations, selectedAccountIds, selectedArticleIds]);

  // Трансформируем данные для графиков
  const incomeExpenseData = cumulativeData?.cumulativeSeries || [];
  // Для динамики поступлений/списаний используем агрегирование из отфильтрованных операций
  const weeklyFlowData = useMemo(() => {
    // Простая агрегация по метке из API (label), если она есть в operations
    // Если нет, группируем по дате операции (YYYY-MM-DD)
    const map = new Map<
      string,
      { label: string; income: number; expense: number }
    >();
    for (const op of filteredOperations) {
      const date = op.date.split('T')[0];
      const label = date;
      const entry = map.get(label) || { label, income: 0, expense: 0 };
      if (op.type === 'income') entry.income += op.amount;
      if (op.type === 'expense') entry.expense += op.amount;
      map.set(label, entry);
    }
    return Array.from(map.values()).map((v) => ({
      date: v.label,
      label: v.label,
      income: v.income,
      expense: v.expense,
      netCashFlow: v.income - v.expense,
    }));
  }, [filteredOperations]);

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

  // Применяем фильтр выбранных счетов к графику остатков (если выбран хотя бы один)
  const filteredAccountBalancesData = useMemo(() => {
    if (!accountBalancesData.length) return accountBalancesData;
    if (selectedAccountIds.length === 0) return accountBalancesData;
    const allowedNames = new Set(
      accounts
        .filter((a) => selectedAccountIds.includes(a.id))
        .map((a) => a.name)
    );
    return accountBalancesData.map((point) => {
      const filtered: Record<string, unknown> = {
        date: point.date,
        label: point.label,
      };
      for (const key of Object.keys(point)) {
        if (
          key === 'date' ||
          key === 'label' ||
          key === 'operations' ||
          key === 'hasOperations'
        )
          continue;
        if (allowedNames.has(key)) {
          filtered[key] = (point as Record<string, unknown>)[key];
        }
      }
      // сохраняем операции/флаги если были
      const op = (point as Record<string, unknown>)['operations'];
      if (op) (filtered['operations'] as unknown) = op as unknown;
      const hasOps = (point as Record<string, unknown>)['hasOperations'];
      if (hasOps !== undefined) filtered['hasOperations'] = hasOps as unknown;
      return filtered as typeof point;
    });
  }, [accountBalancesData, accounts, selectedAccountIds]);

  // Сводные показатели
  const summary = useMemo(() => {
    const totalIncome = filteredOperations
      .filter((op) => op.type === 'income')
      .reduce((s, op) => s + op.amount, 0);
    const totalExpense = filteredOperations
      .filter((op) => op.type === 'expense')
      .reduce((s, op) => s + op.amount, 0);
    const net = totalIncome - totalExpense;

    // Минимальный/максимальный суммарный остаток по выбранным счетам
    let minBalance = 0;
    let maxBalance = 0;
    if (filteredAccountBalancesData.length > 0) {
      const sums = filteredAccountBalancesData.map((point) => {
        let sum = 0;
        for (const key of Object.keys(point)) {
          if (
            key === 'date' ||
            key === 'label' ||
            key === 'operations' ||
            key === 'hasOperations'
          )
            continue;
          const val = (point as Record<string, unknown>)[key];
          if (typeof val === 'number') sum += val;
        }
        return sum;
      });
      minBalance = Math.min(...sums);
      maxBalance = Math.max(...sums);
    }

    return { totalIncome, totalExpense, net, minBalance, maxBalance };
  }, [filteredOperations, filteredAccountBalancesData]);

  // Экспорт CSV
  const handleExport = () => {
    const rows = [
      ['date', 'account_or_category', 'amount', 'type'],
      ...filteredOperations.map((op) => [
        op.date.split('T')[0],
        op.article?.name || op.account?.name || '-',
        String(op.amount),
        op.type,
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-data_${periodFilters.range.from}_${periodFilters.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <div className="p-2 md:p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <PeriodFilters
                  value={periodFilters}
                  onChange={setPeriodFilters}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600"
                >
                  Экспорт CSV
                </button>
                <button
                  onClick={() => setHighContrast(!highContrast)}
                  className="px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600"
                >
                  {highContrast ? 'Обычная палитра' : 'Высокий контраст'}
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Фильтр счетов и статей */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-2 md:p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Счета
                </div>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((acc) => {
                    const checked =
                      selectedAccountIds.length === 0 ||
                      selectedAccountIds.includes(acc.id);
                    return (
                      <label
                        key={acc.id}
                        className="inline-flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSelectedAccountIds((prev) => {
                              // Если пусто = считаем что выбраны все; при первом клике сформируем список
                              const base =
                                prev.length === 0
                                  ? accounts.map((a) => a.id)
                                  : prev;
                              if (isChecked)
                                return Array.from(new Set([...base, acc.id]));
                              return base.filter((id) => id !== acc.id);
                            });
                          }}
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          {acc.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Категории
                </div>
                <div className="flex flex-wrap gap-2">
                  {articles.map((art: Article) => (
                    <label
                      key={art.id}
                      className="inline-flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedArticleIds.length === 0 ||
                          selectedArticleIds.includes(art.id)
                        }
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setSelectedArticleIds((prev) => {
                            const base =
                              prev.length === 0
                                ? articles.map((a) => a.id)
                                : prev;
                            if (isChecked)
                              return Array.from(new Set([...base, art.id]));
                            return base.filter((id) => id !== art.id);
                          });
                        }}
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        {art.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Доходы */}
              <Card className="bg-white dark:bg-gray-800 border-l-4 border-l-green-500 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Поступления
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {formatMoney(summary.totalIncome)}
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

              {/* Расходы */}
              <Card className="bg-white dark:bg-gray-800 border-l-4 border-l-red-500 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Списания
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {formatMoney(summary.totalExpense)}
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
                        summary.net >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {summary.net >= 0 ? '+' : ''}
                      {formatMoney(summary.net)}
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

              {/* Мин/Макс остаток */}
              <Card className="bg-white dark:bg-gray-800 border-l-4 border-l-amber-500 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Остатки (мин/макс)
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white mb-1">
                      Мин: {formatMoney(summary.minBalance)}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      Макс: {formatMoney(summary.maxBalance)}
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-amber-600 dark:text-amber-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v8m-4-4h8"
                      />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>

            {/* Графики и таблицы */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* График доходов/расходов/чистого потока */}
              <IncomeExpenseChart data={incomeExpenseData} />

              {/* График динамики поступлений и списаний */}
              <WeeklyFlowChart data={weeklyFlowData} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* График остатков на счетах */}
              <AccountBalancesChart
                data={filteredAccountBalancesData}
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
