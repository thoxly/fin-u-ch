import React, { useMemo, useState, useCallback } from 'react';
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
import { ExportRow } from '../lib/exportData';
import { ExportMenu } from './ExportMenu';
import { useHighContrast } from '../hooks/useHighContrast';
import { CustomTooltip } from './CustomTooltip';
import { OffCanvas } from './OffCanvas';
import { InfoHint } from './InfoHint';

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
  const [highContrast] = useHighContrast();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    null
  );
  const [hoveredOnce, setHoveredOnce] = useState(false);

  const selectedPoint = useMemo(() => {
    if (selectedPointIndex == null) return null;
    return data?.[selectedPointIndex] ?? null;
  }, [selectedPointIndex, data]);

  const handleOpenPanel = useCallback((index: number) => {
    setSelectedPointIndex(index);
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);
  // Tooltip content moved to CustomTooltip with aggregated income/expense

  // Получаем цвета для счетов
  const getAccountColor = (index: number) => {
    const colors = highContrast
      ? ['#1f2937', '#000000', '#065f46', '#7c2d12', '#111827'] // high contrast dark tones
      : ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    return colors[index % colors.length];
  };

  // Получаем все ключи счетов (исключая date, label, operations, hasOperations)
  const accountKeys =
    data && data.length > 0
      ? Object.keys(data[0]).filter(
          (key) =>
            key !== 'date' &&
            key !== 'label' &&
            key !== 'operations' &&
            key !== 'hasOperations'
        )
      : [];

  // Фильтруем счета, которые имеют ненулевые остатки хотя бы в одной точке
  const accountsWithBalance = accountKeys.filter((accountKey) => {
    return data.some((point) => {
      const value = point[accountKey];
      return typeof value === 'number' && value > 0;
    });
  });

  // Проверяем, есть ли данные для отображения
  const hasData = accountsWithBalance.length > 0;

  const buildExportRows = (): ExportRow[] => {
    const rows: ExportRow[] = [];
    (data || []).forEach((point) => {
      accountsWithBalance.forEach((accountName) => {
        const value = point[accountName];
        if (typeof value === 'number') {
          rows.push({
            date: point.date || point.label,
            category: accountName,
            amount: value,
            type: 'balance',
          });
        }
      });
    });
    return rows;
  };

  // Если нет данных, показываем график без линий, но с сообщением
  if (!data || data.length === 0 || !hasData) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Остаток денег на счетах
        </h3>

        <div className="h-80 relative">
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
              />
              <Tooltip
                content={<CustomTooltip />}
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
      <div className="h-80 relative" onMouseEnter={() => setHoveredOnce(true)}>
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
            <Legend
              verticalAlign="bottom"
              align="center"
              content={<ChartLegend />}
              wrapperStyle={{ paddingTop: 8 }}
            />
            {accountsWithBalance.map((accountName, index) => (
              <Line
                key={accountName}
                type="monotone"
                dataKey={accountName}
                stroke={getAccountColor(index)}
                strokeWidth={highContrast ? 3 : 2}
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
                      r={highContrast ? 5 : 4}
                      fill={getAccountColor(index)}
                      strokeWidth={highContrast ? 2.5 : 2}
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

      <OffCanvas
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        title={
          selectedPoint
            ? `Детали операций — ${selectedPoint.label}`
            : 'Детали операций'
        }
      >
        {selectedPoint && (
          <div className="space-y-2">
            {Array.isArray(selectedPoint.operations) &&
            selectedPoint.operations.length > 0 ? (
              selectedPoint.operations.map((op) => (
                <div
                  key={op.id}
                  className="text-sm p-3 rounded border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-gray-700 dark:text-gray-300">
                        {op.article?.name || 'Операция'}
                      </div>
                      {op.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {op.description}
                        </div>
                      )}
                    </div>
                    <div
                      className={
                        op.type === 'income'
                          ? 'text-green-600 dark:text-green-400 font-semibold'
                          : op.type === 'expense'
                            ? 'text-red-600 dark:text-red-400 font-semibold'
                            : 'text-blue-600 dark:text-blue-400 font-semibold'
                      }
                    >
                      {formatMoney(op.amount)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Нет операций в этот день
              </div>
            )}
          </div>
        )}
      </OffCanvas>
    </div>
  );
};
