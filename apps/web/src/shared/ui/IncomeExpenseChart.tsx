import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatMoney } from '../lib/money';
import { CustomTooltip } from './CustomTooltip';
import { ChartLegend } from './ChartLegend';
import { ExportButton } from './ExportButton';
import { downloadCsv, ExportRow } from '../lib/exportData';
import { useHighContrast } from '../hooks/useHighContrast';

interface Operation {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  article: {
    id: string;
    name: string;
  } | null;
}

interface CumulativeDataPoint {
  date: string;
  label: string;
  cumulativeIncome: number;
  cumulativeExpense: number;
  cumulativeNetCashFlow: number;
  operations?: Operation[];
  hasOperations?: boolean;
}

interface IncomeExpenseChartProps {
  data: CumulativeDataPoint[];
  className?: string;
}

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({
  data,
  className = '',
}) => {
  const [highContrast] = useHighContrast();
  // Показываем все данные для оси X
  const filteredData = data;

  // Проверяем, есть ли данные для отображения
  const hasData = filteredData && filteredData.length > 0;

  // Если нет данных, показываем график без линий, но с сообщением
  if (!filteredData || filteredData.length === 0 || !hasData) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Денежный поток
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Накопление доходов, расходов и чистего потока с начала периода
              </p>
            </div>
            <ExportButton
              onClick={() => downloadCsv([], 'income_expense.csv')}
            />
          </div>
        </div>

        <div className="h-80 relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData || []}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-600"
              />
              <XAxis
                dataKey="label"
                className="text-gray-600 dark:text-gray-400"
                fontSize={12}
                tick={{ fontSize: 11 }}
                angle={filteredData && filteredData.length > 8 ? -45 : 0}
                textAnchor={
                  filteredData && filteredData.length > 8 ? 'end' : 'middle'
                }
                height={filteredData && filteredData.length > 8 ? 80 : 30}
              />
              <YAxis
                className="text-gray-600 dark:text-gray-400"
                fontSize={12}
                tickFormatter={(value) => formatMoney(value)}
              />
              <Tooltip content={<CustomTooltip />} />
            </LineChart>
          </ResponsiveContainer>

          {/* Сообщение поверх графика */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-4 py-2 rounded-lg">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-sm font-medium">
                Нет данных за выбранный период
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Денежный поток
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Накопление доходов, расходов и чистого потока с начала периода
            </p>
          </div>
          <ExportButton
            onClick={() => {
              const rows: ExportRow[] = [];
              filteredData.forEach((p) => {
                rows.push({
                  date: p.date || p.label,
                  category: 'Доходы',
                  amount: p.cumulativeIncome,
                  type: 'income',
                });
                rows.push({
                  date: p.date || p.label,
                  category: 'Расходы',
                  amount: p.cumulativeExpense,
                  type: 'expense',
                });
                rows.push({
                  date: p.date || p.label,
                  category: 'Чистый поток',
                  amount: p.cumulativeNetCashFlow,
                  type: 'net',
                });
              });
              downloadCsv(rows, 'income_expense.csv', [
                'date',
                'category',
                'amount',
                'type',
              ]);
            }}
            title="Экспорт"
          />
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 5, right: 30, left: 20, bottom: 48 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-600"
            />
            <XAxis
              dataKey="label"
              className="text-gray-600 dark:text-gray-400"
              fontSize={12}
              tick={{ fontSize: 11 }}
              angle={filteredData.length > 8 ? -45 : 0}
              textAnchor={filteredData.length > 8 ? 'end' : 'middle'}
              height={filteredData.length > 8 ? 80 : 30}
            />
            <YAxis
              className="text-gray-600 dark:text-gray-400"
              fontSize={12}
              tickFormatter={(value) => formatMoney(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              align="center"
              content={
                <ChartLegend
                  preferredOrder={['Доходы', 'Расходы', 'Чистый поток']}
                />
              }
              wrapperStyle={{ paddingTop: 8 }}
            />
            <Line
              type="monotone"
              dataKey="cumulativeIncome"
              stroke={highContrast ? '#065f46' : '#10b981'}
              strokeWidth={highContrast ? 3 : 1.5}
              strokeOpacity={highContrast ? 0.9 : 0.6}
              dot={(props: {
                payload?: CumulativeDataPoint;
                cx?: number;
                cy?: number;
              }) => {
                const { payload, cx, cy } = props;
                // Проверяем, есть ли операции дохода в этот период
                const operations = payload?.operations || [];
                const hasIncome = operations.some(
                  (op: Operation) => op.type === 'income'
                );
                if (!hasIncome) return null;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={highContrast ? 4 : 3}
                    fill={highContrast ? '#065f46' : '#10b981'}
                    strokeWidth={highContrast ? 2 : 1.5}
                    stroke={highContrast ? '#065f46' : '#10b981'}
                  />
                );
              }}
              name="Доходы"
            />
            <Line
              type="monotone"
              dataKey="cumulativeExpense"
              stroke={highContrast ? '#7c2d12' : '#ef4444'}
              strokeWidth={highContrast ? 3 : 1.5}
              strokeOpacity={highContrast ? 0.9 : 0.6}
              dot={(props: {
                payload?: CumulativeDataPoint;
                cx?: number;
                cy?: number;
              }) => {
                const { payload, cx, cy } = props;
                // Проверяем, есть ли операции расхода в этот период
                const operations = payload?.operations || [];
                const hasExpense = operations.some(
                  (op: Operation) => op.type === 'expense'
                );
                if (!hasExpense) return null;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={highContrast ? 4 : 3}
                    fill={highContrast ? '#7c2d12' : '#ef4444'}
                    strokeWidth={highContrast ? 2 : 1.5}
                    stroke={highContrast ? '#7c2d12' : '#ef4444'}
                  />
                );
              }}
              name="Расходы"
            />
            <Line
              type="monotone"
              dataKey="cumulativeNetCashFlow"
              stroke={highContrast ? '#111827' : '#3b82f6'}
              strokeWidth={highContrast ? 4 : 3}
              strokeOpacity={highContrast ? 1 : 0.8}
              dot={false}
              name="Чистый поток"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
