import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { PeriodFilters } from '../shared/ui/PeriodFilters';
import { Select } from '../shared/ui/Select';
import {
  useGetCashflowReportQuery,
  useGetBddsReportQuery,
  useGetDdsReportQuery,
} from '../store/api/reportsApi';
import { useGetBudgetsQuery } from '../store/api/budgetsApi';
import { useGetPlansQuery } from '../store/api/plansApi';
import { formatNumber } from '../shared/lib/money';
import { CashflowTable } from '../widgets/CashflowTable';
import type { Budget, CashflowReport, BDDSReport } from '@fin-u-ch/shared';
import { PeriodFiltersState } from '@fin-u-ch/shared';
import { getPeriodRange } from '../shared/lib/period';
import { skipToken } from '@reduxjs/toolkit/query';

type ReportType = 'cashflow' | 'dds';

type ReportMode = 'fact' | 'plan' | 'both';

export const ReportsPage = () => {
  const [searchParams] = useSearchParams();
  const today = new Date();

  // Читаем тип отчета из URL параметров
  const reportType = (searchParams.get('type') as ReportType) || 'cashflow';

  // Инициализируем фильтры периода
  const [periodFilters, setPeriodFilters] = useState<PeriodFiltersState>(() => {
    const currentYear = getPeriodRange(today, 'year');
    return {
      format: 'year',
      range: currentYear,
    };
  });

  const [reportMode, setReportMode] = useState<ReportMode>('fact');
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showBudgetMenu, setShowBudgetMenu] = useState(false);
  const budgetButtonRef = useRef<HTMLButtonElement>(null);

  // Загружаем активные бюджеты
  const { data: budgets = [] } = useGetBudgetsQuery({ status: 'active' });

  // Проверяем наличие планов
  const { data: plans = [] } = useGetPlansQuery();
  const hasPlans = plans.length > 0;

  // Если планов нет, принудительно устанавливаем режим "Факт"
  useEffect(() => {
    if (!hasPlans && reportMode !== 'fact') {
      setReportMode('fact');
      setSelectedBudget(null);
    }
  }, [hasPlans, reportMode]);

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
        if (hasPlans) {
          setReportMode('both');
        }
      }
    }
  }, [budgets, hasPlans]);

  const handleBudgetClick = (budget: Budget | null) => {
    setSelectedBudget(budget);
    setShowBudgetMenu(false);
  };

  const handleModeChange = (mode: ReportMode) => {
    setReportMode(mode);
    if (mode === 'fact') {
      setSelectedBudget(null);
    } else if (budgets.length > 0 && !selectedBudget) {
      // Если выбран режим с планом, но бюджет не выбран, выбираем первый доступный
      setSelectedBudget(budgets[0]);
    }
  };

  // Автоматически устанавливаем даты плана при выборе бюджета
  useEffect(() => {
    if (selectedBudget) {
      const startDate = new Date(selectedBudget.startDate);
      const endDate = selectedBudget.endDate
        ? new Date(selectedBudget.endDate)
        : new Date(startDate.getFullYear(), 11, 31); // До конца года

      const newRange = {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      };
      setPeriodFilters((prev) => ({
        ...prev,
        range: newRange,
      }));
    }
  }, [selectedBudget]);

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
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="space-y-4">
            {/* Базовые фильтры периода */}
            <PeriodFilters value={periodFilters} onChange={setPeriodFilters} />

            {/* Режим отчёта */}
            <div className="flex flex-wrap gap-4 items-end pt-2 border-t border-gray-200 dark:border-gray-700">
              {hasPlans ? (
                <>
                  {/* Если есть планы - показываем селектор режима */}
                  <div className="w-48">
                    <Select
                      label="Режим"
                      value={reportMode}
                      onChange={(e) =>
                        handleModeChange(e.target.value as ReportMode)
                      }
                      options={[
                        { value: 'fact', label: 'Факт' },
                        { value: 'plan', label: 'План' },
                        { value: 'both', label: 'План-Факт' },
                      ]}
                    />
                  </div>

                  {/* Селектор бюджета (показывается только если режим не "Факт") */}
                  {reportMode !== 'fact' && (
                    <div className="relative flex-1 min-w-[200px]">
                      <label className="label mb-1">План</label>
                      <div className="relative">
                        <button
                          ref={budgetButtonRef}
                          onClick={() => setShowBudgetMenu(!showBudgetMenu)}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors justify-between"
                        >
                          <span className="font-medium">
                            {selectedBudget
                              ? selectedBudget.name
                              : 'Выберите бюджет'}
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
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Если планов нет - показываем только режим "Факт" как disabled селектор с подсказкой */}
                  <div className="w-48 relative group">
                    <Select
                      label="Режим"
                      value="fact"
                      disabled
                      options={[{ value: 'fact', label: 'Факт' }]}
                    />
                    {/* Tooltip при наведении */}
                    <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                      💡 Чтобы сравнивать факт с планом, создайте План ДДС в
                      разделе «Бюджеты».
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Контент отчетов */}
        {reportType === 'cashflow' && (
          <CashflowTab
            periodFrom={periodFilters.range.from}
            periodTo={periodFilters.range.to}
            periodFormat={periodFilters.format}
            reportMode={reportMode}
            selectedBudget={selectedBudget}
          />
        )}
        {reportType === 'dds' && (
          <DDSTab
            periodFrom={periodFilters.range.from}
            periodTo={periodFilters.range.to}
          />
        )}
      </div>
    </Layout>
  );
};

// ДДС (факт + план-факт)
const CashflowTab = ({
  periodFrom,
  periodTo,
  periodFormat,
  reportMode,
  selectedBudget,
}: {
  periodFrom: string;
  periodTo: string;
  periodFormat: 'day' | 'week' | 'month' | 'quarter' | 'year';
  reportMode: ReportMode;
  selectedBudget: Budget | null;
}) => {
  // Загружаем фактические данные только если режим "Факт" или "План-Факт"
  const shouldLoadFact = reportMode === 'fact' || reportMode === 'both';
  const { data, isLoading, error } = useGetCashflowReportQuery(
    shouldLoadFact
      ? {
          periodFrom,
          periodTo,
        }
      : skipToken
  );

  // Загружаем плановые данные только если режим "План" или "План-Факт" и выбран бюджет
  const shouldLoadPlan =
    (reportMode === 'plan' || reportMode === 'both') && selectedBudget;
  const { data: planData, isLoading: planLoading } = useGetBddsReportQuery(
    shouldLoadPlan
      ? {
          periodFrom,
          periodTo,
          budgetId: selectedBudget!.id,
        }
      : skipToken
  );

  // Определяем состояние загрузки
  const isLoadingData =
    (shouldLoadFact && isLoading) || (shouldLoadPlan && planLoading);

  if (isLoadingData) {
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

  // Определяем какие данные показывать в зависимости от режима
  let displayData: CashflowReport | null = null;
  let displayPlanData: BDDSReport | undefined = undefined;
  let showPlanColumns = false;

  if (reportMode === 'plan') {
    // В режиме "План" показываем только плановые данные
    if (planData) {
      // Преобразуем BDDSReport в CashflowReport
      displayData = {
        periodFrom: planData.periodFrom,
        periodTo: planData.periodTo,
        activities: planData.activities,
      };
      displayPlanData = undefined;
      showPlanColumns = false;
    }
  } else if (reportMode === 'fact') {
    // В режиме "Факт" показываем только фактические данные
    displayData = data || null;
    displayPlanData = undefined;
    showPlanColumns = false;
  } else if (reportMode === 'both') {
    // В режиме "План-Факт" показываем оба
    displayData = data || null;
    displayPlanData = planData;
    showPlanColumns = !!selectedBudget && !!planData;
  }

  // Если нет данных для отображения
  if (!displayData) {
    return (
      <Card>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Нет данных для отображения</p>
          <p className="text-sm mt-2">
            Период: {periodFrom} - {periodTo}
          </p>
          <p className="text-sm">
            Режим:{' '}
            {reportMode === 'fact'
              ? 'Факт'
              : reportMode === 'plan'
                ? 'План'
                : 'План-Факт'}
          </p>
          {reportMode !== 'fact' && (
            <p className="text-sm">
              План: {selectedBudget?.name || 'Не выбран'}
            </p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <CashflowTable
      data={displayData}
      planData={displayPlanData}
      showPlan={showPlanColumns}
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
          <table className="w-full border-collapse text-sm">
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
              {data.accounts.map((account) => {
                const balanceChange =
                  account.closingBalance - account.openingBalance;
                const totalIncome = balanceChange > 0 ? balanceChange : 0;
                const totalExpense =
                  balanceChange < 0 ? Math.abs(balanceChange) : 0;

                return (
                  <tr key={account.accountId} className="border-b">
                    <td className="px-4 py-2">{account.accountName}</td>
                    <td className="px-4 py-2 text-right">
                      {formatNumber(account.openingBalance)}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">
                      {formatNumber(totalIncome)}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">
                      {formatNumber(totalExpense)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatNumber(account.closingBalance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};
