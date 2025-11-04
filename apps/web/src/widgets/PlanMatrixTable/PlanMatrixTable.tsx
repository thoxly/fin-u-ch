import React, { useState, useMemo } from 'react';
import { formatMoney } from '../../shared/lib/money';
import { BDDSReport } from '@fin-u-ch/shared';

interface PlanMatrixTableProps {
  data: BDDSReport;
  periodFrom: string;
  periodTo: string;
}

interface ExpandedSections {
  [activity: string]: boolean;
}

export const PlanMatrixTable: React.FC<PlanMatrixTableProps> = ({
  data,
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

  const getActivityDisplayName = (activity: string) => {
    const names: Record<string, string> = {
      operating: 'Операционная деятельность',
      investing: 'Инвестиционная деятельность',
      financing: 'Финансовая деятельность',
      unknown: 'Прочие операции',
    };
    return names[activity] || activity;
  };
  // Получаем все месяцы из данных
  const allMonths = useMemo(() => {
    if (!data.activities || data.activities.length === 0) return [];
    // Берем месяцы из первой активности, если она есть
    const firstActivity = data.activities[0];
    if (firstActivity.incomeGroups.length > 0) {
      return firstActivity.incomeGroups[0].months.map((m) => m.month);
    } else if (firstActivity.expenseGroups.length > 0) {
      return firstActivity.expenseGroups[0].months.map((m) => m.month);
    }
    return [];
  }, [data.activities]);

  // Вычисляем ширину колонок
  const columnWidths = useMemo(() => {
    // const totalColumns = allMonths.length + 2; // месяцы + статья + итого
    const articleColumnWidth = 240; // фиксированная ширина для колонки "Статья"
    const totalColumnWidth = 120; // фиксированная ширина для колонки "Итого"
    const monthColumnWidth = Math.max(
      100,
      (1000 - articleColumnWidth - totalColumnWidth) / allMonths.length
    );

    return {
      article: articleColumnWidth,
      month: monthColumnWidth,
      total: totalColumnWidth,
    };
  }, [allMonths.length]);

  // Вычисляем общий денежный поток
  const totalNetCashflow = data.activities.reduce(
    (sum, activity) => sum + activity.netCashflow,
    0
  );

  // const formatMonthHeader = (month: string) => {
  //   const [year, monthNum] = month.split('-');
  //   const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  //   return date.toLocaleDateString('ru-RU', {
  //     month: 'short',
  //     year: '2-digit',
  //   });
  // };

  // Проверяем есть ли данные
  const hasData = data.activities && data.activities.length > 0;

  // Отладочная информация
  console.log('PlanMatrixTable data:', data);
  console.log('PlanMatrixTable hasData:', hasData);
  console.log('PlanMatrixTable allMonths:', allMonths);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-xl max-w-full">
      {/* Верхняя панель с информацией о периоде */}
      <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-950 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Бюджет движения денежных средств:{' '}
          {new Date(periodFrom).toLocaleDateString('ru-RU')} —{' '}
          {new Date(periodTo).toLocaleDateString('ru-RU')}
        </div>
      </div>

      {/* Таблица с freeze и скроллом */}
      <div className="w-full overflow-x-auto overflow-y-auto min-h-[200px]">
        <table className="w-full border-collapse relative table-fixed">
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
                  className="px-2 py-3 text-center text-[10px] font-bold text-gray-800 dark:text-white uppercase tracking-wide border-l border-gray-300 dark:border-gray-700"
                  style={{ width: `${columnWidths.month}px` }}
                >
                  {new Date(month + '-01')
                    .toLocaleDateString('ru-RU', {
                      month: 'short',
                      year: '2-digit',
                    })
                    .replace('.', '')}
                </th>
              ))}
              <th
                className="px-4 py-3 text-right text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-l-2 border-gray-300 dark:border-gray-700"
                style={{ width: `${columnWidths.total}px` }}
              >
                Итого
              </th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {data.activities.map((activity) => (
              <React.Fragment key={activity.activity}>
                {/* Заголовок потока */}
                <tr
                  className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700 cursor-pointer border-b border-blue-200 dark:border-gray-700 transition-colors duration-150"
                  onClick={() => toggleSection(activity.activity)}
                >
                  <td
                    className="px-4 py-2.5 font-semibold text-xs text-blue-800 dark:text-blue-200 sticky left-0 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                    style={{ width: `${columnWidths.article}px` }}
                  >
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

                    // Отладочная информация для каждого месяца
                    console.log(`Month ${month}:`, {
                      monthIncome,
                      monthExpense,
                      monthNet,
                      activity: activity.activity,
                      incomeGroups: activity.incomeGroups,
                      expenseGroups: activity.expenseGroups,
                    });

                    return (
                      <td
                        key={month}
                        className="px-3 py-2.5 text-right text-xs font-semibold text-blue-800 dark:text-blue-200 border-l border-blue-200 dark:border-gray-700"
                        style={{ width: `${columnWidths.month}px` }}
                      >
                        {formatMoney(monthNet)}
                      </td>
                    );
                  })}
                  <td
                    className="px-4 py-2.5 text-right text-xs font-bold text-blue-800 dark:text-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 dark:from-blue-900 dark:to-blue-800 dark:hover:from-blue-800 dark:hover:to-blue-700 border-l-2 border-blue-200 dark:border-gray-700"
                    style={{ width: `${columnWidths.total}px` }}
                  >
                    {formatMoney(activity.netCashflow)}
                  </td>
                </tr>

                {/* Детали потока */}
                {expandedSections[activity.activity] && (
                  <>
                    {/* Поступления */}
                    {activity.incomeGroups.map((group) => (
                      <tr
                        key={`${activity.activity}-income-${group.articleId}`}
                        className="bg-white hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-900 border-b border-gray-200 dark:border-gray-700/50 transition-colors duration-100"
                      >
                        <td
                          className="px-4 py-2.5 pl-10 text-sm text-gray-700 dark:text-gray-300 sticky left-0 bg-white hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-900 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                          style={{ width: `${columnWidths.article}px` }}
                        >
                          <span className="flex items-center">
                            <span className="text-green-600 dark:text-green-400 mr-2">
                              ↑
                            </span>
                            {group.articleName}
                          </span>
                        </td>
                        {group.months.map((monthData) => (
                          <td
                            key={monthData.month}
                            className="px-3 py-2.5 text-right text-sm text-green-700 dark:text-green-400 font-medium border-l border-gray-200 dark:border-gray-700/50"
                            style={{ width: `${columnWidths.month}px` }}
                          >
                            {formatMoney(monthData.amount)}
                          </td>
                        ))}
                        <td
                          className="px-4 py-2.5 text-right text-sm font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-l-2 border-gray-300 dark:border-gray-700"
                          style={{ width: `${columnWidths.total}px` }}
                        >
                          {formatMoney(group.total)}
                        </td>
                      </tr>
                    ))}

                    {/* Списания */}
                    {activity.expenseGroups.map((group) => (
                      <tr
                        key={`${activity.activity}-expense-${group.articleId}`}
                        className="bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900 border-b border-gray-200 dark:border-gray-700/50 transition-colors duration-100"
                      >
                        <td
                          className="px-4 py-2.5 pl-10 text-sm text-gray-700 dark:text-gray-300 sticky left-0 bg-white hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                          style={{ width: `${columnWidths.article}px` }}
                        >
                          <span className="flex items-center">
                            <span className="text-red-600 dark:text-red-400 mr-2">
                              ↓
                            </span>
                            {group.articleName}
                          </span>
                        </td>
                        {group.months.map((monthData) => (
                          <td
                            key={monthData.month}
                            className="px-3 py-2.5 text-right text-sm text-red-700 dark:text-red-400 font-medium border-l border-gray-200 dark:border-gray-700/50"
                            style={{ width: `${columnWidths.month}px` }}
                          >
                            {formatMoney(monthData.amount)}
                          </td>
                        ))}
                        <td
                          className="px-4 py-2.5 text-right text-sm font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-l-2 border-gray-300 dark:border-gray-700"
                          style={{ width: `${columnWidths.total}px` }}
                        >
                          {formatMoney(group.total)}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </React.Fragment>
            ))}

            {/* Итоговые строки - показываем только если есть данные */}
            {hasData && (
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                <td
                  className="px-4 py-4 font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wide sticky left-0 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 z-10 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.2)] dark:shadow-[4px_0_6px_-1px_rgba(0,0,0,0.5)]"
                  style={{ width: `${columnWidths.article}px` }}
                >
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

                  return (
                    <td
                      key={month}
                      className="px-3 py-4 text-right text-sm font-bold text-gray-900 dark:text-gray-100 border-l border-gray-300 dark:border-gray-600"
                      style={{ width: `${columnWidths.month}px` }}
                    >
                      {formatMoney(monthTotal)}
                    </td>
                  );
                })}
                <td className="px-4 py-4 text-right text-base font-extrabold text-gray-900 dark:text-gray-100 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-l-2 border-gray-300 dark:border-gray-600">
                  {formatMoney(totalNetCashflow)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Placeholder для пустого состояния */}
        {!hasData && (
          <div className="flex flex-col items-center justify-center h-48 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 transition-opacity duration-300">
            <div className="text-sm font-medium mb-1">
              Нет данных для отображения
            </div>
            <div className="text-xs opacity-75">
              Добавьте плановую запись, чтобы увидеть движение средств
            </div>
          </div>
        )}
      </div>

      {/* Визуальное разделение и отступ */}
      <div className="h-4"></div>
    </div>
  );
};
