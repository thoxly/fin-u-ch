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
import { ChartLegend } from './ChartLegend';
import { ExportRow } from '../lib/exportData';
import { ExportMenu } from './ExportMenu';
import { useHighContrast } from '../hooks/useHighContrast';

interface WeeklyFlowChartProps {
  data: AggregatedDataPoint[];
  className?: string;
}

export const WeeklyFlowChart: React.FC<WeeklyFlowChartProps> = ({
  data,
  className = '',
}) => {
  const [highContrast] = useHighContrast();
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

  const buildExportRows = (): ExportRow[] => {
    const rows: ExportRow[] = [];
    (filteredData || []).forEach((p) => {
      rows.push({
        date: p.date || p.label,
        category: 'Поступления',
        amount: p.income,
        type: 'income',
      });
      rows.push({
        date: p.date || p.label,
        category: 'Списания',
        amount: p.expense,
        type: 'expense',
      });
    });
    return rows;
  };

  // Если нет данных, показываем график без столбцов, но с сообщением
  if (!data || data.length === 0 || !hasData) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Динамика поступлений и списаний
          </h3>
          <ExportMenu
            filenameBase="weekly_flow"
            buildRows={buildExportRows}
            columns={['date', 'category', 'amount', 'type']}
          />
        </div>

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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Динамика поступлений и списаний
        </h3>
        <ExportMenu
          filenameBase="weekly_flow"
          buildRows={buildExportRows}
          columns={['date', 'category', 'amount', 'type']}
        />
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
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
            <Tooltip
              formatter={formatTooltipValue}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              content={
                <ChartLegend preferredOrder={['Поступления', 'Списания']} />
              }
              wrapperStyle={{ paddingTop: 8 }}
            />
            <Bar
              dataKey="income"
              fill={highContrast ? '#065f46' : '#10b981'}
              name="Поступления"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="expense"
              fill={highContrast ? '#7c2d12' : '#ef4444'}
              name="Списания"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
