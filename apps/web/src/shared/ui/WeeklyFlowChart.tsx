import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatMoney } from '../lib/money';
import { AggregatedDataPoint } from '../lib/dataAggregation';

interface WeeklyFlowChartProps {
  data: AggregatedDataPoint[];
  className?: string;
}

export const WeeklyFlowChart: React.FC<WeeklyFlowChartProps> = ({
  data,
  className = '',
}) => {
  const formatTooltipValue = (value: number, name: string) => {
    const labels: Record<string, string> = {
      income: 'Поступления',
      expense: 'Списания',
    };
    return [formatMoney(value), labels[name] || name];
  };

  // Показываем все данные
  const filteredData = data;

  // Проверяем, есть ли данные для отображения
  const hasData = filteredData && filteredData.length > 0;

  // Если нет данных, показываем график без столбцов, но с сообщением
  if (!data || data.length === 0 || !hasData) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Динамика поступлений и списаний
        </h3>

        <div className="h-80 relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data || []}
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
              />
              <YAxis
                className="text-gray-600 dark:text-gray-400"
                fontSize={12}
                tickFormatter={(value) => formatMoney(value)}
              />
              <Tooltip
                formatter={formatTooltipValue}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              {/* Не отображаем легенду и столбцы, когда нет данных */}
            </BarChart>
          </ResponsiveContainer>

          {/* Сообщение поверх графика */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-4 py-2 rounded-lg">
              <div className="text-2xl mb-1">📈</div>
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
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Динамика поступлений и списаний
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
            />
            <YAxis
              className="text-gray-600 dark:text-gray-400"
              fontSize={12}
              tickFormatter={(value) => formatMoney(value)}
            />
            <Tooltip
              formatter={formatTooltipValue}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Bar
              dataKey="income"
              fill="#10b981"
              name="Поступления"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="expense"
              fill="#ef4444"
              name="Списания"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
