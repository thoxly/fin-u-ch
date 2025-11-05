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

  const hasFactData = data.activities.length > 0;

  const toggleSection = (activity: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [activity]: !prev[activity],
    }));
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
  }, [planData, allMonths, planLookups]);

  const totalNetCashflow = data.activities.reduce(
    (sum, activity) => sum + activity.netCashflow,
    0
  );

  const planTotalNetCashflow = planData?.activities?.reduce(
    (sum, activity) => sum + activity.netCashflow,
    0
  );

  const activitiesToRender = hasFactData
    ? data.activities
    : planData?.activities || [];

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
            className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-500 border-l border-blue-200 dark:border-gray-700 whitespace-nowrap"
            style={{ minWidth: `${subColumnWidth}px` }}
          >
            {formatNumber(planValue)}
          </td>
          <td
            className="px-3 py-2.5 text-right text-xs font-semibold text-blue-800 dark:text-blue-200 border-l border-blue-200 dark:border-gray-700 whitespace-nowrap"
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
        className="px-3 py-2.5 text-right text-xs font-semibold text-blue-800 dark:text-blue-200 border-l border-blue-200 dark:border-gray-700 whitespace-nowrap"
        style={{ minWidth: `${columnWidths.month}px` }}
      >
        {formatNumber(factValue)}
      </td>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-xl max-w-full">
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title || 'Отчет о движении денежных средств'}:{' '}
          {new Date(periodFrom).toLocaleDateString('ru-RU')} —{' '}
          {new Date(periodTo).toLocaleDateString('ru-RU')}
        </div>
      </div>

      <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-380px)]">
        <table className="w-full border-collapse relative table-auto">
          <thead className="sticky top-0 z-30">
            <tr className="bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-300 dark:border-gray-950">
              <th
                className="px-4 py-3 text-left text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider sticky left-0 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 z-40 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.3)]"
                style={{ width: `${columnWidths.article}px` }}
              >
                Статья
              </th>
              {allMonths.map((month) => (
                <th
                  key={month}
                  colSpan={showPlan ? 2 : 1}
                  className="px-2 py-3 text-center text-[10px] font-bold text-gray-800 dark:text-white uppercase tracking-wide border-l border-gray-300 dark:border-gray-700 whitespace-nowrap"
                  style={{ minWidth: `${columnWidths.month}px` }}
                >
                  {formatMonthLabel(month)}
                </th>
              ))}
              <th
                className="px-4 py-3 text-right text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-l-2 border-gray-300 dark:border-gray-700 whitespace-nowrap"
                style={{ minWidth: `${columnWidths.total}px` }}
                colSpan={showPlan ? 2 : 1}
              >
                Итого
              </th>
            </tr>
            {showPlan && (
              <tr className="bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 border-b border-gray-300 dark:border-gray-700">
                <th className="sticky left-0 bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 z-40 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.3)]"></th>
                {allMonths.map((month) => (
                  <React.Fragment key={`${month}-subcol`}>
                    <th
                      className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap border-l border-gray-300 dark:border-gray-700"
                      style={{ minWidth: `${subColumnWidth}px` }}
                    >
                      План
                    </th>
                    <th
                      className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap border-l border-gray-300 dark:border-gray-700"
                      style={{ minWidth: `${subColumnWidth}px` }}
                    >
                      Факт
                    </th>
                  </React.Fragment>
                ))}
                <th
                  className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap border-l border-gray-300 dark:border-gray-700"
                  style={{ minWidth: `${subColumnWidth}px` }}
                >
                  План
                </th>
                <th
                  className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap border-l border-gray-300 dark:border-gray-700"
                  style={{ minWidth: `${subColumnWidth}px` }}
                >
                  Факт
                </th>
              </tr>
            )}
          </thead>
          <tbody className="text-[9px]">
            {activitiesToRender.map((activity) => {
              const planActivity = planActivityMap.get(activity.activity);
              const planSource: ActivityGroup | undefined =
                planActivity || (!hasFactData ? activity : undefined);

              return (
                <React.Fragment key={activity.activity}>
                  <tr
                    className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700 cursor-pointer border-b border-blue-200 dark:border-gray-700 transition-colors duration-150"
                    onClick={() => toggleSection(activity.activity)}
                  >
                    <td
                      className="px-4 py-2.5 font-semibold text-xs text-blue-800 dark:text-blue-200 sticky left-0 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                      style={{ width: `${columnWidths.article}px` }}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-blue-500 dark:text-blue-400 font-bold text-base">
                          {expandedSections[activity.activity] ? '▾' : '▸'}
                        </span>
                        <span className="font-bold">
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
                      className="px-4 py-2.5 text-right text-xs font-bold text-blue-800 dark:text-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700 border-l-2 border-blue-200 dark:border-gray-700 whitespace-nowrap"
                      style={{ minWidth: `${columnWidths.total}px` }}
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
                                className="bg-white hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-900 border-b border-gray-200 dark:border-gray-700/50 transition-colors duration-100"
                              >
                                <td
                                  className="px-4 py-2.5 pl-10 text-xs text-gray-700 dark:text-gray-300 sticky left-0 bg-white hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-900 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                                  style={{ width: `${columnWidths.article}px` }}
                                >
                                  <span className="flex items-center">
                                    <span className="text-green-600 dark:text-green-400 mr-2">
                                      ↑
                                    </span>
                                    {articleName}
                                  </span>
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
                                          className="px-3 py-2.5 text-right text-xs text-gray-500 border-l border-gray-200 dark:border-gray-700/50 whitespace-nowrap"
                                          style={{
                                            minWidth: `${subColumnWidth}px`,
                                          }}
                                        >
                                          {formatNumber(planAmount)}
                                        </td>
                                        <td
                                          className="px-3 py-2.5 text-right text-xs text-green-700 dark:text-green-400 font-medium border-l border-gray-200 dark:border-gray-700/50 whitespace-nowrap"
                                          style={{
                                            minWidth: `${subColumnWidth}px`,
                                          }}
                                        >
                                          {formatNumber(factAmount)}
                                        </td>
                                      </React.Fragment>
                                    );
                                  }

                                  return (
                                    <td
                                      key={`${activity.activity}-income-${group.articleId}-${month}`}
                                      className="px-3 py-2.5 text-right text-xs text-green-700 dark:text-green-400 font-medium border-l border-gray-200 dark:border-gray-700/50 whitespace-nowrap"
                                      style={{
                                        minWidth: `${columnWidths.month}px`,
                                      }}
                                    >
                                      {formatNumber(factAmount)}
                                    </td>
                                  );
                                })}
                                <td
                                  className="px-4 py-2.5 text-right text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-l-2 border-gray-300 dark:border-gray-700 whitespace-nowrap"
                                  style={{
                                    minWidth: `${columnWidths.total}px`,
                                  }}
                                >
                                  {formatNumber(
                                    hasFactData
                                      ? group.total
                                      : planGroup?.total || 0
                                  )}
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
                                className="bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900 border-b border-gray-200 dark:border-gray-700/50 transition-colors duration-100"
                              >
                                <td
                                  className="px-4 py-2.5 pl-10 text-xs text-gray-700 dark:text-gray-300 sticky left-0 bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                                  style={{ width: `${columnWidths.article}px` }}
                                >
                                  <span className="flex items-center">
                                    <span className="text-red-600 dark:text-red-400 mr-2">
                                      ↓
                                    </span>
                                    {articleName}
                                  </span>
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
                                          className="px-3 py-2.5 text-right text-xs text-gray-500 border-l border-gray-200 dark:border-gray-700/50 whitespace-nowrap"
                                          style={{
                                            minWidth: `${subColumnWidth}px`,
                                          }}
                                        >
                                          {formatNumber(planAmount)}
                                        </td>
                                        <td
                                          className="px-3 py-2.5 text-right text-xs text-red-700 dark:text-red-400 font-medium border-l border-gray-200 dark:border-gray-700/50 whitespace-nowrap"
                                          style={{
                                            minWidth: `${subColumnWidth}px`,
                                          }}
                                        >
                                          {formatNumber(factAmount)}
                                        </td>
                                      </React.Fragment>
                                    );
                                  }

                                  return (
                                    <td
                                      key={`${activity.activity}-expense-${group.articleId}-${month}`}
                                      className="px-3 py-2.5 text-right text-xs text-red-700 dark:text-red-400 font-medium border-l border-gray-200 dark:border-gray-700/50 whitespace-nowrap"
                                      style={{
                                        minWidth: `${columnWidths.month}px`,
                                      }}
                                    >
                                      {formatNumber(factAmount)}
                                    </td>
                                  );
                                })}
                                <td
                                  className="px-4 py-2.5 text-right text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-l-2 border-gray-300 dark:border-gray-700 whitespace-nowrap"
                                  style={{
                                    minWidth: `${columnWidths.total}px`,
                                  }}
                                >
                                  {formatNumber(
                                    hasFactData
                                      ? group.total
                                      : planGroup?.total || 0
                                  )}
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

            <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
              <td
                className="px-4 py-4 font-bold text-xs text-gray-900 dark:text-gray-100 uppercase tracking-wide sticky left-0 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
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
                        className="px-3 py-4 text-right text-xs font-bold text-gray-600 dark:text-gray-400 border-l border-gray-300 dark:border-gray-600 whitespace-nowrap"
                        style={{ minWidth: `${subColumnWidth}px` }}
                      >
                        {formatNumber(planTotal)}
                      </td>
                      <td
                        className="px-3 py-4 text-right text-xs font-bold text-gray-900 dark:text-gray-100 border-l border-gray-300 dark:border-gray-600 whitespace-nowrap"
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
                    className="px-3 py-4 text-right text-xs font-bold text-gray-900 dark:text-gray-100 border-l border-gray-300 dark:border-gray-600 whitespace-nowrap"
                    style={{ minWidth: `${columnWidths.month}px` }}
                  >
                    {formatNumber(factTotal)}
                  </td>
                );
              })}
              <td
                className="px-4 py-4 text-right text-xs font-extrabold text-gray-900 dark:text-gray-100 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-l-2 border-gray-300 dark:border-gray-600 whitespace-nowrap"
                style={{ minWidth: `${columnWidths.total}px` }}
              >
                {formatNumber(
                  hasFactData
                    ? totalNetCashflow
                    : (planTotalNetCashflow ?? totalNetCashflow)
                )}
              </td>
            </tr>

            <tr className="bg-gradient-to-r from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 border-t border-indigo-300 dark:border-gray-700">
              <td
                className="px-4 py-3 font-bold text-xs text-indigo-900 dark:text-indigo-300 sticky left-0 bg-gradient-to-r from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                style={{ width: `${columnWidths.article}px` }}
              >
                Остаток на конец периода
              </td>
              {cumulativeBalances.map(({ month, balance }, idx) => {
                const planBalance = planCumulativeBalances[idx]?.balance ?? 0;
                const isPositive = balance >= 0;
                const isPlanPositive = planBalance >= 0;

                if (showPlan) {
                  return (
                    <React.Fragment key={`balance-${month}`}>
                      <td
                        className="px-3 py-3 text-right text-xs text-gray-500 border-l border-indigo-300 dark:border-gray-700 whitespace-nowrap"
                        style={{ minWidth: `${subColumnWidth}px` }}
                      >
                        {formatNumber(planBalance)}
                      </td>
                      <td
                        className={`px-3 py-3 text-right text-xs font-semibold border-l border-indigo-300 dark:border-gray-700 whitespace-nowrap ${isPositive ? 'text-indigo-700 dark:text-indigo-400' : 'text-red-700 dark:text-red-400'}`}
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
                    className={`px-3 py-3 text-right text-xs font-semibold border-l border-indigo-300 dark:border-gray-700 whitespace-nowrap ${isPositive ? 'text-indigo-700 dark:text-indigo-400' : 'text-red-700 dark:text-red-400'}`}
                    style={{ minWidth: `${columnWidths.month}px` }}
                  >
                    {formatNumber(balance)}
                  </td>
                );
              })}
              <td
                className={`px-4 py-3 text-right text-xs font-bold border-l-2 border-indigo-300 dark:border-gray-700 whitespace-nowrap ${
                  (cumulativeBalances[cumulativeBalances.length - 1]?.balance ||
                    0) >= 0
                    ? 'text-indigo-900 dark:text-indigo-300 bg-gradient-to-r from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800'
                    : 'text-red-900 dark:text-red-300 bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900 dark:to-red-800'
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
