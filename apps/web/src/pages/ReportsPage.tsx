import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const today = new Date();

  // Читаем тип отчета из URL параметров
  const reportType = (searchParams.get('type') as ReportType) || 'cashflow';

  const [periodFrom, setPeriodFrom] = useState(
    toISODate(startOfMonth(subMonths(today, 2)))
  );
  const [periodTo, setPeriodTo] = useState(toISODate(today));
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [showBudgetMenu, setShowBudgetMenu] = useState(false);
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
        setShowPlan(true);
      }
    }
  }, [budgets]);

  const handleBudgetClick = (budget: Budget | null) => {
    setSelectedBudget(budget);
    setShowBudgetMenu(false);
  };

  const handlePlanCheckboxChange = (checked: boolean) => {
    setShowPlan(checked);
    if (!checked) {
      setSelectedBudget(null);
    } else if (budgets.length > 0 && !selectedBudget) {
      // Если план включен, но бюджет не выбран, выбираем первый доступный
      setSelectedBudget(budgets[0]);
    }
  };

  // Автоматически устанавливаем даты плана при выборе бюджета
  useEffect(() => {
    if (selectedBudget && showPlan) {
      const startDate = new Date(selectedBudget.startDate);
      const endDate = selectedBudget.endDate
        ? new Date(selectedBudget.endDate)
        : new Date(startDate.getFullYear(), 11, 31); // До конца года

      setPeriodFrom(startDate.toISOString().split('T')[0]);
      setPeriodTo(endDate.toISOString().split('T')[0]);
    }
  }, [selectedBudget, showPlan]);

  // Refs для dropdown меню
  const budgetMenuRef = useRef<HTMLDivElement>(null);

  // Закрываем меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Закрываем меню бюджетов если клик вне кнопки и меню
      if (
        showBudgetMenu &&
        budgetButtonRef.current &&
        !budgetButtonRef.current.contains(target) &&
        budgetMenuRef.current &&
        !budgetMenuRef.current.contains(target)
      ) {
        setShowBudgetMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBudgetMenu]);

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

            {/* Чекбокс "План" */}
            <div className="flex-shrink-0 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPlan}
                  onChange={(e) => handlePlanCheckboxChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  План
                </span>
              </label>

              {/* Селектор бюджета (показывается только если план включен) */}
              {showPlan && (
                <div className="relative">
                  <button
                    ref={budgetButtonRef}
                    onClick={() => setShowBudgetMenu(!showBudgetMenu)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-[150px] justify-between"
                  >
                    <span className="font-medium">
                      {selectedBudget ? selectedBudget.name : 'Выберите бюджет'}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showBudgetMenu && (
                    <div
                      ref={budgetMenuRef}
                      className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[200px] max-h-[300px] overflow-y-auto"
                    >
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
          </div>
        </Card>

        {/* Контент отчетов */}
        {reportType === 'cashflow' && (
          <CashflowTab
            periodFrom={periodFrom}
            periodTo={periodTo}
            selectedBudget={selectedBudget}
            showPlan={showPlan}
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
  showPlan,
}: {
  periodFrom: string;
  periodTo: string;
  selectedBudget: Budget | null;
  showPlan: boolean;
}) => {
  const { data, isLoading, error } = useGetCashflowReportQuery({
    periodFrom,
    periodTo,
  });

  const { data: planData, isLoading: planLoading } = useGetBddsReportQuery(
    selectedBudget && showPlan
      ? {
          periodFrom,
          periodTo,
          budgetId: selectedBudget.id,
        }
      : skipToken
  );

  if (isLoading || (showPlan && selectedBudget && planLoading)) {
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
          <p>Ошибка загрузки отчета</p>
          <p className="text-sm mt-2">Детали: {error.toString()}</p>
        </div>
      </Card>
    );
  }

  // Если нет фактических данных, но есть плановые данные - показываем таблицу
  if (!data && (!showPlan || !selectedBudget || !planData)) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Нет данных для отображения</p>
          <p className="text-sm mt-2">
            Период: {periodFrom} - {periodTo}
          </p>
          <p className="text-sm">
            План: {showPlan ? selectedBudget?.name || 'Не выбран' : 'Отключен'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <CashflowTable
      data={data || { activities: [] }}
      planData={showPlan && selectedBudget ? planData : undefined}
      showPlan={showPlan && !!selectedBudget}
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
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Детальный денежный поток
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Период: {new Date(periodFrom).toLocaleDateString('ru-RU')} —{' '}
          {new Date(periodTo).toLocaleDateString('ru-RU')}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-2 text-left border-b">Счет</th>
                <th className="px-4 py-2 text-right border-b">
                  Начальный остаток
                </th>
                <th className="px-4 py-2 text-right border-b">Поступления</th>
                <th className="px-4 py-2 text-right border-b">Списания</th>
                <th className="px-4 py-2 text-right border-b">
                  Конечный остаток
                </th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((account) => (
                <tr key={account.accountId} className="border-b">
                  <td className="px-4 py-2">{account.accountName}</td>
                  <td className="px-4 py-2 text-right">
                    {formatMoney(account.openingBalance, account.currency)}
                  </td>
                  <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">
                    {formatMoney(account.totalIncome, account.currency)}
                  </td>
                  <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">
                    {formatMoney(account.totalExpense, account.currency)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {formatMoney(account.closingBalance, account.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};
