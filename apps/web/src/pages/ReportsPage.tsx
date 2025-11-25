import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { usePermissions } from '../shared/hooks/usePermissions';
import { DateRangePicker } from '../shared/ui/DateRangePicker';
import {
  useGetCashflowReportQuery,
  useGetBddsReportQuery,
} from '../store/api/reportsApi';
import { useGetBudgetsQuery } from '../store/api/budgetsApi';
import { useGetPlansQuery } from '../store/api/plansApi';
import { CashflowTable } from '../widgets/CashflowTable';
import type { Budget, CashflowReport, BDDSReport } from '@fin-u-ch/shared';
import { PeriodFiltersState, PeriodFormat } from '@fin-u-ch/shared';
import {
  getPeriodRange,
  getNextPeriod,
  getPreviousPeriod,
} from '../shared/lib/period';
import { skipToken } from '@reduxjs/toolkit/query';

type ReportType = 'cashflow';

type ReportMode = 'fact' | 'plan' | 'both';

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

export const ReportsPage = () => {
  const [searchParams] = useSearchParams();
  const today = new Date();

  // Читаем тип отчета из URL параметров (используется для будущего расширения)
  const reportType = (searchParams.get('type') as ReportType) || 'cashflow';
  // Suppress unused variable warning - reserved for future use
  void reportType;

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
  const planButtonRef = useRef<HTMLButtonElement>(null);
  const bothButtonRef = useRef<HTMLButtonElement>(null);
  const budgetMenuRef = useRef<HTMLDivElement>(null);

  // Проверка прав на просмотр отчётов
  const { canRead } = usePermissions();

  // Загружаем активные бюджеты (только если есть права на просмотр отчётов)
  const { data: budgets = [] } = useGetBudgetsQuery(
    { status: 'active' },
    { skip: !canRead('reports') }
  );

  // Проверяем наличие планов (только если есть права на просмотр отчётов)
  const { data: plans = [] } = useGetPlansQuery(undefined, {
    skip: !canRead('reports'),
  });
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
    setShowBudgetMenu(false); // Закрываем поповер при переключении режима
    if (mode === 'fact') {
      setSelectedBudget(null);
    } else if (budgets.length > 0 && !selectedBudget) {
      // Если выбран режим с планом, но бюджет не выбран, выбираем первый доступный
      setSelectedBudget(budgets[0]);
    }
  };

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
    // Отправляем полные ISO даты с временем для правильной обработки часовых поясов
    const newRange = {
      from: startDate.toISOString(),
      to: endDate.toISOString(),
    };
    const format = detectPeriodFormat(newRange.from, newRange.to);
    setPeriodFilters({
      format,
      range: newRange,
    });
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

  // Закрываем меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Закрываем меню бюджетов если клик вне кнопок и меню
      if (
        showBudgetMenu &&
        planButtonRef.current &&
        !planButtonRef.current.contains(target) &&
        bothButtonRef.current &&
        !bothButtonRef.current.contains(target) &&
        budgetMenuRef.current &&
        !budgetMenuRef.current.contains(target)
      ) {
        setShowBudgetMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBudgetMenu]);

  // Если нет прав на просмотр, показываем сообщение
  if (!canRead('reports')) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Отчеты
          </h1>
          <Card>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>У вас нет прав для просмотра отчётов</p>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Компактные фильтры */}
        <Card className="flex flex-wrap items-center justify-start gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
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
                startDate={new Date(periodFilters.range.from)}
                endDate={new Date(periodFilters.range.to)}
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

          {/* Режим отчёта */}
          {hasPlans ? (
            <>
              {/* Если есть планы - показываем кнопки режима */}
              <div className="flex items-center gap-1">
                {/* Подпись для десктопа (скрыта на мобильных <640px) */}
                <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400 mr-2">
                  Режим:
                </span>
                {/* Группа кнопок режима */}
                <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleModeChange('fact')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      reportMode === 'fact'
                        ? 'bg-primary-600 text-white dark:bg-primary-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    Факт
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      ref={planButtonRef}
                      onClick={() => {
                        if (reportMode === 'plan') {
                          setShowBudgetMenu(!showBudgetMenu);
                        } else {
                          handleModeChange('plan');
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                        reportMode === 'plan'
                          ? 'bg-primary-600 text-white dark:bg-primary-500'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      План
                      {reportMode === 'plan' && (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    {showBudgetMenu && reportMode === 'plan' && (
                      <div
                        ref={budgetMenuRef}
                        className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[200px] max-h-[300px] overflow-y-auto"
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
                  <div className="relative">
                    <button
                      type="button"
                      ref={bothButtonRef}
                      onClick={() => {
                        if (reportMode === 'both') {
                          setShowBudgetMenu(!showBudgetMenu);
                        } else {
                          handleModeChange('both');
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                        reportMode === 'both'
                          ? 'bg-primary-600 text-white dark:bg-primary-500'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      План-Факт
                      {reportMode === 'both' && (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    {showBudgetMenu && reportMode === 'both' && (
                      <div
                        ref={budgetMenuRef}
                        className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 min-w-[200px] max-h-[300px] overflow-y-auto"
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
              </div>
            </>
          ) : (
            <>
              {/* Если планов нет - показываем только режим "Факт" как disabled кнопка с подсказкой */}
              <div className="flex items-center gap-1 relative group">
                {/* Подпись для десктопа (скрыта на мобильных <640px) */}
                <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400 mr-2">
                  Режим:
                </span>
                {/* Группа кнопок режима (только Факт активен) */}
                <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-0.5">
                  <button
                    type="button"
                    disabled
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-primary-600 text-white dark:bg-primary-500 opacity-75 cursor-not-allowed"
                  >
                    Факт
                  </button>
                </div>
                {/* Tooltip при наведении */}
                <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  💡 Чтобы сравнивать факт с планом, создайте План ДДС в разделе
                  «Бюджеты».
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Контент отчетов */}
        <CashflowTab
          periodFrom={periodFilters.range.from}
          periodTo={periodFilters.range.to}
          periodFormat={periodFilters.format}
          reportMode={reportMode}
          selectedBudget={selectedBudget}
        />
      </div>
    </Layout>
  );
};

// ДДС (факт + план-факт)
const CashflowTab = ({
  periodFrom,
  periodTo,
  periodFormat: _periodFormat,
  reportMode,
  selectedBudget,
}: {
  periodFrom: string;
  periodTo: string;
  periodFormat: 'day' | 'week' | 'month' | 'quarter' | 'year';
  reportMode: ReportMode;
  selectedBudget: Budget | null;
}) => {
  const { canRead } = usePermissions();

  // Загружаем фактические данные только если режим "Факт" или "План-Факт" и есть права
  const shouldLoadFact =
    (reportMode === 'fact' || reportMode === 'both') && canRead('reports');
  const { data, isLoading, error } = useGetCashflowReportQuery(
    shouldLoadFact
      ? {
          periodFrom,
          periodTo,
        }
      : skipToken
  );

  // Загружаем плановые данные только если режим "План" или "План-Факт" и выбран бюджет и есть права
  const shouldLoadPlan =
    (reportMode === 'plan' || reportMode === 'both') &&
    selectedBudget &&
    canRead('reports');
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
