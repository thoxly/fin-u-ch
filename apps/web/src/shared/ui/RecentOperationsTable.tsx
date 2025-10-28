import React from 'react';
import { formatMoney } from '../lib/money';
import { Operation } from '@shared/types/operations';

interface RecentOperationsTableProps {
  operations: Operation[];
  className?: string;
}

export const RecentOperationsTable: React.FC<RecentOperationsTableProps> = ({
  operations,
  className = '',
}) => {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getOperationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      income: 'Поступление',
      expense: 'Списание',
      transfer: 'Перевод',
    };
    return labels[type] || type;
  };

  const getOperationTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      income: 'text-green-600 dark:text-green-400',
      expense: 'text-red-600 dark:text-red-400',
      transfer: 'text-blue-600 dark:text-blue-400',
    };
    return colors[type] || 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Последние операции
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Дата
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Тип
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Сумма
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Статья
              </th>
            </tr>
          </thead>
          <tbody>
            {operations.slice(0, 5).map((operation) => (
              <tr
                key={operation.id}
                className="border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <td className="py-3 px-2 text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(operation.operationDate)}
                </td>
                <td className="py-3 px-2 text-sm">
                  <span className={getOperationTypeColor(operation.type)}>
                    {getOperationTypeLabel(operation.type)}
                  </span>
                </td>
                <td className="py-3 px-2 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                  {formatMoney(operation.amount, operation.currency)}
                </td>
                <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                  {operation.description || 'Без описания'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {operations.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Нет операций за выбранный период
          </div>
        )}
      </div>
      {operations.length > 0 && (
        <div className="mt-4 text-center">
          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
            → Все операции
          </button>
        </div>
      )}
    </div>
  );
};
