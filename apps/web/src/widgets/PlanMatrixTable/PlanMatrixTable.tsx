import React, { useMemo } from 'react';
import { formatMoney } from '../../shared/lib/money';
import { BDDSReport } from '@fin-u-ch/shared';

interface PlanMatrixTableProps {
  data: BDDSReport;
  periodFrom: string;
  periodTo: string;
}

export const PlanMatrixTable: React.FC<PlanMatrixTableProps> = ({
  data,
  periodFrom,
  periodTo,
}) => {
  // Получаем все месяцы из данных
  const allMonths = useMemo(() => {
    if (data.rows.length === 0) return [];
    return data.rows[0].months.map((m) => m.month);
  }, [data.rows]);

  // Группируем статьи по типу
  const incomeRows = useMemo(
    () => data.rows.filter((row) => row.type === 'income'),
    [data.rows]
  );
  const expenseRows = useMemo(
    () => data.rows.filter((row) => row.type === 'expense'),
    [data.rows]
  );

  // Вычисляем итоги по месяцам
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, { income: number; expense: number }> = {};
    allMonths.forEach((month) => {
      totals[month] = { income: 0, expense: 0 };
    });

    data.rows.forEach((row) => {
      row.months.forEach((monthData) => {
        if (totals[monthData.month]) {
          if (row.type === 'income') {
            totals[monthData.month].income += monthData.amount;
          } else if (row.type === 'expense') {
            totals[monthData.month].expense += monthData.amount;
          }
        }
      });
    });

    return totals;
  }, [data.rows, allMonths]);

  // Вычисляем общие итоги
  const totalIncome = incomeRows.reduce((sum, row) => sum + row.total, 0);
  const totalExpense = expenseRows.reduce((sum, row) => sum + row.total, 0);

  const formatMonthHeader = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('ru-RU', {
      month: 'short',
      year: '2-digit',
    });
  };

  const getAmount = (row: (typeof data.rows)[0], month: string) => {
    const monthData = row.months.find((m) => m.month === month);
    return monthData?.amount || 0;
  };

  if (data.rows.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Нет данных по плану для выбранного периода
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-xl">
      {/* Верхняя панель с информацией о периоде */}
      <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-950 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Бюджет движения денежных средств:{' '}
          {new Date(periodFrom).toLocaleDateString('ru-RU')} —{' '}
          {new Date(periodTo).toLocaleDateString('ru-RU')}
        </div>
      </div>

      {/* Таблица с горизонтальной прокруткой */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="sticky left-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 min-w-[200px]">
                Статья
              </th>
              {allMonths.map((month) => (
                <th
                  key={month}
                  className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[120px] whitespace-nowrap"
                >
                  {formatMonthHeader(month)}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 min-w-[120px] border-l border-gray-200 dark:border-gray-700">
                Итого
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Доходы */}
            {incomeRows.length > 0 && (
              <>
                <tr className="bg-green-50 dark:bg-green-950/20 border-b border-gray-200 dark:border-gray-700">
                  <td
                    colSpan={allMonths.length + 2}
                    className="sticky left-0 z-10 px-4 py-2 font-semibold text-green-700 dark:text-green-400"
                  >
                    Поступления
                  </td>
                </tr>
                {incomeRows.map((row) => (
                  <tr
                    key={row.articleId}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 px-4 py-2 border-r border-gray-200 dark:border-gray-700">
                      {row.articleName}
                    </td>
                    {allMonths.map((month) => (
                      <td
                        key={month}
                        className="px-4 py-2 text-right text-green-600 dark:text-green-400"
                      >
                        {formatMoney(getAmount(row, month), 'RUB')}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-semibold text-green-700 dark:text-green-400 border-l border-gray-200 dark:border-gray-700">
                      {formatMoney(row.total, 'RUB')}
                    </td>
                  </tr>
                ))}
                <tr className="bg-green-100 dark:bg-green-900/20 border-b-2 border-gray-300 dark:border-gray-600 font-semibold">
                  <td className="sticky left-0 z-10 bg-green-100 dark:bg-green-900/20 px-4 py-2 border-r border-gray-200 dark:border-gray-700">
                    Итого поступлений
                  </td>
                  {allMonths.map((month) => (
                    <td
                      key={month}
                      className="px-4 py-2 text-right text-green-700 dark:text-green-400"
                    >
                      {formatMoney(monthlyTotals[month].income, 'RUB')}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right text-green-700 dark:text-green-400 border-l border-gray-200 dark:border-gray-700">
                    {formatMoney(totalIncome, 'RUB')}
                  </td>
                </tr>
              </>
            )}

            {/* Расходы */}
            {expenseRows.length > 0 && (
              <>
                <tr className="bg-red-50 dark:bg-red-950/20 border-b border-gray-200 dark:border-gray-700">
                  <td
                    colSpan={allMonths.length + 2}
                    className="sticky left-0 z-10 px-4 py-2 font-semibold text-red-700 dark:text-red-400"
                  >
                    Выплаты
                  </td>
                </tr>
                {expenseRows.map((row) => (
                  <tr
                    key={row.articleId}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 px-4 py-2 border-r border-gray-200 dark:border-gray-700">
                      {row.articleName}
                    </td>
                    {allMonths.map((month) => (
                      <td
                        key={month}
                        className="px-4 py-2 text-right text-red-600 dark:text-red-400"
                      >
                        {formatMoney(getAmount(row, month), 'RUB')}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-semibold text-red-700 dark:text-red-400 border-l border-gray-200 dark:border-gray-700">
                      {formatMoney(row.total, 'RUB')}
                    </td>
                  </tr>
                ))}
                <tr className="bg-red-100 dark:bg-red-900/20 border-b-2 border-gray-300 dark:border-gray-600 font-semibold">
                  <td className="sticky left-0 z-10 bg-red-100 dark:bg-red-900/20 px-4 py-2 border-r border-gray-200 dark:border-gray-700">
                    Итого выплат
                  </td>
                  {allMonths.map((month) => (
                    <td
                      key={month}
                      className="px-4 py-2 text-right text-red-700 dark:text-red-400"
                    >
                      {formatMoney(monthlyTotals[month].expense, 'RUB')}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right text-red-700 dark:text-red-400 border-l border-gray-200 dark:border-gray-700">
                    {formatMoney(totalExpense, 'RUB')}
                  </td>
                </tr>
              </>
            )}

            {/* Итого чистый поток */}
            <tr className="bg-blue-100 dark:bg-blue-900/20 font-bold border-t-2 border-gray-300 dark:border-gray-600">
              <td className="sticky left-0 z-10 bg-blue-100 dark:bg-blue-900/20 px-4 py-3 border-r border-gray-200 dark:border-gray-700">
                Чистый денежный поток
              </td>
              {allMonths.map((month) => (
                <td
                  key={month}
                  className={`px-4 py-3 text-right ${
                    monthlyTotals[month].income -
                      monthlyTotals[month].expense >=
                    0
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {formatMoney(
                    monthlyTotals[month].income - monthlyTotals[month].expense,
                    'RUB'
                  )}
                </td>
              ))}
              <td
                className={`px-4 py-3 text-right border-l border-gray-200 dark:border-gray-700 ${
                  totalIncome - totalExpense >= 0
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {formatMoney(totalIncome - totalExpense, 'RUB')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
