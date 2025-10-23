import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Input } from '../shared/ui/Input';
import {
  useGetCashflowReportQuery,
  useGetBddsReportQuery,
  useGetDdsReportQuery,
} from '../store/api/reportsApi';
import { useGetBudgetsQuery } from '../store/api/budgetsApi';
import { formatMoney } from '../shared/lib/money';
import { toISODate } from '../shared/lib/date';
import { subMonths, startOfMonth } from 'date-fns';
import { CashflowTable } from '../widgets/CashflowTable';
import type { Budget } from '@fin-u-ch/shared';
import { skipToken } from '@reduxjs/toolkit/query';

type ReportType = 'cashflow' | 'dds';

export const ReportsPage = () => {
  const today = new Date();
  const [reportType, setReportType] = useState<ReportType>('cashflow');
  const [periodFrom, setPeriodFrom] = useState(
    toISODate(startOfMonth(subMonths(today, 2)))
  );
  const [periodTo, setPeriodTo] = useState(toISODate(today));
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [showBudgetMenu, setShowBudgetMenu] = useState(false);
  const reportButtonRef = useRef<HTMLButtonElement>(null);
  const budgetButtonRef = useRef<HTMLButtonElement>(null);

  // Загружаем активные бюджеты
  const { data: budgets = [] } = useGetBudgetsQuery({ status: 'active' });

  // Сохраняем выбранный бюджет в localStorage
  useEffect(() => {
    if (selectedBudget) {
      localStorage.setItem('selectedBudgetId', selectedBudget.id);
    } else {
      localStorage.removeItem('selectedBudgetId');
    }
  }, [selectedBudget]);

  // Восстанавливаем выбранный бюджет из localStorage
  useEffect(() => {
    const savedBudgetId = localStorage.getItem('selectedBudgetId');
    if (savedBudgetId && budgets.length > 0) {
      const budget = budgets.find((b) => b.id === savedBudgetId);
      if (budget) {
        setSelectedBudget(budget);
      }
    }
  }, [budgets]);

  const handleReportTypeClick = (type: ReportType) => {
    setReportType(type);
    setShowReportMenu(false);
  };

  const handleBudgetClick = (budget: Budget | null) => {
    setSelectedBudget(budget);
    setShowBudgetMenu(false);
  };

  // Закрываем меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        reportButtonRef.current &&
        !reportButtonRef.current.contains(event.target as Node) &&
        showReportMenu
      ) {
        setShowReportMenu(false);
      }
      if (
        budgetButtonRef.current &&
        !budgetButtonRef.current.contains(event.target as Node) &&
        showBudgetMenu
      ) {
        setShowBudgetMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReportMenu, showBudgetMenu]);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Отчеты
        </h1>

        {/* Фильтры */}
        <Card>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Период с"
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Период по"
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>

            {/* Выбор типа отчета */}
            <div className="flex-shrink-0 relative">
              <button
                ref={reportButtonRef}
                onClick={() => setShowReportMenu(!showReportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <span className="font-medium">
                  {reportType === 'cashflow' ? 'ДДС' : 'ДДС детально'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showReportMenu && (
                <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[200px]">
                  <button
                    onClick={() => handleReportTypeClick('cashflow')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    ДДС
                  </button>
                  <button
                    onClick={() => handleReportTypeClick('dds')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    ДДС детально
                  </button>
                </div>
              )}
            </div>

            {/* Выбор бюджета (только для ДДС) */}
            {reportType === 'cashflow' && (
              <div className="flex-shrink-0 relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  План
                </label>
                <button
                  ref={budgetButtonRef}
                  onClick={() => setShowBudgetMenu(!showBudgetMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-[150px] justify-between"
                >
                  <span className="font-medium">
                    {selectedBudget ? selectedBudget.name : 'Нет'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showBudgetMenu && (
                  <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                    {budgets.map((budget) => (
                      <button
                        key={budget.id}
                        onClick={() => handleBudgetClick(budget)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        {budget.name}
                      </button>
                    ))}
                    <button
                      onClick={() => handleBudgetClick(null)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border-t border-gray-200 dark:border-gray-700"
                    >
                      Нет
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Контент отчетов */}
        {reportType === 'cashflow' && (
          <CashflowTab
            periodFrom={periodFrom}
            periodTo={periodTo}
            selectedBudget={selectedBudget}
          />
        )}
        {reportType === 'dds' && (
          <DDSTab periodFrom={periodFrom} periodTo={periodTo} />
        )}
      </div>
    </Layout>
  );
};

// ДДС (факт + план-факт)
const CashflowTab = ({
  periodFrom,
  periodTo,
  selectedBudget,
}: {
  periodFrom: string;
  periodTo: string;
  selectedBudget: Budget | null;
}) => {
  const { data, isLoading, error } = useGetCashflowReportQuery({
    periodFrom,
    periodTo,
  });

  const { data: planData, isLoading: planLoading } = useGetBddsReportQuery(
    selectedBudget
      ? {
          periodFrom,
          periodTo,
          budgetId: selectedBudget.id,
        }
      : skipToken
  );

  if (isLoading || (selectedBudget && planLoading)) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Загрузка...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-red-600 dark:text-red-400">
          Ошибка загрузки отчета
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Нет данных
        </div>
      </Card>
    );
  }

  return (
    <CashflowTable
      data={data}
      planData={selectedBudget ? planData : undefined}
      showPlan={!!selectedBudget}
      periodFrom={periodFrom}
      periodTo={periodTo}
    />
  );
};

// ДДС детально
const DDSTab = ({
  periodFrom,
  periodTo,
}: {
  periodFrom: string;
  periodTo: string;
}) => {
  const { data, isLoading, error } = useGetDdsReportQuery({
    periodFrom,
    periodTo,
  });

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Загрузка...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-red-600 dark:text-red-400">
          Ошибка загрузки отчета
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Нет данных
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-6">
        {/* Остатки по счетам */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
            Остатки по счетам
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                    Счет
                  </th>
                  <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                    Начальный остаток
                  </th>
                  <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                    Конечный остаток
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((acc) => (
                  <tr
                    key={acc.accountId}
                    className="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                      {acc.accountName}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {formatMoney(acc.openingBalance, 'RUB')}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                      {formatMoney(acc.closingBalance, 'RUB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Поступления */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-400">
            Поступления
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                    Статья
                  </th>
                  <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                    Сумма
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.inflows.map((flow) => (
                  <tr
                    key={flow.articleId}
                    className="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                      {flow.articleName}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">
                      {formatMoney(flow.total, 'RUB')}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold bg-green-50 dark:bg-green-900/20">
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                    Итого поступлений
                  </td>
                  <td className="px-4 py-2 text-right text-green-700 dark:text-green-400">
                    {formatMoney(data.summary.totalInflow, 'RUB')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Выплаты */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-red-700 dark:text-red-400">
            Выплаты
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">
                    Статья
                  </th>
                  <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                    Сумма
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.outflows.map((flow) => (
                  <tr
                    key={flow.articleId}
                    className="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                      {flow.articleName}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">
                      {formatMoney(flow.total, 'RUB')}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold bg-red-50 dark:bg-red-900/20">
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                    Итого выплат
                  </td>
                  <td className="px-4 py-2 text-right text-red-700 dark:text-red-400">
                    {formatMoney(data.summary.totalOutflow, 'RUB')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Итоговый денежный поток */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Чистый денежный поток:
            </span>
            <span
              className={`text-xl font-bold ${
                data.summary.netCashflow >= 0
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {formatMoney(data.summary.netCashflow, 'RUB')}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
