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
import { InfoHint } from './InfoHint';
import { CustomTooltip } from './CustomTooltip';
import { useIsSmallScreen } from '../hooks/useIsSmallScreen';
import { useIsWideScreen } from '../hooks/useIsWideScreen';

interface WeeklyFlowChartProps {
  data: AggregatedDataPoint[];
  className?: string;
}

export const WeeklyFlowChart: React.FC<WeeklyFlowChartProps> = ({
  data,
  className = '',
}) => {
  const isSmall = useIsSmallScreen();
  const isWide = useIsWideScreen();
  // Tooltip content overridden below via custom renderer

  // Показываем все данные
  const filteredData = data;

  // Проверяем, есть ли данные для отображения
  // Проверяем не только наличие массива, но и наличие реальных ненулевых значений
  const hasData =
    filteredData &&
    filteredData.length > 0 &&
    filteredData.some(
      (point) =>
        (point.income !== null &&
          point.income !== undefined &&
          point.income !== 0) ||
        (point.expense !== null &&
          point.expense !== undefined &&
          point.expense !== 0)
    );

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
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Динамика поступлений и списаний
            </h3>
            <InfoHint
              content={
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Динамика поступлений и списаний
                  </div>
                  <div>
                    Показывает активность по операциям: когда и в каком объёме
                    поступали поступления и выполнялись списания. Помогает
                    выявить пики и спады финансовой активности.
                  </div>
                </div>
              }
            />
          </div>
          {!isSmall && (
            <ExportMenu
              filenameBase="weekly_flow"
              buildRows={buildExportRows}
              columns={['date', 'category', 'amount', 'type']}
              entity="reports"
            />
          )}
        </div>

        <div className="chart-body relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data || []}
              margin={{
                top: 5,
                right: isSmall ? 5 : 30,
                left: isSmall ? 0 : 20,
                bottom: 48,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-600"
              />
              <XAxis
                dataKey="label"
                className="text-gray-600 dark:text-gray-400"
                fontSize={isSmall ? 10 : 12}
              />
              <YAxis
                className="text-gray-600 dark:text-gray-400"
                fontSize={isSmall ? 10 : 12}
                tickFormatter={(value) => formatMoney(value)}
                width={isSmall ? 60 : 80}
                domain={[
                  (min: number) => (Number.isFinite(min) ? min * 0.95 : min),
                  (max: number) => (Number.isFinite(max) ? max * 1.05 : max),
                ]}
              />
              <Tooltip
                content={({ active, payload, label }) => (
                  <CustomTooltip
                    active={active}
                    payload={payload}
                    label={label}
                  />
                )}
                labelFormatter={(label) => `${label}`}
                wrapperStyle={
                  isSmall ? { zIndex: 1000, pointerEvents: 'none' } : undefined
                }
                position={isSmall ? { x: 10, y: 10 } : undefined}
              />
              {/* Не отображаем легенду и столбцы, когда нет данных */}
            </BarChart>
          </ResponsiveContainer>

          {/* Сообщение поверх графика */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="text-center text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-lg">
              <div className="text-xs font-medium leading-tight">
                <div>Нет данных</div>
                <div>за выбранный период</div>
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
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Динамика поступлений и списаний
          </h3>
          <InfoHint
            content={
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Динамика поступлений и списаний
                </div>
                <div>
                  Показывает активность по операциям: когда и в каком объёме
                  поступали поступления и выполнялись списания. Помогает выявить
                  пики и спады финансовой активности.
                </div>
              </div>
            }
          />
        </div>
        {!isSmall && hasData && (
          <ExportMenu
            filenameBase="weekly_flow"
            buildRows={buildExportRows}
            columns={['date', 'category', 'amount', 'type']}
          />
        )}
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            margin={{
              top: 5,
              right: isSmall ? 5 : 30,
              left: isSmall ? 0 : 20,
              bottom: 28,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-600"
            />
            <XAxis
              dataKey="label"
              className="text-gray-600 dark:text-gray-400"
              fontSize={isSmall ? 10 : 12}
              tick={{ fontSize: isSmall ? 9 : 11 }}
              angle={filteredData.length > 8 ? (isSmall ? -35 : -45) : 0}
              textAnchor={filteredData.length > 8 ? 'end' : 'middle'}
              height={filteredData.length > 8 ? (isSmall ? 60 : 80) : 30}
              interval={
                isSmall
                  ? filteredData.length <= 10
                    ? 0
                    : filteredData.length <= 20
                      ? 1
                      : 2
                  : isWide
                    ? filteredData.length <= 31
                      ? 0 // На широкоформатном десктопе показываем все до 31
                      : 'preserveStartEnd'
                    : filteredData.length <= 10
                      ? 0 // На неширокоформатном десктопе показываем все до 10
                      : filteredData.length <= 20
                        ? 1 // Каждую вторую
                        : 2 // Каждую третью (для 31 точки = ~10 меток)
              }
            />
            <YAxis
              className="text-gray-600 dark:text-gray-400"
              fontSize={isSmall ? 10 : 12}
              tickFormatter={(value) => formatMoney(value)}
              width={isSmall ? 60 : 80}
              domain={[
                (min: number) => (Number.isFinite(min) ? min * 0.95 : min),
                (max: number) => (Number.isFinite(max) ? max * 1.05 : max),
              ]}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const p = payload[0]?.payload as
                  | AggregatedDataPoint
                  | undefined;
                if (!p) return null;
                return (
                  <div
                    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg ${isSmall ? 'p-1.5' : 'p-2'} min-w-[150px] max-w-[200px]`}
                  >
                    <div className={isSmall ? 'mb-1' : 'mb-1'}>
                      <p
                        className={`${isSmall ? 'text-[11px]' : 'text-[13px]'} font-semibold text-gray-900 dark:text-white truncate`}
                      >
                        {label}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <div
                        className={`flex items-center justify-between ${isSmall ? 'text-[10px]' : 'text-[11px]'}`}
                      >
                        <span className="text-gray-600 dark:text-gray-400">
                          Поступления
                        </span>
                        <span className="font-semibold text-green-600 dark:text-green-400 ml-2">
                          {formatMoney(p.income || 0)}
                        </span>
                      </div>
                      <div
                        className={`flex items-center justify-between ${isSmall ? 'text-[10px]' : 'text-[11px]'}`}
                      >
                        <span className="text-gray-600 dark:text-gray-400">
                          Списания
                        </span>
                        <span className="font-semibold text-red-600 dark:text-red-400 ml-2">
                          {formatMoney(p.expense || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
              wrapperStyle={
                isSmall ? { zIndex: 1000, pointerEvents: 'none' } : undefined
              }
              position={isSmall ? { x: 10, y: 10 } : undefined}
            />
            {!isSmall && (
              <Legend
                verticalAlign="bottom"
                align="center"
                content={
                  <ChartLegend preferredOrder={['Поступления', 'Списания']} />
                }
                wrapperStyle={{ paddingTop: 2 }}
              />
            )}
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
