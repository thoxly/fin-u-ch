import React, { useState, useMemo } from 'react';
import { formatMoney } from '../../shared/lib/money';
import { CashflowReport, BDDSReport } from '@fin-u-ch/shared';

interface CashflowTableProps {
  data: CashflowReport;
  planData?: BDDSReport;
  showPlan?: boolean;
  periodFrom: string;
  periodTo: string;
}

interface ExpandedSections {
  [activity: string]: boolean;
}

export const CashflowTable: React.FC<CashflowTableProps> = ({
  data,
  planData,
  showPlan = false,
  periodFrom,
  periodTo,
}) => {
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(
    {}
  );

  const toggleSection = (activity: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [activity]: !prev[activity],
    }));
  };

  // Получаем все месяцы из данных (факт или план)
  const allMonths = useMemo(() => {
    // Сначала пробуем взять месяцы из фактических данных
    if (data.activities.length > 0) {
      if (data.activities[0].incomeGroups.length > 0) {
        return data.activities[0].incomeGroups[0].months.map((m) => m.month);
      }
      if (data.activities[0].expenseGroups.length > 0) {
        return data.activities[0].expenseGroups[0].months.map((m) => m.month);
      }
    }

    // Если фактических данных нет, берем месяцы из плана
    if (planData && planData.rows.length > 0) {
      return planData.rows[0].months.map((m) => m.month);
    }

    return [];
  }, [data.activities, planData]);

  // Функция для получения плановых данных по статье и месяцу
  const getPlanAmount = (articleId: string, month: string) => {
    if (!planData || !planData.rows) return 0;
    const planRow = planData.rows.find((row) => row.articleId === articleId);
    if (!planRow) return 0;
    const monthData = planRow.months.find((m) => m.month === month);
    return monthData?.amount || 0;
  };

  // Вычисляем общий денежный поток
  const totalNetCashflow = data.activities.reduce(
    (sum, activity) => sum + activity.netCashflow,
    0
  );

  // Вычисляем остаток на конец периода (кумулятивно)
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

  const getActivityDisplayName = (activity: string) => {
    const names: Record<string, string> = {
      operating: 'Операционная деятельность',
      investing: 'Инвестиционная деятельность',
      financing: 'Финансовая деятельность',
      unknown: 'Прочие операции',
    };
    return names[activity] || activity;
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-xl max-w-full">
      {/* Верхняя панель с информацией о периоде */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Отчет о движении денежных средств:{' '}
          {new Date(periodFrom).toLocaleDateString('ru-RU')} —{' '}
          {new Date(periodTo).toLocaleDateString('ru-RU')}
        </div>
      </div>

      {/* Таблица с freeze и скроллом */}
      <div className="w-full max-w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
        <table className="w-max border-collapse relative">
          <thead className="sticky top-0 z-30">
            <tr className="bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-300 dark:border-gray-950">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider sticky left-0 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 min-w-[240px] z-40 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.3)]">
                Статья
              </th>
              {allMonths.map((month) => (
                <th
                  key={month}
                  colSpan={showPlan ? 2 : 1}
                  className="px-2 py-3 text-center text-[10px] font-bold text-gray-800 dark:text-white uppercase tracking-wide min-w-[100px] border-l border-gray-300 dark:border-gray-700"
                >
                  {new Date(month + '-01')
                    .toLocaleDateString('ru-RU', {
                      month: 'short',
                      year: '2-digit',
                    })
                    .replace('.', '')}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 min-w-[120px] border-l-2 border-gray-300 dark:border-gray-700">
                Итого
              </th>
            </tr>
            {showPlan && (
              <tr className="bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 border-b border-gray-300 dark:border-gray-700">
                <th className="sticky left-0 bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 z-40 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.3)]"></th>
                {allMonths.map((month) => (
                  <React.Fragment key={month}>
                    <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 min-w-[50px] border-l border-gray-300 dark:border-gray-700">
                      План
                    </th>
                    <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 min-w-[50px] border-l border-gray-300 dark:border-gray-700">
                      Факт
                    </th>
                  </React.Fragment>
                ))}
                <th className="bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-l-2 border-gray-300 dark:border-gray-700"></th>
              </tr>
            )}
          </thead>
          <tbody className="text-xs">
            {data.activities.map((activity) => (
              <React.Fragment key={activity.activity}>
                {/* Заголовок потока */}
                <tr
                  className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700 cursor-pointer border-b border-blue-200 dark:border-gray-700 transition-colors duration-150"
                  onClick={() => toggleSection(activity.activity)}
                >
                  <td className="px-4 py-2.5 font-semibold text-xs text-blue-800 dark:text-blue-200 sticky left-0 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`transform transition-transform text-blue-500 dark:text-blue-400 font-bold text-base ${expandedSections[activity.activity] ? 'rotate-90' : ''}`}
                      >
                        ▸
                      </span>
                      <span className="font-bold">
                        {getActivityDisplayName(activity.activity)}
                      </span>
                    </div>
                  </td>
                  {allMonths.map((month) => {
                    const monthIncome = activity.incomeGroups.reduce(
                      (sum, group) => {
                        const monthData = group.months.find(
                          (m) => m.month === month
                        );
                        return sum + (monthData?.amount || 0);
                      },
                      0
                    );
                    const monthExpense = activity.expenseGroups.reduce(
                      (sum, group) => {
                        const monthData = group.months.find(
                          (m) => m.month === month
                        );
                        return sum + (monthData?.amount || 0);
                      },
                      0
                    );
                    const monthNet = monthIncome - monthExpense;

                    // TODO: Вычислить плановые значения для потока
                    const monthNetPlan = monthNet; // Пока используем факт

                    if (showPlan) {
                      return (
                        <React.Fragment key={month}>
                          <td className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-500 border-l border-blue-200 dark:border-gray-700">
                            {formatMoney(monthNetPlan)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-semibold text-blue-800 dark:text-blue-200 border-l border-blue-200 dark:border-gray-700">
                            {formatMoney(monthNet)}
                          </td>
                        </React.Fragment>
                      );
                    } else {
                      return (
                        <td
                          key={month}
                          className="px-3 py-2.5 text-right text-xs font-semibold text-blue-800 dark:text-blue-200 border-l border-blue-200 dark:border-gray-700"
                        >
                          {formatMoney(monthNet)}
                        </td>
                      );
                    }
                  })}
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-blue-800 dark:text-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700 border-l-2 border-blue-200 dark:border-gray-700">
                    {formatMoney(activity.netCashflow)}
                  </td>
                </tr>

                {/* Детализация (доходы и расходы) */}
                {expandedSections[activity.activity] && (
                  <>
                    {/* Доходы */}
                    {activity.incomeGroups.map((group) => (
                      <tr
                        key={`income-${group.articleId}`}
                        className="bg-white hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-900 border-b border-gray-200 dark:border-gray-700/50 transition-colors duration-100"
                      >
                        <td className="px-4 py-2.5 pl-10 text-sm text-gray-700 dark:text-gray-300 sticky left-0 bg-white hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-900 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]">
                          <span className="flex items-center">
                            <span className="text-green-600 dark:text-green-400 mr-2">
                              ↑
                            </span>
                            {group.articleName}
                          </span>
                        </td>
                        {group.months.map((monthData) => {
                          if (showPlan) {
                            const planAmount = getPlanAmount(
                              group.articleId,
                              monthData.month
                            );
                            return (
                              <React.Fragment key={monthData.month}>
                                <td className="px-3 py-2.5 text-right text-sm text-gray-500 border-l border-gray-200 dark:border-gray-700/50">
                                  {formatMoney(planAmount)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-sm text-green-700 dark:text-green-400 font-medium border-l border-gray-200 dark:border-gray-700/50">
                                  {formatMoney(monthData.amount)}
                                </td>
                              </React.Fragment>
                            );
                          } else {
                            return (
                              <td
                                key={monthData.month}
                                className="px-3 py-2.5 text-right text-sm text-green-700 dark:text-green-400 font-medium border-l border-gray-200 dark:border-gray-700/50"
                              >
                                {formatMoney(monthData.amount)}
                              </td>
                            );
                          }
                        })}
                        <td className="px-4 py-2.5 text-right text-sm font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-l-2 border-gray-300 dark:border-gray-700">
                          {formatMoney(group.total)}
                        </td>
                      </tr>
                    ))}

                    {/* Расходы */}
                    {activity.expenseGroups.map((group) => (
                      <tr
                        key={`expense-${group.articleId}`}
                        className="bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900 border-b border-gray-200 dark:border-gray-700/50 transition-colors duration-100"
                      >
                        <td className="px-4 py-2.5 pl-10 text-sm text-gray-700 dark:text-gray-300 sticky left-0 bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]">
                          <span className="flex items-center">
                            <span className="text-red-600 dark:text-red-400 mr-2">
                              ↓
                            </span>
                            {group.articleName}
                          </span>
                        </td>
                        {group.months.map((monthData) => {
                          if (showPlan) {
                            const planAmount = getPlanAmount(
                              group.articleId,
                              monthData.month
                            );
                            return (
                              <React.Fragment key={monthData.month}>
                                <td className="px-3 py-2.5 text-right text-sm text-gray-500 border-l border-gray-200 dark:border-gray-700/50">
                                  {formatMoney(planAmount)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-sm text-red-700 dark:text-red-400 font-medium border-l border-gray-200 dark:border-gray-700/50">
                                  {formatMoney(monthData.amount)}
                                </td>
                              </React.Fragment>
                            );
                          } else {
                            return (
                              <td
                                key={monthData.month}
                                className="px-3 py-2.5 text-right text-sm text-red-700 dark:text-red-400 font-medium border-l border-gray-200 dark:border-gray-700/50"
                              >
                                {formatMoney(monthData.amount)}
                              </td>
                            );
                          }
                        })}
                        <td className="px-4 py-2.5 text-right text-sm font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-l-2 border-gray-300 dark:border-gray-700">
                          {formatMoney(group.total)}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </React.Fragment>
            ))}

            {/* Итоговые строки */}
            <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
              <td className="px-4 py-4 font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wide sticky left-0 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]">
                Общий денежный поток
              </td>
              {allMonths.map((month) => {
                const monthTotal = data.activities.reduce((sum, activity) => {
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

                // TODO: Вычислить плановый итог
                const monthTotalPlan = monthTotal;

                if (showPlan) {
                  return (
                    <React.Fragment key={month}>
                      <td className="px-3 py-4 text-right text-sm font-bold text-gray-600 dark:text-gray-400 border-l border-gray-300 dark:border-gray-600">
                        {formatMoney(monthTotalPlan)}
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-l border-gray-300 dark:border-gray-600">
                        {formatMoney(monthTotal)}
                      </td>
                    </React.Fragment>
                  );
                } else {
                  return (
                    <td
                      key={month}
                      className="px-3 py-4 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-l border-gray-300 dark:border-gray-600"
                    >
                      {formatMoney(monthTotal)}
                    </td>
                  );
                }
              })}
              <td className="px-4 py-4 text-right text-base font-extrabold text-gray-900 dark:text-gray-100 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-l-2 border-gray-300 dark:border-gray-600">
                {formatMoney(totalNetCashflow)}
              </td>
            </tr>

            <tr className="bg-gradient-to-r from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 border-t border-indigo-300 dark:border-gray-700">
              <td className="px-4 py-3 font-bold text-sm text-indigo-900 dark:text-indigo-300 sticky left-0 bg-gradient-to-r from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]">
                Остаток на конец периода
              </td>
              {cumulativeBalances.map(({ month, balance }) => {
                const isPositive = balance >= 0;
                if (showPlan) {
                  return (
                    <React.Fragment key={month}>
                      <td className="px-3 py-3 text-right text-sm text-gray-500 border-l border-indigo-300 dark:border-gray-700">
                        {formatMoney(balance)}
                      </td>
                      <td
                        className={`px-3 py-3 text-right text-sm font-semibold border-l border-indigo-300 dark:border-gray-700 ${isPositive ? 'text-indigo-700 dark:text-indigo-400' : 'text-red-700 dark:text-red-400'}`}
                      >
                        {formatMoney(balance)}
                      </td>
                    </React.Fragment>
                  );
                } else {
                  return (
                    <td
                      key={month}
                      className={`px-3 py-3 text-right text-sm font-semibold border-l border-indigo-300 dark:border-gray-700 ${isPositive ? 'text-indigo-700 dark:text-indigo-400' : 'text-red-700 dark:text-red-400'}`}
                    >
                      {formatMoney(balance)}
                    </td>
                  );
                }
              })}
              <td
                className={`px-4 py-3 text-right text-base font-bold border-l-2 border-indigo-300 dark:border-gray-700 ${
                  (cumulativeBalances[cumulativeBalances.length - 1]?.balance ||
                    0) >= 0
                    ? 'text-indigo-900 dark:text-indigo-300 bg-gradient-to-r from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800'
                    : 'text-red-900 dark:text-red-300 bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900 dark:to-red-800'
                }`}
              >
                {formatMoney(
                  cumulativeBalances[cumulativeBalances.length - 1]?.balance ||
                    0
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
