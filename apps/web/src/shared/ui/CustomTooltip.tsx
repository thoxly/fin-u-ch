import React, { useState, useCallback } from 'react';
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CumulativeDataPoint }>;
  label?: string;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  const [showAll, setShowAll] = useState(false);
  const maxVisible = 3;

  const handleToggleShowAll = useCallback(() => {
    setShowAll((prev) => !prev);
  }, []);

  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload as CumulativeDataPoint;
  const operations = data.operations || [];

  // Не показываем tooltip, если нет операций
  if (operations.length === 0) return null;

  const visibleOperations = showAll
    ? operations
    : operations.slice(0, maxVisible);
  const hasMoreOperations = operations.length > maxVisible;

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
          {visibleOperations.map((op) => (
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
          ))}
          {hasMoreOperations && !showAll && (
            <button
              onClick={handleToggleShowAll}
              className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-1"
            >
              Показать все ({operations.length - maxVisible} еще)...
            </button>
          )}
          {hasMoreOperations && showAll && (
            <button
              onClick={handleToggleShowAll}
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
