import React, { useState } from 'react';
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

// Кастомный Tooltip с отображением операций
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: CumulativeDataPoint }>;
  label?: string;
}) => {
  const [showAll, setShowAll] = useState(false);
  const maxVisible = 3;

  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload as CumulativeDataPoint;
  const operations = data.operations || [];

  // Не показываем tooltip, если нет операций
  if (operations.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[300px]">
      {/* Дата */}
      <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {label}
        </p>
      </div>

      {/* Список операций */}
      <div className="max-h-[300px] overflow-y-auto">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Операции ({operations.length}):
        </p>
        <div className="space-y-1">
          {(showAll ? operations : operations.slice(0, maxVisible)).map(
            (op) => (
              <div
                key={op.id}
                className="text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span
                    className={`font-medium ${
                      op.type === 'income'
                        ? 'text-green-600 dark:text-green-400'
                        : op.type === 'expense'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {formatMoney(op.amount)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">
                    {op.type === 'income'
                      ? 'Доход'
                      : op.type === 'expense'
                        ? 'Расход'
                        : 'Перевод'}
                  </span>
                </div>
                {op.article && (
                  <div className="text-gray-600 dark:text-gray-400 truncate">
                    {op.article.name}
                  </div>
                )}
                {op.description && (
                  <div className="text-gray-500 dark:text-gray-500 text-[10px] truncate mt-1">
                    {op.description}
                  </div>
                )}
              </div>
            )
          )}
          {operations.length > maxVisible && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-1"
            >
              Показать все ({operations.length - maxVisible} еще)...
            </button>
          )}
          {operations.length > maxVisible && showAll && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-1"
            >
              Свернуть
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({
  data,
  className = '',
}) => {
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Денежный поток
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Накопление доходов, расходов и чистого потока с начала периода
          </p>
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Денежный поток
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Накопление доходов, расходов и чистого потока с начала периода
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
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
            <Legend />
            <Line
              type="monotone"
              dataKey="cumulativeIncome"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeOpacity={0.6}
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
                    r={3}
                    fill="#10b981"
                    strokeWidth={1.5}
                    stroke="#10b981"
                  />
                );
              }}
              name="Доходы"
            />
            <Line
              type="monotone"
              dataKey="cumulativeExpense"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeOpacity={0.6}
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
                    r={3}
                    fill="#ef4444"
                    strokeWidth={1.5}
                    stroke="#ef4444"
                  />
                );
              }}
              name="Расходы"
            />
            <Line
              type="monotone"
              dataKey="cumulativeNetCashFlow"
              stroke="#3b82f6"
              strokeWidth={3}
              strokeOpacity={0.8}
              dot={false}
              name="Чистый поток"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
