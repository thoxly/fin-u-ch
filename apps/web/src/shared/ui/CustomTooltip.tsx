import React from 'react';
import type { TooltipProps } from 'recharts';
import type { Article } from '@fin-u-ch/shared';
import { OperationType } from '@fin-u-ch/shared';
type RechartsValue = number | string | (number | string)[];
type RechartsName = number | string;
import { formatMoney } from '../lib/money';

type OperationLite = {
  id: string;
  type: OperationType | string;
  amount: number;
  description: string | null;
  article: Pick<Article, 'id' | 'name'> | null;
};

interface CumulativeDataPoint {
  date: string;
  label: string;
  cumulativeIncome: number;
  cumulativeExpense: number;
  cumulativeNetCashFlow: number;
  operations?: OperationLite[];
  hasOperations?: boolean;
}

type CustomTooltipProps = TooltipProps<RechartsValue, RechartsName>;

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const first = payload[0] as { payload?: CumulativeDataPoint } | undefined;
  const data = first?.payload;
  if (!data) return null;
  const operations = data.operations || [];

  // Агрегируем суммы по типам
  const incomeTotal = operations
    .filter((op) => op.type === 'income')
    .reduce((sum, op) => sum + op.amount, 0);
  const expenseTotal = operations
    .filter((op) => op.type === 'expense')
    .reduce((sum, op) => sum + op.amount, 0);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[170px]">
      <div className="mb-2">
        <p className="text-[13px] font-semibold text-gray-900 dark:text-white">
          {label}
        </p>
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-600 dark:text-gray-400">Доход</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatMoney(incomeTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-600 dark:text-gray-400">Расход</span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            {formatMoney(expenseTotal)}
          </span>
        </div>
      </div>
    </div>
  );
};
