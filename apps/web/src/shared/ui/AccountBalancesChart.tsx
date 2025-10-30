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
import { ExportRow } from '../lib/exportData';
import { ExportMenu } from './ExportMenu';
import { useHighContrast } from '../hooks/useHighContrast';

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
  const formatTooltipValue = (
    value: number,
    name: string,
    props: { payload?: { index: number } }
  ) => {
    const dataPoint = data[props.payload?.index];
    const operations = dataPoint?.operations || [];

    // Находим ID счета по имени
    const account = accounts.find((acc) => acc.name === name);
    const accountId = account?.id;

    // Находим операции для данного счета
    const accountOperations = operations.filter(
      (op) =>
        op.accountId === accountId ||
        op.sourceAccountId === accountId ||
        op.targetAccountId === accountId
    );

    return [
      <div key="value">
        <div className="font-semibold text-gray-900 dark:text-white">
          {formatMoney(value)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{name}</div>
        {accountOperations.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Операции:
            </div>
            {accountOperations.map((op) => (
              <div
                key={op.id}
                className="text-xs text-gray-600 dark:text-gray-400"
              >
                <div className="flex justify-between">
                  <span>
                    {op.type === 'income'
                      ? 'Поступление'
                      : op.type === 'expense'
                        ? 'Списание'
                        : 'Перевод'}
                  </span>
                  <span className="font-medium">{formatMoney(op.amount)}</span>
                </div>
                {op.article && (
                  <div className="text-gray-500 dark:text-gray-500">
                    {op.article.name}
                  </div>
                )}
                {op.description && (
                  <div className="text-gray-500 dark:text-gray-500">
                    {op.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>,
    ];
  };

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
                formatter={(value, name, props) =>
                  formatTooltipValue(value as number, name as string, props)
                }
                labelFormatter={(label) => `Дата: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  maxWidth: '300px',
                }}
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Остаток денег на счетах
        </h3>
        <ExportMenu
          filenameBase="account_balances"
          buildRows={buildExportRows}
          columns={['date', 'category', 'amount', 'type']}
        />
      </div>
      <div className="h-80">
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
              formatter={(value, name, props) =>
                formatTooltipValue(value as number, name as string, props)
              }
              labelFormatter={(label) => `Дата: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                maxWidth: '300px',
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
                dot={(props) => {
                  // Показываем точку только если есть операции в этот день
                  const dataPoint = data[props.index];
                  const hasOperations = dataPoint?.hasOperations || false;
                  if (!hasOperations) {
                    return null;
                  }
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={highContrast ? 5 : 4}
                      fill={getAccountColor(index)}
                      strokeWidth={highContrast ? 2.5 : 2}
                      stroke={getAccountColor(index)}
                    />
                  );
                }}
                name={accountName}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
