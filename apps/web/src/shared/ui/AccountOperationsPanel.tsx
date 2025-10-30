import React from 'react';
import { OffCanvas } from './OffCanvas';
import { formatMoney } from '../lib/money';
import type { Article } from '@fin-u-ch/shared';
import { OperationType } from '@fin-u-ch/shared';

type Operation = {
  id: string;
  type: OperationType | string;
  amount: number;
  description: string | null;
  accountId: string | null;
  sourceAccountId: string | null;
  targetAccountId: string | null;
  article: Pick<Article, 'id' | 'name'> | null;
};

export type AccountPoint = {
  label: string;
  operations?: Operation[];
};

interface AccountOperationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  point: AccountPoint | null;
}

export const AccountOperationsPanel: React.FC<AccountOperationsPanelProps> = ({
  isOpen,
  onClose,
  point,
}) => {
  return (
    <OffCanvas
      isOpen={isOpen}
      onClose={onClose}
      title={point ? `Детали операций — ${point.label}` : 'Детали операций'}
    >
      {point && (
        <div className="space-y-2">
          {Array.isArray(point.operations) && point.operations.length > 0 ? (
            point.operations.map((op) => (
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
  );
};
