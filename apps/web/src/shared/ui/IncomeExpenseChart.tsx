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
import { ExportRow } from '../lib/exportData';
import { ExportMenu } from './ExportMenu';
import { InfoHint } from './InfoHint';
import { useIsSmallScreen } from '../hooks/useIsSmallScreen';

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
  const isSmall = useIsSmallScreen();
  // Показываем все данные для оси X
  const filteredData = data;

  const buildExportRows = (): ExportRow[] => {
    const rows: ExportRow[] = [];
    (filteredData || []).forEach((p) => {
      rows.push({
        date: p.date || p.label,
        category: 'Поступления',
        amount: p.cumulativeIncome,
        type: 'income',
      });
      rows.push({
        date: p.date || p.label,
        category: 'Списания',
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
    return rows;
  };

  // Проверяем, есть ли данные для отображения
  const hasData = filteredData && filteredData.length > 0;

  // Если нет данных, показываем график без линий, но с сообщением
  if (!filteredData || filteredData.length === 0 || !hasData) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Денежный поток
                </h3>
                <InfoHint
                  content={
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Денежный поток
                      </div>
                      <div>
                        Показывает, как меняются поступления, списания и чистый
                        результат во времени. Помогает понять, положительный ли
                        поток и когда происходят основные движения средств.
                      </div>
                    </div>
                  }
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Накопление поступлений, списаний и чистого потока с начала
                периода
              </p>
            </div>
            <ExportMenu
              filenameBase="income_expense"
              buildRows={buildExportRows}
              columns={['date', 'category', 'amount', 'type']}
            />
          </div>
        </div>

        <div className="chart-body relative">
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
                domain={[
                  (min: number) => (Number.isFinite(min) ? min * 0.95 : min),
                  (max: number) => (Number.isFinite(max) ? max * 1.05 : max),
                ]}
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
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Денежный поток
              </h3>
              <InfoHint
                content={
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Денежный поток
                    </div>
                    <div>
                      Показывает, как меняются поступления, списания и чистый
                      результат во времени. Помогает понять, положительный ли
                      поток и когда происходят основные движения средств.
                    </div>
                  </div>
                }
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Накопление поступлений, списаний и чистого потока с начала периода
            </p>
          </div>
          <ExportMenu
            filenameBase="income_expense"
            buildRows={buildExportRows}
            columns={['date', 'category', 'amount', 'type']}
            entity="reports"
          />
        </div>
      </div>

      <div className="chart-body">
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
              domain={[
                (min: number) => (Number.isFinite(min) ? min * 0.95 : min),
                (max: number) => (Number.isFinite(max) ? max * 1.05 : max),
              ]}
            />
            <Tooltip content={<CustomTooltip />} />
            {!isSmall && (
              <Legend
                verticalAlign="bottom"
                align="center"
                content={
                  <ChartLegend
                    preferredOrder={['Поступления', 'Списания', 'Чистый поток']}
                  />
                }
                wrapperStyle={{ paddingTop: 8 }}
              />
            )}
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
                index?: number;
              }) => {
                const { payload, cx, cy, index } = props;
                // Проверяем, есть ли операции поступления в этот период
                const operations = payload?.operations || [];
                const hasIncome = operations.some(
                  (op: Operation) => op.type === 'income'
                );
                if (!hasIncome) return null;
                return (
                  <circle
                    key={`income-${index}-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="#10b981"
                    strokeWidth={1.5}
                    stroke="#10b981"
                  />
                );
              }}
              name="Поступления"
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
                index?: number;
              }) => {
                const { payload, cx, cy, index } = props;
                // Проверяем, есть ли операции списания в этот период
                const operations = payload?.operations || [];
                const hasExpense = operations.some(
                  (op: Operation) => op.type === 'expense'
                );
                if (!hasExpense) return null;
                return (
                  <circle
                    key={`expense-${index}-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="#ef4444"
                    strokeWidth={1.5}
                    stroke="#ef4444"
                  />
                );
              }}
              name="Списания"
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
