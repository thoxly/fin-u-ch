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
import { CustomTooltip } from './CustomTooltip';
import { AccountOperationsPanel } from './AccountOperationsPanel';
import { InfoHint } from './InfoHint';
import { useAccountBalancesChart } from '../hooks/useAccountBalancesChart';
import { useIsSmallScreen } from '../hooks/useIsSmallScreen';

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
  const {
    isPanelOpen,
    hoveredOnce,
    setHoveredOnce,
    handleOpenPanel,
    handleClosePanel,
    selectedPoint,
    accountsWithBalance,
    hasData,
    getAccountColor,
    buildExportRows,
  } = useAccountBalancesChart(data, false);
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
              <Tooltip
                content={({ active, payload, label }) => (
                  <CustomTooltip
                    active={active}
                    payload={payload}
                    label={label}
                  />
                )}
                labelFormatter={(label) => `${label}`}
              />
              {/* Не отображаем легенду и линии, когда нет данных */}
            </LineChart>
          </ResponsiveContainer>

          {/* Сообщение поверх графика */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-4 py-2 rounded-lg">
              <div className="text-2xl mb-1">💰</div>
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
        <ExportMenu
          filenameBase="account_balances"
          buildRows={buildExportRows}
          columns={['date', 'category', 'amount', 'type']}
        />
      </div>
      <div
        className="chart-body relative"
        onMouseEnter={() => setHoveredOnce(true)}
      >
        {!hoveredOnce && hasData && (
          <div className="absolute top-2 right-2 bg-gray-700/80 text-gray-100 text-xs px-3 py-1.5 rounded-lg shadow-sm">
            💡 Наведите на точку, чтобы увидеть операции
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 56 }}
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
              angle={data.length > 8 ? -45 : 0}
              textAnchor={data.length > 8 ? 'end' : 'middle'}
              height={data.length > 8 ? 80 : 30}
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
            <Tooltip
              cursor={false}
              content={({ active, payload, label }) => {
                const currentPoint = data.find((d) => d.label === label);
                const hasOps = currentPoint?.operations?.some(
                  (op) => op.amount && op.amount !== 0
                );
                if (!active || !hasOps) return null;
                return (
                  <CustomTooltip
                    active={active}
                    payload={payload}
                    label={label}
                  />
                );
              }}
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
                dot={(props) => {
                  // Показываем точку только для счетов, по которым есть операции в этот день
                  const dataPoint = data[props.index];
                  const operations = dataPoint?.operations || [];
                  if (!operations.length) return null;

                  const account = accounts.find(
                    (acc) => acc.name === accountName
                  );
                  const accountId = account?.id;
                  if (!accountId) return null;

                  const hasAccountOperation = operations.some(
                    (op) =>
                      (op.type === 'income' || op.type === 'expense') &&
                      op.amount &&
                      op.amount !== 0 &&
                      (op.accountId === accountId ||
                        op.sourceAccountId === accountId ||
                        op.targetAccountId === accountId)
                  );

                  if (!hasAccountOperation) return null;
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill={getAccountColor(index)}
                      strokeWidth={2}
                      stroke={getAccountColor(index)}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleOpenPanel(props.index)}
                    />
                  );
                }}
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
