import React, { useMemo, useState, useCallback, useEffect } from 'react';
import type {
  CashflowReport,
  BDDSReport,
  ActivityGroup,
  CashflowBreakdown,
} from '@fin-u-ch/shared';
import { formatNumber } from '../../shared/lib/money';
import { ExportMenu } from '../../shared/ui/ExportMenu';
import { type ExportRow } from '../../shared/lib/exportData';
import { useArticleTree } from '../../shared/hooks/useArticleTree';
import { findArticleInTree, flattenTree } from '../../shared/lib/articleTree';

interface CashflowTableProps {
  data: CashflowReport | BDDSReport;
  planData?: BDDSReport;
  showPlan?: boolean;
  periodFrom: string;
  periodTo: string;
  title?: string;
  articleSearchQuery?: string;
  breakdown?: CashflowBreakdown;
}

interface ExpandedSections {
  [activity: string]: boolean;
}

interface PlanLookups {
  articleMonth: Map<string, number>;
  activityMonth: Map<string, number>;
  monthlyNet: Map<string, number>;
}

const createEmptyLookups = (): PlanLookups => ({
  articleMonth: new Map<string, number>(),
  activityMonth: new Map<string, number>(),
  monthlyNet: new Map<string, number>(),
});

const MONTH_LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  year: '2-digit',
};

export const CashflowTable: React.FC<CashflowTableProps> = ({
  data,
  planData,
  showPlan = false,
  periodFrom,
  periodTo,
  title,
  articleSearchQuery = '',
  breakdown = 'activity',
}) => {
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(
    {}
  );
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(
    new Set()
  );
  const [showDeviation, setShowDeviation] = useState<boolean>(false);

  // Загружаем дерево статей для определения групповых связей
  const { tree: articleTree } = useArticleTree({ isActive: true });

  // Создаем плоский список статей с Map для быстрого поиска
  const articleMap = useMemo(() => {
    const flatArticles = flattenTree(articleTree);
    const map = new Map<
      string,
      { id: string; name: string; parentId?: string | null }
    >();
    flatArticles.forEach((article) => {
      map.set(article.id, {
        id: article.id,
        name: article.name,
        parentId: article.parentId,
      });
    });
    return map;
  }, [articleTree]);

  // Находим статьи, соответствующие поисковому запросу
  const matchedArticleIds = useMemo(() => {
    if (!articleSearchQuery.trim()) {
      return new Set<string>();
    }

    const query = articleSearchQuery.toLowerCase().trim();
    const matched = new Set<string>();

    // Ищем в данных отчета
    const activitiesToSearch = data.activities || [];
    for (const activity of activitiesToSearch) {
      // Ищем в группах доходов
      for (const group of activity.incomeGroups || []) {
        if (group.articleName.toLowerCase().includes(query)) {
          matched.add(group.articleId);
        }
      }
      // Ищем в группах расходов
      for (const group of activity.expenseGroups || []) {
        if (group.articleName.toLowerCase().includes(query)) {
          matched.add(group.articleId);
        }
      }
    }

    // Также ищем в плановых данных
    if (planData?.activities) {
      for (const activity of planData.activities) {
        for (const group of activity.incomeGroups || []) {
          if (group.articleName.toLowerCase().includes(query)) {
            matched.add(group.articleId);
          }
        }
        for (const group of activity.expenseGroups || []) {
          if (group.articleName.toLowerCase().includes(query)) {
            matched.add(group.articleId);
          }
        }
      }
    }

    return matched;
  }, [articleSearchQuery, data.activities, planData]);

  // Определяем, какие группы нужно развернуть
  // Если найдена дочерняя статья, разворачиваем группу, чтобы она была видна
  const getSectionKey = (activity: ActivityGroup): string => {
    // Для разрезов отличных от activity используем key, для activity - activity.activity
    if (breakdown !== 'activity' && activity.key) {
      return activity.key;
    }
    return activity.activity;
  };

  const activitiesToExpand = useMemo(() => {
    if (matchedArticleIds.size === 0) {
      return new Set<string>();
    }

    const activities = new Set<string>();
    const activitiesToSearch = data.activities || [];

    for (const activity of activitiesToSearch) {
      // Проверяем доходы
      for (const group of activity.incomeGroups || []) {
        if (matchedArticleIds.has(group.articleId)) {
          activities.add(getSectionKey(activity));
        }
      }
      // Проверяем расходы
      for (const group of activity.expenseGroups || []) {
        if (matchedArticleIds.has(group.articleId)) {
          activities.add(getSectionKey(activity));
        }
      }
    }

    // Также проверяем плановые данные
    if (planData?.activities) {
      for (const activity of planData.activities) {
        for (const group of activity.incomeGroups || []) {
          if (matchedArticleIds.has(group.articleId)) {
            activities.add(getSectionKey(activity));
          }
        }
        for (const group of activity.expenseGroups || []) {
          if (matchedArticleIds.has(group.articleId)) {
            activities.add(getSectionKey(activity));
          }
        }
      }
    }

    return activities;
  }, [matchedArticleIds, data.activities, planData, breakdown]);

  // Автоматически разворачиваем активности с найденными статьями
  useEffect(() => {
    if (activitiesToExpand.size > 0) {
      setExpandedSections((prev) => {
        const updated = { ...prev };
        activitiesToExpand.forEach((activity) => {
          updated[activity] = true;
        });
        return updated;
      });
    }
  }, [activitiesToExpand]);

  // Автоматически разворачиваем группы статей для найденных дочерних статей
  useEffect(() => {
    if (matchedArticleIds.size > 0) {
      setExpandedArticles((prev) => {
        const newSet = new Set(prev);

        // Для каждой найденной статьи находим всех её родителей и разворачиваем их
        matchedArticleIds.forEach((articleId) => {
          const article = articleMap.get(articleId);
          if (article?.parentId) {
            // Находим всех родителей рекурсивно
            let currentParentId = article.parentId;
            while (currentParentId) {
              newSet.add(currentParentId);
              const parentArticle = articleMap.get(currentParentId);
              currentParentId = parentArticle?.parentId || null;
            }
          }
        });

        return newSet;
      });
    }
  }, [matchedArticleIds, articleMap]);

  const hasFactData = data.activities.length > 0;

  const planActivityMap = useMemo(() => {
    const map = new Map<string, ActivityGroup>();
    if (planData?.activities) {
      for (const activity of planData.activities) {
        map.set(activity.activity, activity);
      }
    }
    return map;
  }, [planData]);

  const toggleSection = (activity: ActivityGroup) => {
    const key = getSectionKey(activity);
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleArticle = (articleId: string) => {
    setExpandedArticles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

  const allMonths = useMemo(() => {
    if (data.activities.length > 0) {
      const firstActivity = data.activities[0];
      if (firstActivity.incomeGroups.length > 0) {
        return firstActivity.incomeGroups[0].months.map((m) => m.month);
      }
      if (firstActivity.expenseGroups.length > 0) {
        return firstActivity.expenseGroups[0].months.map((m) => m.month);
      }
    }

    if (planData && planData.activities && planData.activities.length > 0) {
      const firstPlanActivity = planData.activities[0];
      if (firstPlanActivity.incomeGroups.length > 0) {
        return firstPlanActivity.incomeGroups[0].months.map((m) => m.month);
      }
      if (firstPlanActivity.expenseGroups.length > 0) {
        return firstPlanActivity.expenseGroups[0].months.map((m) => m.month);
      }
    }

    return [];
  }, [data.activities, planData]);

  const planLookups = useMemo<PlanLookups>(() => {
    if (!planData || !planData.activities || planData.activities.length === 0) {
      return createEmptyLookups();
    }

    const articleMonth = new Map<string, number>();
    const activityMonth = new Map<string, number>();
    const monthlyNet = new Map<string, number>();

    for (const month of allMonths) {
      monthlyNet.set(month, 0);
    }

    for (const activity of planData.activities) {
      for (const month of allMonths) {
        activityMonth.set(`${activity.activity}__${month}`, 0);
      }

      for (const group of activity.incomeGroups) {
        for (const { month, amount } of group.months) {
          articleMonth.set(`${group.articleId}__${month}`, amount);
          const activityKey = `${activity.activity}__${month}`;
          activityMonth.set(
            activityKey,
            (activityMonth.get(activityKey) || 0) + amount
          );
          monthlyNet.set(month, (monthlyNet.get(month) || 0) + amount);
        }
      }

      for (const group of activity.expenseGroups) {
        for (const { month, amount } of group.months) {
          articleMonth.set(`${group.articleId}__${month}`, amount);
          const activityKey = `${activity.activity}__${month}`;
          activityMonth.set(
            activityKey,
            (activityMonth.get(activityKey) || 0) - amount
          );
          monthlyNet.set(month, (monthlyNet.get(month) || 0) - amount);
        }
      }
    }

    return { articleMonth, activityMonth, monthlyNet };
  }, [planData, allMonths]);

  const getPlanAmount = useCallback(
    (articleId: string, month: string) => {
      return planLookups.articleMonth.get(`${articleId}__${month}`) ?? 0;
    },
    [planLookups]
  );

  const getPlanActivityNet = useCallback(
    (activity: string, month: string) => {
      return planLookups.activityMonth.get(`${activity}__${month}`) ?? 0;
    },
    [planLookups]
  );

  const getPlanMonthNet = useCallback(
    (month: string) => {
      return planLookups.monthlyNet.get(month) ?? 0;
    },
    [planLookups]
  );

  const columnWidths = useMemo(() => {
    const articleColumnWidth = 240;
    const totalColumnWidth = 120;
    const monthsCount = allMonths.length || 1;
    const monthMultiplier = showPlan ? 2 : 1;
    const baseWidth =
      (1000 - articleColumnWidth - totalColumnWidth) / monthsCount;
    const effectiveMonthWidth = Math.max(
      showPlan ? 200 : 100,
      baseWidth * monthMultiplier
    );

    return {
      article: articleColumnWidth,
      month: effectiveMonthWidth,
      total: totalColumnWidth,
    };
  }, [allMonths.length, showPlan]);

  const subColumnWidth = useMemo(() => {
    return showPlan ? columnWidths.month / 2 : columnWidths.month;
  }, [columnWidths.month, showPlan]);

  const totalNetCashflow = data.activities.reduce(
    (sum, activity) => sum + activity.netCashflow,
    0
  );

  const planTotalNetCashflow = planData?.activities?.reduce(
    (sum, activity) => sum + activity.netCashflow,
    0
  );

  const activitiesToRender = useMemo(() => {
    const allActivities = hasFactData
      ? data.activities
      : planData?.activities || [];

    // Фильтруем разрезы, где все значения нулевые
    return allActivities.filter((activity) => {
      // Проверяем фактические данные
      const hasFactForActivity =
        hasFactData &&
        (activity.netCashflow !== 0 ||
          activity.incomeGroups.some((g) =>
            g.months.some((m) => m.amount !== 0)
          ) ||
          activity.expenseGroups.some((g) =>
            g.months.some((m) => m.amount !== 0)
          ));

      // Проверяем плановые данные
      const planActivity = planActivityMap.get(activity.activity);
      const hasPlanForActivity =
        planActivity &&
        (planActivity.netCashflow !== 0 ||
          planActivity.incomeGroups.some((g) =>
            g.months.some((m) => m.amount !== 0)
          ) ||
          planActivity.expenseGroups.some((g) =>
            g.months.some((m) => m.amount !== 0)
          ));

      // В режиме план-факт показываем, если есть хотя бы факт или план
      // В режиме только факт - только если есть факт
      // В режиме только план - только если есть план
      if (showPlan) {
        return hasFactForActivity || hasPlanForActivity;
      } else if (hasFactData) {
        return hasFactForActivity;
      } else {
        return hasPlanForActivity;
      }
    });
  }, [
    hasFactData,
    data.activities,
    planData?.activities,
    showPlan,
    planActivityMap,
  ]);

  const formatMonthLabel = (month: string) =>
    new Date(`${month}-01`)
      .toLocaleDateString('ru-RU', MONTH_LABEL_OPTIONS)
      .replace('.', '');

  const getActivityDisplayName = (activity: ActivityGroup) => {
    // Для разрезов отличных от activity используем поле name
    if (breakdown !== 'activity' && activity.name) {
      return activity.name;
    }

    // Для activity используем стандартные названия
    const names: Record<string, string> = {
      operating: 'Операционная деятельность',
      investing: 'Инвестиционная деятельность',
      financing: 'Финансовая деятельность',
      unknown: 'Прочие операции',
    };
    return names[activity.activity] || activity.activity;
  };

  const getBreakdownLabel = () => {
    const labels: Record<CashflowBreakdown, string> = {
      activity: 'Вид деятельности',
      deal: 'Сделка',
      account: 'Счет',
      department: 'Подразделение',
      counterparty: 'Контрагент',
    };
    return labels[breakdown] || 'Группа';
  };

  // Функция для построения данных экспорта
  const buildExportRows = useMemo(() => {
    return (): ExportRow[] => {
      const rows: ExportRow[] = [];

      for (const activity of activitiesToRender) {
        // Добавляем строку с итогом по группе
        const activityRow: ExportRow = {
          [getBreakdownLabel()]: getActivityDisplayName(activity),
          Тип: 'Итого',
        };
        for (const month of allMonths) {
          const factNet = hasFactData
            ? activity.incomeGroups.reduce((sum, group) => {
                const monthData = group.months.find((m) => m.month === month);
                return sum + (monthData?.amount || 0);
              }, 0) -
              activity.expenseGroups.reduce((sum, group) => {
                const monthData = group.months.find((m) => m.month === month);
                return sum + (monthData?.amount || 0);
              }, 0)
            : 0;
          const planNet = getPlanActivityNet(activity.activity, month);
          if (showPlan) {
            activityRow[`${formatMonthLabel(month)} (План)`] = planNet;
            activityRow[`${formatMonthLabel(month)} (Факт)`] = factNet;
          } else {
            activityRow[formatMonthLabel(month)] = factNet;
          }
        }
        activityRow['Итого'] = hasFactData
          ? activity.netCashflow
          : (planData?.activities.find((a) => a.activity === activity.activity)
              ?.netCashflow ?? activity.netCashflow);
        rows.push(activityRow);

        // Добавляем строки по статьям доходов
        for (const group of activity.incomeGroups) {
          const articleName = group.articleName;
          const groupRow: ExportRow = {
            [getBreakdownLabel()]: getActivityDisplayName(activity),
            Тип: 'Поступления',
            Статья: articleName,
          };
          for (const month of allMonths) {
            const factAmount = hasFactData
              ? group.months.find((m) => m.month === month)?.amount || 0
              : 0;
            const planAmount = getPlanAmount(group.articleId, month);
            if (showPlan) {
              groupRow[`${formatMonthLabel(month)} (План)`] = planAmount;
              groupRow[`${formatMonthLabel(month)} (Факт)`] = factAmount;
            } else {
              groupRow[formatMonthLabel(month)] = factAmount;
            }
          }
          const total = hasFactData
            ? group.months.reduce((sum, m) => sum + m.amount, 0)
            : 0;
          groupRow['Итого'] = total;
          rows.push(groupRow);
        }

        // Добавляем строки по статьям расходов
        for (const group of activity.expenseGroups) {
          const articleName = group.articleName;
          const groupRow: ExportRow = {
            [getBreakdownLabel()]: getActivityDisplayName(activity),
            Тип: 'Списания',
            Статья: articleName,
          };
          for (const month of allMonths) {
            const factAmount = hasFactData
              ? group.months.find((m) => m.month === month)?.amount || 0
              : 0;
            const planAmount = getPlanAmount(group.articleId, month);
            if (showPlan) {
              groupRow[`${formatMonthLabel(month)} (План)`] = planAmount;
              groupRow[`${formatMonthLabel(month)} (Факт)`] = factAmount;
            } else {
              groupRow[formatMonthLabel(month)] = factAmount;
            }
          }
          const total = hasFactData
            ? group.months.reduce((sum, m) => sum + m.amount, 0)
            : 0;
          groupRow['Итого'] = total;
          rows.push(groupRow);
        }
      }

      return rows;
    };
  }, [
    activitiesToRender,
    allMonths,
    hasFactData,
    showPlan,
    planData,
    getPlanAmount,
    getPlanActivityNet,
    breakdown,
    getBreakdownLabel,
  ]);
  const getActivityColor = (activity: ActivityGroup) => {
    // Для разрезов отличных от activity используем единый цвет
    if (breakdown !== 'activity') {
      return 'bg-purple-50 dark:bg-[#1F1F1F]';
    }
    const colors: Record<string, string> = {
      operating: 'bg-blue-50 dark:bg-[#1F1F1F]',
      investing: 'bg-emerald-50 dark:bg-[#1F1F1F]',
      financing: 'bg-amber-50 dark:bg-[#1F1F1F]',
      unknown: 'bg-gray-50 dark:bg-[#1F1F1F]',
    };
    return colors[activity.activity] || 'bg-gray-50 dark:bg-[#1F1F1F]';
  };

  const getActivityBorderColor = (activity: ActivityGroup) => {
    // Для разрезов отличных от activity используем единый цвет
    if (breakdown !== 'activity') {
      return '#9333EA'; // purple-600
    }
    const colors: Record<string, string> = {
      operating: '#2563EB', // blue-600
      investing: '#047857', // emerald-700
      financing: '#B45309', // amber-600
      unknown: '#6B7280', // gray-500
    };
    return colors[activity.activity] || '#6B7280';
  };

  // Рекурсивная функция для рендеринга статьи и её дочерних статей
  const renderArticleRow = (
    group: (typeof data.activities)[0]['incomeGroups'][0],
    activity: string,
    type: 'income' | 'expense',
    depth: number = 0,
    planGroupMap?: Map<string, (typeof data.activities)[0]['incomeGroups'][0]>
  ): React.ReactNode[] => {
    const planGroup =
      planGroupMap?.get(group.articleId) || (!hasFactData ? group : undefined);
    const articleName = planGroup?.articleName || group.articleName;
    const isMatched = matchedArticleIds.has(group.articleId);
    const hasChildren = group.children && group.children.length > 0;
    const isExpanded = expandedArticles.has(group.articleId);
    const paddingLeft = 10 + depth * 20; // Отступ для вложенности

    const rows: React.ReactNode[] = [];

    // Рендерим саму статью
    rows.push(
      <tr
        key={`${activity}-${type}-${group.articleId}`}
        className={`bg-zinc-50 dark:bg-zinc-900 hover:outline hover:outline-1 hover:outline-white/5 border-b border-gray-200 dark:border-gray-700 transition-all duration-100 ${
          isMatched
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
            : ''
        }`}
      >
        <td
          className={`px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 sticky left-0 bg-zinc-50 dark:bg-zinc-900 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)] ${
            isMatched ? 'bg-yellow-50 dark:bg-yellow-900/20 font-semibold' : ''
          } ${hasChildren ? 'cursor-pointer' : ''}`}
          style={{
            width: `${columnWidths.article}px`,
            paddingLeft: `${paddingLeft}px`,
          }}
          onClick={
            hasChildren ? () => toggleArticle(group.articleId) : undefined
          }
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              <span className="text-gray-600 dark:text-gray-400 font-bold text-base">
                {isExpanded ? '▾' : '▸'}
              </span>
            )}
            {!hasChildren && depth > 0 && (
              <span className="text-gray-400 dark:text-gray-600 w-4">•</span>
            )}
            <span
              className={
                group.hasOperations ? 'font-semibold' : 'font-normal opacity-75'
              }
            >
              {articleName}
            </span>
          </div>
        </td>
        {allMonths.map((month) => {
          const factAmount = hasFactData
            ? group.months.find((m) => m.month === month)?.amount || 0
            : 0;
          const planAmount = getPlanAmount(group.articleId, month);

          if (showPlan) {
            const deviation = factAmount - planAmount;
            return (
              <React.Fragment
                key={`${activity}-${type}-${group.articleId}-${month}`}
              >
                <td
                  className={`px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-500 dark:text-zinc-400 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums align-top ${
                    isMatched ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                  } ${showDeviation && deviation !== 0 ? 'pb-5' : ''}`}
                  style={{
                    minWidth: `${subColumnWidth}px`,
                  }}
                >
                  {planAmount !== 0 && type === 'income' && (
                    <span className="text-green-600 dark:text-green-400 mr-1">
                      ▲
                    </span>
                  )}
                  {planAmount !== 0 && type === 'expense' && (
                    <span className="text-red-600 dark:text-red-400 mr-1">
                      ▼
                    </span>
                  )}
                  {formatNumber(planAmount)}
                </td>
                <td
                  className={`px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-900 dark:text-zinc-200 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums align-top ${
                    isMatched ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                  } ${showDeviation && deviation !== 0 ? 'pb-5' : ''}`}
                  style={{
                    minWidth: `${subColumnWidth}px`,
                  }}
                >
                  <div>
                    {factAmount !== 0 && type === 'income' && (
                      <span className="text-green-600 dark:text-green-400 mr-1">
                        ▲
                      </span>
                    )}
                    {factAmount !== 0 && type === 'expense' && (
                      <span className="text-red-600 dark:text-red-400 mr-1">
                        ▼
                      </span>
                    )}
                    {formatNumber(factAmount)}
                  </div>
                  {showDeviation && deviation !== 0 && (
                    <div
                      className={`text-[11px] mt-1 leading-tight ${
                        deviation > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {deviation > 0 ? '+' : ''}
                      {formatNumber(deviation)}
                    </div>
                  )}
                </td>
              </React.Fragment>
            );
          }

          return (
            <td
              key={`${activity}-${type}-${group.articleId}-${month}`}
              className={`px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-900 dark:text-zinc-200 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums ${
                isMatched ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
              }`}
              style={{
                minWidth: `${columnWidths.month}px`,
              }}
            >
              {factAmount !== 0 && type === 'income' && (
                <span className="text-green-600 dark:text-green-400 mr-1">
                  ▲
                </span>
              )}
              {factAmount !== 0 && type === 'expense' && (
                <span className="text-red-600 dark:text-red-400 mr-1">▼</span>
              )}
              {formatNumber(factAmount)}
            </td>
          );
        })}
        {showPlan ? (
          <>
            <td
              className={`px-4 py-2 text-right text-[13px] font-normal text-gray-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums align-top ${
                isMatched ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
              } ${showDeviation ? 'pb-5' : ''}`}
              style={{
                minWidth: `${subColumnWidth}px`,
              }}
            >
              {(() => {
                const planTotal = planGroup?.total || 0;
                return (
                  <>
                    {planTotal !== 0 && type === 'income' && (
                      <span className="text-green-600 dark:text-green-400 mr-1">
                        ▲
                      </span>
                    )}
                    {planTotal !== 0 && type === 'expense' && (
                      <span className="text-red-600 dark:text-red-400 mr-1">
                        ▼
                      </span>
                    )}
                    {formatNumber(planTotal)}
                  </>
                );
              })()}
            </td>
            <td
              className={`px-4 py-2 text-right text-[13px] font-normal text-gray-900 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900 border-l-2 border-gray-300 dark:border-l dark:border-white/10 whitespace-nowrap tabular-nums align-top ${
                isMatched ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
              } ${showDeviation ? 'pb-5' : ''}`}
              style={{
                minWidth: `${subColumnWidth}px`,
              }}
            >
              {(() => {
                // В режиме план-факт факт всегда из group.total, вычисляем из месяцев если total не определен
                const factTotal = hasFactData
                  ? (group.total ??
                    group.months.reduce((sum, m) => sum + m.amount, 0))
                  : 0;
                const planTotal =
                  planGroup?.total ??
                  (planGroup?.months?.reduce((sum, m) => sum + m.amount, 0) ||
                    0);
                const totalDeviation = factTotal - planTotal;
                return (
                  <>
                    <div>
                      {factTotal !== 0 && type === 'income' && (
                        <span className="text-green-600 dark:text-green-400 mr-1">
                          ▲
                        </span>
                      )}
                      {factTotal !== 0 && type === 'expense' && (
                        <span className="text-red-600 dark:text-red-400 mr-1">
                          ▼
                        </span>
                      )}
                      {formatNumber(factTotal)}
                    </div>
                    {showDeviation && totalDeviation !== 0 && (
                      <div
                        className={`text-[11px] mt-1 leading-tight ${
                          totalDeviation > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {totalDeviation > 0 ? '+' : ''}
                        {formatNumber(totalDeviation)}
                      </div>
                    )}
                  </>
                );
              })()}
            </td>
          </>
        ) : (
          <td
            className={`px-4 py-2 text-right text-[13px] font-normal text-gray-900 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900 border-l-2 border-gray-300 dark:border-l dark:border-white/10 whitespace-nowrap tabular-nums ${
              isMatched ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
            }`}
            style={{
              minWidth: `${columnWidths.total}px`,
            }}
          >
            {(() => {
              const total = hasFactData ? group.total : planGroup?.total || 0;
              return (
                <>
                  {total !== 0 && type === 'income' && (
                    <span className="text-green-600 dark:text-green-400 mr-1">
                      ▲
                    </span>
                  )}
                  {total !== 0 && type === 'expense' && (
                    <span className="text-red-600 dark:text-red-400 mr-1">
                      ▼
                    </span>
                  )}
                  {formatNumber(total)}
                </>
              );
            })()}
          </td>
        )}
      </tr>
    );

    // Рекурсивно рендерим дочерние статьи, если статья развернута
    if (hasChildren && isExpanded && group.children) {
      for (const child of group.children) {
        rows.push(
          ...renderArticleRow(child, activity, type, depth + 1, planGroupMap)
        );
      }
    }

    return rows;
  };

  const renderMonthlyCells = (
    params: {
      month: string;
      activityKey: string;
      factValue: number;
      planValue: number;
    },
    key?: string
  ) => {
    const { month, factValue, planValue, activityKey } = params;
    const cellKey = key ?? `${activityKey}-${month}`;

    if (showPlan) {
      const deviation = factValue - planValue;
      return (
        <React.Fragment key={cellKey}>
          <td
            className={`px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-500 dark:text-zinc-400 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums align-top ${showDeviation && deviation !== 0 ? 'pb-5' : ''}`}
            style={{ minWidth: `${subColumnWidth}px` }}
          >
            {formatNumber(planValue)}
          </td>
          <td
            className={`px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-900 dark:text-zinc-200 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums align-top ${showDeviation && deviation !== 0 ? 'pb-5' : ''}`}
            style={{ minWidth: `${subColumnWidth}px` }}
          >
            <div>{formatNumber(factValue)}</div>
            {showDeviation && deviation !== 0 && (
              <div
                className={`text-[11px] mt-1 leading-tight ${
                  deviation > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {deviation > 0 ? '+' : ''}
                {formatNumber(deviation)}
              </div>
            )}
          </td>
        </React.Fragment>
      );
    }

    return (
      <td
        key={cellKey}
        className="px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-900 dark:text-zinc-200 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums"
        style={{ minWidth: `${columnWidths.month}px` }}
      >
        {formatNumber(factValue)}
      </td>
    );
  };

  // Если нет данных для отображения, показываем сообщение
  if (activitiesToRender.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-xl max-w-full">
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {title || 'Отчет о движении денежных средств'}:{' '}
            {new Date(periodFrom).toLocaleDateString('ru-RU')} —{' '}
            {new Date(periodTo).toLocaleDateString('ru-RU')}
          </div>
        </div>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium mb-2">Нет данных для отображения</p>
          <p className="text-sm">
            За выбранный период отсутствуют операции с ненулевыми значениями
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-xl max-w-full">
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title || 'Отчет о движении денежных средств'}:{' '}
          {new Date(periodFrom).toLocaleDateString('ru-RU')} —{' '}
          {new Date(periodTo).toLocaleDateString('ru-RU')}
        </div>
        <div className="flex items-center gap-2">
          {showPlan && (
            <button
              type="button"
              onClick={() => setShowDeviation(!showDeviation)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors border ${
                showDeviation
                  ? 'bg-primary-600 text-white border-primary-600 dark:bg-primary-500 dark:border-primary-500'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Показать отклонение
            </button>
          )}
          <ExportMenu
            filenameBase={`cashflow_${periodFrom}_${periodTo}`}
            buildRows={buildExportRows}
            entity="reports"
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto overflow-y-visible max-h-[calc(100vh-380px)] md:max-h-[80vh]">
        <table className="w-full border-collapse relative table-auto bg-zinc-50 dark:bg-zinc-900">
          <thead className="sticky top-0 z-30">
            <tr className="bg-zinc-100 dark:bg-zinc-800 border-b border-gray-300 dark:border-gray-700">
              <th
                className="px-4 py-3 text-left text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider sticky left-0 bg-zinc-100 dark:bg-zinc-800 z-40 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.3)]"
                style={{ width: `${columnWidths.article}px` }}
              >
                ГЛАВНЫЙ РАЗРЕЗ
              </th>
              {allMonths.map((month) => (
                <th
                  key={month}
                  colSpan={showPlan ? 2 : 1}
                  className="px-2 py-3 text-center text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wide border-l border-gray-300 dark:border-gray-700 whitespace-nowrap"
                  style={{ minWidth: `${columnWidths.month}px` }}
                >
                  {formatMonthLabel(month).toUpperCase()}
                </th>
              ))}
              <th
                className="px-4 py-3 text-right text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 border-l-2 border-gray-300 dark:border-gray-700 whitespace-nowrap"
                style={{ minWidth: `${columnWidths.total}px` }}
                colSpan={showPlan ? 2 : 1}
              >
                ИТОГО
              </th>
            </tr>
            {showPlan && (
              <tr className="bg-zinc-100 dark:bg-zinc-800 border-b border-gray-300 dark:border-gray-700">
                <th className="sticky left-0 bg-zinc-100 dark:bg-zinc-800 z-40 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.3)]"></th>
                {allMonths.map((month) => (
                  <React.Fragment key={`${month}-subcol`}>
                    <th
                      className="px-2 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap border-l border-gray-300 dark:border-gray-700"
                      style={{ minWidth: `${subColumnWidth}px` }}
                    >
                      План
                    </th>
                    <th
                      className="px-2 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap border-l border-gray-300 dark:border-gray-700"
                      style={{ minWidth: `${subColumnWidth}px` }}
                    >
                      Факт
                    </th>
                  </React.Fragment>
                ))}
                <th
                  className="px-2 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap border-l border-gray-300 dark:border-gray-700"
                  style={{ minWidth: `${subColumnWidth}px` }}
                >
                  План
                </th>
                <th
                  className="px-2 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap border-l border-gray-300 dark:border-gray-700"
                  style={{ minWidth: `${subColumnWidth}px` }}
                >
                  Факт
                </th>
              </tr>
            )}
          </thead>
          <tbody className="text-sm bg-zinc-50 dark:bg-zinc-900">
            {activitiesToRender.map((activity) => {
              // Для плановых данных используем activity.activity для поиска (даже для других разрезов)
              // так как BDDS группируется только по activity
              const planActivity = planActivityMap.get(activity.activity);
              const planSource: ActivityGroup | undefined =
                planActivity || (!hasFactData ? activity : undefined);

              const activityColor = getActivityColor(activity);
              const borderColor = getActivityBorderColor(activity);
              const sectionKey = getSectionKey(activity);
              return (
                <React.Fragment key={sectionKey}>
                  <tr
                    className={`${activityColor} cursor-pointer border-b border-gray-200 dark:border-gray-700 border-t border-gray-200 dark:border-t dark:border-white/5 transition-all duration-150 hover:outline hover:outline-1 hover:outline-white/5`}
                    onClick={() => toggleSection(activity)}
                    style={{ borderLeft: `3px solid ${borderColor}` }}
                  >
                    <td
                      className={`px-4 py-2 font-semibold text-sm text-gray-900 dark:text-zinc-50 sticky left-0 ${activityColor} z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]`}
                      style={{
                        width: `${columnWidths.article}px`,
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-600 dark:text-gray-400 font-bold text-base">
                          {expandedSections[getSectionKey(activity)]
                            ? '▾'
                            : '▸'}
                        </span>
                        <span className="font-semibold">
                          {getActivityDisplayName(activity)}
                        </span>
                      </div>
                    </td>
                    {allMonths.map((month) => {
                      const incomeTotal = activity.incomeGroups.reduce(
                        (sum, group) => {
                          const monthData = group.months.find(
                            (m) => m.month === month
                          );
                          return sum + (monthData?.amount || 0);
                        },
                        0
                      );
                      const expenseTotal = activity.expenseGroups.reduce(
                        (sum, group) => {
                          const monthData = group.months.find(
                            (m) => m.month === month
                          );
                          return sum + (monthData?.amount || 0);
                        },
                        0
                      );
                      const factNet = hasFactData
                        ? incomeTotal - expenseTotal
                        : 0;
                      const planNet = getPlanActivityNet(
                        activity.activity,
                        month
                      );

                      return renderMonthlyCells(
                        {
                          month,
                          activityKey: activity.activity,
                          factValue: factNet,
                          planValue: planNet,
                        },
                        `${activity.activity}-summary-${month}`
                      );
                    })}
                    {showPlan ? (
                      <>
                        <td
                          className={`px-4 py-2 text-right text-[13px] font-normal text-gray-500 dark:text-zinc-400 ${activityColor} border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums`}
                          style={{
                            minWidth: `${subColumnWidth}px`,
                          }}
                        >
                          {formatNumber(planSource?.netCashflow ?? 0)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right text-[13px] font-normal text-gray-900 dark:text-zinc-200 ${activityColor} border-l-2 border-gray-300 dark:border-l dark:border-white/10 whitespace-nowrap tabular-nums`}
                          style={{
                            minWidth: `${subColumnWidth}px`,
                          }}
                        >
                          {formatNumber(hasFactData ? activity.netCashflow : 0)}
                        </td>
                      </>
                    ) : (
                      <td
                        className={`px-4 py-2 text-right text-[13px] font-normal text-gray-900 dark:text-zinc-200 ${activityColor} border-l-2 border-gray-300 dark:border-l dark:border-white/10 whitespace-nowrap tabular-nums`}
                        style={{
                          minWidth: `${columnWidths.total}px`,
                        }}
                      >
                        {formatNumber(
                          hasFactData
                            ? activity.netCashflow
                            : (planSource?.netCashflow ?? activity.netCashflow)
                        )}
                      </td>
                    )}
                  </tr>

                  {expandedSections[getSectionKey(activity)] && (
                    <>
                      {(() => {
                        const incomePlanGroups = planSource?.incomeGroups ?? [];
                        const incomePlanMap = new Map(
                          incomePlanGroups.map((group) => [
                            group.articleId,
                            group,
                          ])
                        );
                        const incomeGroupsToRender = hasFactData
                          ? activity.incomeGroups
                          : incomePlanGroups;

                        return incomeGroupsToRender
                          .map((group) => {
                            return renderArticleRow(
                              group,
                              activity.activity,
                              'income',
                              0,
                              incomePlanMap
                            );
                          })
                          .flat();
                      })()}

                      {(() => {
                        const expensePlanGroups =
                          planSource?.expenseGroups ?? [];
                        const expensePlanMap = new Map(
                          expensePlanGroups.map((group) => [
                            group.articleId,
                            group,
                          ])
                        );
                        const expenseGroupsToRender = hasFactData
                          ? activity.expenseGroups
                          : expensePlanGroups;

                        return expenseGroupsToRender
                          .map((group) => {
                            return renderArticleRow(
                              group,
                              activity.activity,
                              'expense',
                              0,
                              expensePlanMap
                            );
                          })
                          .flat();
                      })()}
                    </>
                  )}
                </React.Fragment>
              );
            })}

            <tr className="border-t-2 border-zinc-400 dark:border-zinc-500 bg-indigo-100 dark:bg-[#232336]">
              <td
                className="px-4 py-4 font-semibold text-[15px] text-indigo-900 dark:text-white sticky left-0 bg-indigo-100 dark:bg-[#232336] z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                style={{ width: `${columnWidths.article}px` }}
              >
                Общий денежный поток
              </td>
              {allMonths.map((month) => {
                const factTotal = data.activities.reduce((sum, activity) => {
                  const incomeTotal = activity.incomeGroups.reduce(
                    (incomeSum, group) => {
                      const monthData = group.months.find(
                        (m) => m.month === month
                      );
                      return incomeSum + (monthData?.amount || 0);
                    },
                    0
                  );
                  const expenseTotal = activity.expenseGroups.reduce(
                    (expenseSum, group) => {
                      const monthData = group.months.find(
                        (m) => m.month === month
                      );
                      return expenseSum + (monthData?.amount || 0);
                    },
                    0
                  );
                  return sum + (incomeTotal - expenseTotal);
                }, 0);

                const planTotal = getPlanMonthNet(month);

                if (showPlan) {
                  const deviation = factTotal - planTotal;
                  return (
                    <React.Fragment key={`totals-${month}`}>
                      <td
                        className={`px-3 py-4 text-right text-sm font-semibold text-indigo-900 dark:text-white border-l border-gray-300 dark:border-gray-600 whitespace-nowrap tabular-nums bg-indigo-100 dark:bg-[#232336] align-top ${showDeviation && deviation !== 0 ? 'pb-6' : ''}`}
                        style={{ minWidth: `${subColumnWidth}px` }}
                      >
                        {formatNumber(planTotal)}
                      </td>
                      <td
                        className={`px-3 py-4 text-right text-sm font-semibold text-indigo-900 dark:text-white border-l border-gray-300 dark:border-gray-600 whitespace-nowrap tabular-nums bg-indigo-100 dark:bg-[#232336] align-top ${showDeviation && deviation !== 0 ? 'pb-6' : ''}`}
                        style={{ minWidth: `${subColumnWidth}px` }}
                      >
                        <div>{formatNumber(factTotal)}</div>
                        {showDeviation && deviation !== 0 && (
                          <div
                            className={`text-[11px] mt-1 leading-tight ${
                              deviation > 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {deviation > 0 ? '+' : ''}
                            {formatNumber(deviation)}
                          </div>
                        )}
                      </td>
                    </React.Fragment>
                  );
                }

                return (
                  <td
                    key={`totals-${month}`}
                    className="px-3 py-4 text-right text-sm font-semibold text-indigo-900 dark:text-white border-l border-gray-300 dark:border-gray-600 whitespace-nowrap tabular-nums bg-indigo-100 dark:bg-[#232336]"
                    style={{ minWidth: `${columnWidths.month}px` }}
                  >
                    {formatNumber(factTotal)}
                  </td>
                );
              })}
              {showPlan ? (
                <>
                  <td
                    className="px-4 py-4 text-right text-sm font-semibold text-indigo-900 dark:text-white bg-indigo-100 dark:bg-[#232336] border-l border-gray-300 dark:border-gray-600 whitespace-nowrap tabular-nums"
                    style={{
                      minWidth: `${subColumnWidth}px`,
                    }}
                  >
                    {formatNumber(planTotalNetCashflow ?? 0)}
                  </td>
                  <td
                    className="px-4 py-4 text-right text-sm font-semibold text-indigo-900 dark:text-white bg-indigo-100 dark:bg-[#232336] border-l-2 border-gray-300 dark:border-l dark:border-white/10 whitespace-nowrap tabular-nums"
                    style={{
                      minWidth: `${subColumnWidth}px`,
                    }}
                  >
                    {formatNumber(hasFactData ? totalNetCashflow : 0)}
                  </td>
                </>
              ) : (
                <td
                  className="px-4 py-4 text-right text-sm font-semibold text-indigo-900 dark:text-white bg-indigo-100 dark:bg-[#232336] border-l-2 border-gray-300 dark:border-l dark:border-white/10 whitespace-nowrap tabular-nums"
                  style={{
                    minWidth: `${columnWidths.total}px`,
                  }}
                >
                  {formatNumber(
                    hasFactData
                      ? totalNetCashflow
                      : (planTotalNetCashflow ?? totalNetCashflow)
                  )}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
