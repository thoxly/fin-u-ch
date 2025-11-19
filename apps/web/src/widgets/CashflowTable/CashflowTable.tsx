import React, { useMemo, useState } from 'react';
import type {
  CashflowReport,
  BDDSReport,
  ActivityGroup,
} from '@fin-u-ch/shared';
import { formatNumber } from '../../shared/lib/money';

interface CashflowTableProps {
  data: CashflowReport | BDDSReport;
  planData?: BDDSReport;
  showPlan?: boolean;
  periodFrom: string;
  periodTo: string;
  title?: string;
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
}) => {
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(
    {}
  );
  const [draggedActivity, setDraggedActivity] = useState<string | null>(null);
  const [dragOverActivity, setDragOverActivity] = useState<string | null>(null);
  const [activityOrder, setActivityOrder] = useState<string[]>([]);

  const hasFactData = data.activities.length > 0;

  const activitiesToRender = hasFactData
    ? data.activities
    : planData?.activities || [];

  // Initialize activity order on first render or when activities change
  React.useEffect(() => {
    const currentActivities = activitiesToRender.map((a) => a.activity);
    if (
      activityOrder.length === 0 ||
      !currentActivities.every((a) => activityOrder.includes(a))
    ) {
      setActivityOrder(currentActivities);
    }
  }, [data.activities, planData?.activities]);

  const toggleSection = (activity: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [activity]: !prev[activity],
    }));
  };

  const handleDragStart = (e: React.DragEvent, activity: string) => {
    e.stopPropagation();
    setDraggedActivity(activity);
    e.dataTransfer.effectAllowed = 'move';
    // Add a semi-transparent drag image
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedActivity(null);
    setDragOverActivity(null);
  };

  const handleDragOver = (e: React.DragEvent, activity: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedActivity && draggedActivity !== activity) {
      setDragOverActivity(activity);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverActivity(null);
  };

  const handleDrop = (e: React.DragEvent, targetActivity: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedActivity || draggedActivity === targetActivity) {
      setDraggedActivity(null);
      setDragOverActivity(null);
      return;
    }

    const newOrder = [...activityOrder];
    const draggedIndex = newOrder.indexOf(draggedActivity);
    const targetIndex = newOrder.indexOf(targetActivity);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove dragged item and insert at target position
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedActivity);
      setActivityOrder(newOrder);
    }

    setDraggedActivity(null);
    setDragOverActivity(null);
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

  const planActivityMap = useMemo(() => {
    const map = new Map<string, ActivityGroup>();
    if (planData?.activities) {
      for (const activity of planData.activities) {
        map.set(activity.activity, activity);
      }
    }
    return map;
  }, [planData]);

  const getPlanAmount = (articleId: string, month: string) => {
    return planLookups.articleMonth.get(`${articleId}__${month}`) ?? 0;
  };

  const getPlanActivityNet = (activity: string, month: string) => {
    return planLookups.activityMonth.get(`${activity}__${month}`) ?? 0;
  };

  const getPlanMonthNet = (month: string) => {
    return planLookups.monthlyNet.get(month) ?? 0;
  };

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

  const cumulativeBalances = useMemo(() => {
    let balance = 0;
    return allMonths.map((month) => {
      const monthTotal = data.activities.reduce((sum, activity) => {
        const incomeTotal = activity.incomeGroups.reduce((incomeSum, group) => {
          const monthData = group.months.find((m) => m.month === month);
          return incomeSum + (monthData?.amount || 0);
        }, 0);
        const expenseTotal = activity.expenseGroups.reduce(
          (expenseSum, group) => {
            const monthData = group.months.find((m) => m.month === month);
            return expenseSum + (monthData?.amount || 0);
          },
          0
        );
        return sum + (incomeTotal - expenseTotal);
      }, 0);
      balance += monthTotal;
      return { month, balance };
    });
  }, [allMonths, data.activities]);

  const planCumulativeBalances = useMemo(() => {
    if (!planData || !planData.activities || allMonths.length === 0) {
      return [] as Array<{ month: string; balance: number }>;
    }

    let balance = 0;
    return allMonths.map((month) => {
      balance += getPlanMonthNet(month);
      return { month, balance };
    });
  }, [planData, allMonths, planLookups, getPlanMonthNet]);

  const totalNetCashflow = data.activities.reduce(
    (sum, activity) => sum + activity.netCashflow,
    0
  );

  const planTotalNetCashflow = planData?.activities?.reduce(
    (sum, activity) => sum + activity.netCashflow,
    0
  );

  // Sort activities according to the user-defined order
  const sortedActivities = useMemo(() => {
    if (activityOrder.length === 0) return activitiesToRender;

    return [...activitiesToRender].sort((a, b) => {
      const indexA = activityOrder.indexOf(a.activity);
      const indexB = activityOrder.indexOf(b.activity);

      // If activity not in order, place it at the end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }, [activitiesToRender, activityOrder]);

  const formatMonthLabel = (month: string) =>
    new Date(`${month}-01`)
      .toLocaleDateString('ru-RU', MONTH_LABEL_OPTIONS)
      .replace('.', '');

  const getActivityDisplayName = (activity: string) => {
    const names: Record<string, string> = {
      operating: 'Операционная деятельность',
      investing: 'Инвестиционная деятельность',
      financing: 'Финансовая деятельность',
      unknown: 'Прочие операции',
    };
    return names[activity] || activity;
  };

  const getActivityColor = (activity: string) => {
    const colors: Record<string, string> = {
      operating: 'bg-blue-50 dark:bg-[#1F1F1F]',
      investing: 'bg-emerald-50 dark:bg-[#1F1F1F]',
      financing: 'bg-amber-50 dark:bg-[#1F1F1F]',
      unknown: 'bg-gray-50 dark:bg-[#1F1F1F]',
    };
    return colors[activity] || 'bg-gray-50 dark:bg-[#1F1F1F]';
  };

  const getActivityBorderColor = (activity: string) => {
    const colors: Record<string, string> = {
      operating: '#2563EB', // blue-600
      investing: '#047857', // emerald-700
      financing: '#B45309', // amber-600
      unknown: '#6B7280', // gray-500
    };
    return colors[activity] || '#6B7280';
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
      return (
        <React.Fragment key={cellKey}>
          <td
            className="px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-500 dark:text-zinc-400 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums"
            style={{ minWidth: `${subColumnWidth}px` }}
          >
            {formatNumber(planValue)}
          </td>
          <td
            className="px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-900 dark:text-zinc-200 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums"
            style={{ minWidth: `${subColumnWidth}px` }}
          >
            {formatNumber(factValue)}
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

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-xl max-w-full">
      <div className="bg-zinc-50 dark:bg-zinc-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title || 'Отчет о движении денежных средств'}:{' '}
          {new Date(periodFrom).toLocaleDateString('ru-RU')} —{' '}
          {new Date(periodTo).toLocaleDateString('ru-RU')}
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
                СТАТЬЯ
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
            {sortedActivities.map((activity) => {
              const planActivity = planActivityMap.get(activity.activity);
              const planSource: ActivityGroup | undefined =
                planActivity || (!hasFactData ? activity : undefined);

              const activityColor = getActivityColor(activity.activity);
              const borderColor = getActivityBorderColor(activity.activity);
              const isDragging = draggedActivity === activity.activity;
              const isDragOver = dragOverActivity === activity.activity;

              return (
                <React.Fragment key={activity.activity}>
                  <tr
                    draggable
                    onDragStart={(e) => handleDragStart(e, activity.activity)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, activity.activity)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, activity.activity)}
                    className={`${activityColor} cursor-move border-b border-gray-200 dark:border-gray-700 border-t border-gray-200 dark:border-t dark:border-white/5 transition-all duration-150 hover:outline hover:outline-1 hover:outline-white/5 ${
                      isDragging ? 'opacity-50' : ''
                    } ${
                      isDragOver
                        ? 'outline outline-2 outline-blue-500 dark:outline-blue-400'
                        : ''
                    }`}
                    onClick={() => toggleSection(activity.activity)}
                    style={{
                      borderLeft: `3px solid ${borderColor}`,
                      cursor: 'grab',
                    }}
                  >
                    <td
                      className={`px-4 py-2 font-semibold text-sm text-gray-900 dark:text-zinc-50 sticky left-0 ${activityColor} z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]`}
                      style={{
                        width: `${columnWidths.article}px`,
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className="text-gray-400 dark:text-gray-500 cursor-grab active:cursor-grabbing text-lg leading-none"
                          title="Перетащите для изменения порядка"
                        >
                          ⋮⋮
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 font-bold text-base">
                          {expandedSections[activity.activity] ? '▾' : '▸'}
                        </span>
                        <span className="font-semibold">
                          {getActivityDisplayName(activity.activity)}
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
                  </tr>

                  {expandedSections[activity.activity] && (
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
                          .filter((group) => group.months.length > 0)
                          .map((group) => {
                            const planGroup =
                              incomePlanMap.get(group.articleId) ||
                              (!hasFactData ? group : undefined);
                            const articleName =
                              planGroup?.articleName || group.articleName;

                            return (
                              <tr
                                key={`${activity.activity}-income-${group.articleId}`}
                                className="bg-zinc-50 dark:bg-zinc-900 hover:outline hover:outline-1 hover:outline-white/5 border-b border-gray-200 dark:border-gray-700 transition-all duration-100"
                              >
                                <td
                                  className="px-4 py-2 pl-10 text-sm font-medium text-gray-700 dark:text-zinc-300 sticky left-0 bg-zinc-50 dark:bg-zinc-900 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                                  style={{ width: `${columnWidths.article}px` }}
                                >
                                  {articleName}
                                </td>
                                {allMonths.map((month) => {
                                  const factAmount = hasFactData
                                    ? group.months.find(
                                        (m) => m.month === month
                                      )?.amount || 0
                                    : 0;
                                  const planAmount = getPlanAmount(
                                    group.articleId,
                                    month
                                  );

                                  if (showPlan) {
                                    return (
                                      <React.Fragment
                                        key={`${activity.activity}-income-${group.articleId}-${month}`}
                                      >
                                        <td
                                          className="px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-500 dark:text-zinc-400 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums"
                                          style={{
                                            minWidth: `${subColumnWidth}px`,
                                          }}
                                        >
                                          {planAmount !== 0 && (
                                            <span className="text-green-600 dark:text-green-400 mr-1">
                                              ▲
                                            </span>
                                          )}
                                          {formatNumber(planAmount)}
                                        </td>
                                        <td
                                          className="px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-900 dark:text-zinc-200 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums"
                                          style={{
                                            minWidth: `${subColumnWidth}px`,
                                          }}
                                        >
                                          {factAmount !== 0 && (
                                            <span className="text-green-600 dark:text-green-400 mr-1">
                                              ▲
                                            </span>
                                          )}
                                          {formatNumber(factAmount)}
                                        </td>
                                      </React.Fragment>
                                    );
                                  }

                                  return (
                                    <td
                                      key={`${activity.activity}-income-${group.articleId}-${month}`}
                                      className="px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-900 dark:text-zinc-200 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums"
                                      style={{
                                        minWidth: `${columnWidths.month}px`,
                                      }}
                                    >
                                      {factAmount !== 0 && (
                                        <span className="text-green-600 dark:text-green-400 mr-1">
                                          ▲
                                        </span>
                                      )}
                                      {formatNumber(factAmount)}
                                    </td>
                                  );
                                })}
                                <td
                                  className="px-4 py-2 text-right text-[13px] font-normal text-gray-900 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900 border-l-2 border-gray-300 dark:border-l dark:border-white/10 whitespace-nowrap tabular-nums"
                                  style={{
                                    minWidth: `${columnWidths.total}px`,
                                  }}
                                >
                                  {(() => {
                                    const total = hasFactData
                                      ? group.total
                                      : planGroup?.total || 0;
                                    return (
                                      <>
                                        {total !== 0 && (
                                          <span className="text-green-600 dark:text-green-400 mr-1">
                                            ▲
                                          </span>
                                        )}
                                        {formatNumber(total)}
                                      </>
                                    );
                                  })()}
                                </td>
                              </tr>
                            );
                          });
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
                          .filter((group) => group.months.length > 0)
                          .map((group) => {
                            const planGroup =
                              expensePlanMap.get(group.articleId) ||
                              (!hasFactData ? group : undefined);
                            const articleName =
                              planGroup?.articleName || group.articleName;

                            return (
                              <tr
                                key={`${activity.activity}-expense-${group.articleId}`}
                                className="bg-zinc-50 dark:bg-zinc-900 hover:outline hover:outline-1 hover:outline-white/5 border-b border-gray-200 dark:border-gray-700 transition-all duration-100"
                              >
                                <td
                                  className="px-4 py-2 pl-10 text-sm font-medium text-gray-700 dark:text-zinc-300 sticky left-0 bg-zinc-50 dark:bg-zinc-900 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                                  style={{ width: `${columnWidths.article}px` }}
                                >
                                  {articleName}
                                </td>
                                {allMonths.map((month) => {
                                  const factAmount = hasFactData
                                    ? group.months.find(
                                        (m) => m.month === month
                                      )?.amount || 0
                                    : 0;
                                  const planAmount = getPlanAmount(
                                    group.articleId,
                                    month
                                  );

                                  if (showPlan) {
                                    return (
                                      <React.Fragment
                                        key={`${activity.activity}-expense-${group.articleId}-${month}`}
                                      >
                                        <td
                                          className="px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-500 dark:text-zinc-400 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums"
                                          style={{
                                            minWidth: `${subColumnWidth}px`,
                                          }}
                                        >
                                          {planAmount !== 0 && (
                                            <span className="text-red-600 dark:text-red-400 mr-1">
                                              ▼
                                            </span>
                                          )}
                                          {formatNumber(planAmount)}
                                        </td>
                                        <td
                                          className="px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-900 dark:text-zinc-200 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums"
                                          style={{
                                            minWidth: `${subColumnWidth}px`,
                                          }}
                                        >
                                          {factAmount !== 0 && (
                                            <span className="text-red-600 dark:text-red-400 mr-1">
                                              ▼
                                            </span>
                                          )}
                                          {formatNumber(factAmount)}
                                        </td>
                                      </React.Fragment>
                                    );
                                  }

                                  return (
                                    <td
                                      key={`${activity.activity}-expense-${group.articleId}-${month}`}
                                      className="px-3 py-2 text-right text-[13px] md:text-[13px] font-normal text-gray-900 dark:text-zinc-200 border-l border-gray-200 dark:border-gray-700 whitespace-nowrap tabular-nums"
                                      style={{
                                        minWidth: `${columnWidths.month}px`,
                                      }}
                                    >
                                      {factAmount !== 0 && (
                                        <span className="text-red-600 dark:text-red-400 mr-1">
                                          ▼
                                        </span>
                                      )}
                                      {formatNumber(factAmount)}
                                    </td>
                                  );
                                })}
                                <td
                                  className="px-4 py-2 text-right text-[13px] font-normal text-gray-900 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900 border-l-2 border-gray-300 dark:border-l dark:border-white/10 whitespace-nowrap tabular-nums"
                                  style={{
                                    minWidth: `${columnWidths.total}px`,
                                  }}
                                >
                                  {(() => {
                                    const total = hasFactData
                                      ? group.total
                                      : planGroup?.total || 0;
                                    return (
                                      <>
                                        {total !== 0 && (
                                          <span className="text-red-600 dark:text-red-400 mr-1">
                                            ▼
                                          </span>
                                        )}
                                        {formatNumber(total)}
                                      </>
                                    );
                                  })()}
                                </td>
                              </tr>
                            );
                          });
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
                  return (
                    <React.Fragment key={`totals-${month}`}>
                      <td
                        className="px-3 py-4 text-right text-sm font-semibold text-indigo-900 dark:text-white border-l border-gray-300 dark:border-gray-600 whitespace-nowrap tabular-nums bg-indigo-100 dark:bg-[#232336]"
                        style={{ minWidth: `${subColumnWidth}px` }}
                      >
                        {formatNumber(planTotal)}
                      </td>
                      <td
                        className="px-3 py-4 text-right text-sm font-semibold text-indigo-900 dark:text-white border-l border-gray-300 dark:border-gray-600 whitespace-nowrap tabular-nums bg-indigo-100 dark:bg-[#232336]"
                        style={{ minWidth: `${subColumnWidth}px` }}
                      >
                        {formatNumber(factTotal)}
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
            </tr>

            <tr className="bg-zinc-50 dark:bg-[#202020] border-t border-gray-300 dark:border-t dark:border-white/8 sticky bottom-0 z-20">
              <td
                className="px-4 py-2 font-normal text-sm text-zinc-400 dark:text-zinc-400 sticky left-0 bg-zinc-50 dark:bg-[#202020] z-30 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                style={{
                  width: `${columnWidths.article}px`,
                  color: '#A1A1AA',
                }}
              >
                Остаток на конец периода
              </td>
              {cumulativeBalances.map(({ month, balance }, idx) => {
                const planBalance = planCumulativeBalances[idx]?.balance ?? 0;
                const isPositive = balance >= 0;
                const _isPlanPositive = planBalance >= 0;

                if (showPlan) {
                  return (
                    <React.Fragment key={`balance-${month}`}>
                      <td
                        className="px-3 py-2 text-right text-[13px] font-normal text-zinc-400 dark:text-zinc-400 border-l border-gray-300 dark:border-gray-700 whitespace-nowrap tabular-nums bg-zinc-50 dark:bg-[#202020]"
                        style={{ minWidth: `${subColumnWidth}px` }}
                      >
                        {formatNumber(planBalance)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right text-[13px] font-normal border-l border-gray-300 dark:border-gray-700 whitespace-nowrap tabular-nums bg-zinc-50 dark:bg-[#202020] ${isPositive ? 'text-zinc-400 dark:text-zinc-400' : 'text-red-700 dark:text-red-400'}`}
                        style={{ minWidth: `${subColumnWidth}px` }}
                      >
                        {formatNumber(balance)}
                      </td>
                    </React.Fragment>
                  );
                }

                return (
                  <td
                    key={`balance-${month}`}
                    className={`px-3 py-2 text-right text-[13px] font-normal border-l border-gray-300 dark:border-gray-700 whitespace-nowrap tabular-nums bg-zinc-50 dark:bg-[#202020] ${isPositive ? 'text-zinc-400 dark:text-zinc-400' : 'text-red-700 dark:text-red-400'}`}
                    style={{ minWidth: `${columnWidths.month}px` }}
                  >
                    {formatNumber(balance)}
                  </td>
                );
              })}
              <td
                className={`px-4 py-2 text-right text-[13px] font-normal border-l-2 border-gray-300 dark:border-l dark:border-white/10 whitespace-nowrap tabular-nums bg-zinc-50 dark:bg-[#202020] ${
                  (cumulativeBalances[cumulativeBalances.length - 1]?.balance ||
                    0) >= 0
                    ? 'text-zinc-400 dark:text-zinc-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
                style={{ minWidth: `${columnWidths.total}px` }}
              >
                {formatNumber(
                  hasFactData
                    ? cumulativeBalances[cumulativeBalances.length - 1]
                        ?.balance || 0
                    : planCumulativeBalances[planCumulativeBalances.length - 1]
                        ?.balance || 0
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
