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
import { ChartLegend } from './ChartLegend';
import { ExportMenu } from './ExportMenu';
import { AccountOperationsPanel } from './AccountOperationsPanel';
import { InfoHint } from './InfoHint';
import { useAccountBalancesChart } from '../hooks/useAccountBalancesChart';
import { useIsSmallScreen } from '../hooks/useIsSmallScreen';
import { useIsWideScreen } from '../hooks/useIsWideScreen';
import { CustomTooltip } from './CustomTooltip';

interface AccountBalancesChartProps {
  data: Array<
    {
      date: string;
      label: string;
      operations?: Array<{
        id: string;
        type: string;
        amount: number;
        description: string | null;
        accountId: string | null;
        sourceAccountId: string | null;
        targetAccountId: string | null;
        article: {
          id: string;
          name: string;
        } | null;
      }>;
      hasOperations?: boolean;
    } & {
      [accountName: string]:
        | string
        | number
        | Array<{
            id: string;
            type: string;
            amount: number;
            description: string | null;
            accountId: string | null;
            sourceAccountId: string | null;
            targetAccountId: string | null;
            article: {
              id: string;
              name: string;
            } | null;
          }>
        | boolean
        | undefined;
    }
  >;
  accounts?: Array<{
    id: string;
    name: string;
  }>;
  className?: string;
}

export const AccountBalancesChart: React.FC<AccountBalancesChartProps> = ({
  data,
  accounts = [],
  className = '',
}) => {
  const isSmall = useIsSmallScreen();
  const isWide = useIsWideScreen();

  // Определяем текущую дату (сегодня, без времени)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Обрабатываем данные: обрываем линию на текущей дате
  // Ось X должна показывать весь период, но линия должна обрываться
  const processedData = data
    ? data.map((point) => {
        const pointDate = new Date(point.date);
        pointDate.setHours(0, 0, 0, 0);

        // Если точка находится в будущем (после сегодня), устанавливаем null для всех значений счетов
        if (pointDate > today) {
          const result = { ...point };
          // Устанавливаем null для всех счетов
          accounts.forEach((account) => {
            result[account.name] = null;
          });
          return result;
        }

        return point;
      })
    : undefined;

  const {
    isPanelOpen,
    hoveredOnce,
    setHoveredOnce,
    handleClosePanel,
    selectedPoint,
    accountsWithBalance,
    hasData,
    getAccountColor,
    buildExportRows,
  } = useAccountBalancesChart(processedData || data, false);
  // Tooltip content moved to CustomTooltip with aggregated income/expense

  // data transformation and interactions are handled by hook

  // Если нет данных, показываем график без линий, но с сообщением
  if (!data || data.length === 0 || !hasData) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Остаток денег на счетах
        </h3>

        <div className="chart-body relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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
              {/* Не отображаем легенду и линии, когда нет данных */}
            </LineChart>
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
            Остаток денег на счетах
          </h3>
          <InfoHint
            content={
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Остаток денег на счетах
                </div>
                <div>
                  Отображает баланс всех счетов на каждый день. Позволяет
                  отследить, сколько средств доступно и как менялась сумма во
                  времени.
                </div>
              </div>
            }
          />
        </div>
        {!isSmall && hasData && (
          <ExportMenu
            filenameBase="account_balances"
            buildRows={buildExportRows}
            columns={['date', 'category', 'amount', 'type']}
            entity="reports"
          />
        )}
      </div>
      <div
        className="chart-body relative"
        onMouseEnter={() => setHoveredOnce(true)}
      >
        {!hoveredOnce && hasData && (
          <div className="absolute top-2 right-2 bg-gray-700/80 text-gray-100 text-xs px-3 py-1.5 rounded-lg shadow-sm">
            💡 Наведите на график, чтобы увидеть остатки
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={processedData || data}
            margin={{
              top: 5,
              right: isSmall ? 5 : 30,
              left: isSmall ? 0 : 20,
              bottom: 56,
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
              angle={
                (processedData || data).length > 8 ? (isSmall ? -35 : -45) : 0
              }
              textAnchor={(processedData || data).length > 8 ? 'end' : 'middle'}
              height={
                (processedData || data).length > 8 ? (isSmall ? 60 : 80) : 30
              }
              interval={
                isSmall
                  ? (processedData || data).length <= 10
                    ? 0
                    : (processedData || data).length <= 20
                      ? 1
                      : 'preserveStartEnd'
                  : isWide
                    ? (processedData || data).length <= 31
                      ? 0 // На широкоформатном десктопе показываем все до 31
                      : 'preserveStartEnd'
                    : (processedData || data).length <= 10
                      ? 0 // На неширокоформатном десктопе показываем все до 10
                      : (processedData || data).length <= 20
                        ? 1 // Каждую вторую
                        : 'preserveStartEnd' // Для больших объемов данных показываем только начало и конец
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
                if (!active || !payload || payload.length === 0) {
                  return null;
                }

                // Показываем остатки на счетах в tooltip
                return (
                  <div
                    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg ${isSmall ? 'p-1.5' : 'p-2'} ${isSmall ? 'min-w-[140px] max-w-[calc(100vw-32px)]' : 'min-w-[150px] max-w-[200px]'}`}
                  >
                    <div className={isSmall ? 'mb-1' : 'mb-2'}>
                      <p
                        className={`${isSmall ? 'text-[11px]' : 'text-[13px]'} font-semibold text-gray-900 dark:text-white truncate`}
                      >
                        {label}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {payload.map((entry, index: number) => {
                        if (
                          !entry.dataKey ||
                          entry.value === null ||
                          entry.value === undefined
                        ) {
                          return null;
                        }
                        const accountName = entry.dataKey as string;
                        const balance = entry.value as number;
                        // Получаем цвет счета по его индексу в accountsWithBalance
                        const accountIndex =
                          accountsWithBalance.indexOf(accountName);
                        const color =
                          accountIndex >= 0
                            ? getAccountColor(accountIndex)
                            : entry.color || '#3b82f6';

                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between ${isSmall ? 'text-[10px]' : 'text-[11px]'}`}
                          >
                            <span className="text-gray-600 dark:text-gray-400 truncate mr-2">
                              {accountName}
                            </span>
                            <span
                              className="font-semibold ml-2 whitespace-nowrap"
                              style={{ color }}
                            >
                              {formatMoney(balance)}
                            </span>
                          </div>
                        );
                      })}
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
                content={<ChartLegend />}
                wrapperStyle={{ paddingTop: 8 }}
              />
            )}
            {accountsWithBalance.map((accountName, index) => (
              <Line
                key={accountName}
                type="monotone"
                dataKey={accountName}
                stroke={getAccountColor(index)}
                strokeWidth={2}
                activeDot={false}
                connectNulls={false}
                dot={false}
                name={accountName}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <AccountOperationsPanel
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        point={selectedPoint}
      />
    </div>
  );
};
