import { useState, useRef, useEffect } from 'react';
import { Calendar, Edit, XCircle } from 'lucide-react';
import {
  useGetOperationsQuery,
  useUpdateOperationMutation,
  useDeleteOperationMutation,
} from '../../store/api/operationsApi';
import { formatDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import type { Operation } from '@fin-u-ch/shared';
import { Periodicity } from '@fin-u-ch/shared';
import { useNotification } from '../../shared/hooks/useNotification';

interface RecurringOperationsProps {
  onEdit: (operation: Operation) => void;
}

export const RecurringOperations = ({ onEdit }: RecurringOperationsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useNotification();

  const { data: allOperations = [] } = useGetOperationsQuery();
  const [updateOperation] = useUpdateOperationMutation();
  const [deleteOperation] = useDeleteOperationMutation();

  const recurringTemplates = allOperations.filter(
    (op) => op.repeat !== 'none' && !op.recurrenceParentId
  );

  // Закрытие при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDisableRecurrence = async (
    operation: Operation,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    // Проверяем, есть ли неподтвержденные дочерние операции
    const unconfirmedChildren = allOperations.filter(
      (op) => op.recurrenceParentId === operation.id && !op.isConfirmed
    );

    let confirmMessage = 'Отключить повторение для этой операции?';
    if (unconfirmedChildren.length > 0) {
      confirmMessage = `Отключить повторение?\n\nБудет удалено ${unconfirmedChildren.length} неподтвержденных операций.`;
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      // Сначала удаляем неподтвержденные дочерние операции
      if (unconfirmedChildren.length > 0) {
        await Promise.all(
          unconfirmedChildren.map((child) => deleteOperation(child.id).unwrap())
        );
      }

      // Затем отключаем повторение
      await updateOperation({
        id: operation.id,
        data: { repeat: Periodicity.NONE, recurrenceEndDate: null },
      }).unwrap();

      showSuccess(
        unconfirmedChildren.length > 0
          ? `Повторение отключено, удалено ${unconfirmedChildren.length} операций`
          : 'Повторение отключено'
      );
    } catch (error) {
      console.error('Failed to disable recurrence:', error);
      showError('Ошибка при отключении повторения');
    }
  };

  const handleEdit = (operation: Operation, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    onEdit(operation);
  };

  const getPeriodicityLabel = (repeat: string) => {
    const labels: Record<string, string> = {
      daily: 'Ежедневно',
      weekly: 'Еженедельно',
      monthly: 'Ежемесячно',
      quarterly: 'Ежеквартально',
      semiannual: 'Раз в полгода',
      annual: 'Ежегодно',
    };
    return labels[repeat] || repeat;
  };

  if (recurringTemplates.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-500 dark:hover:border-primary-400 transition-colors flex items-center gap-2"
        title="Повторяющиеся операции"
      >
        <Calendar
          size={18}
          className="text-primary-600 dark:text-primary-400"
        />
        <span className="hidden sm:inline">Повторяющиеся</span>
        <span className="absolute -top-2 -right-2 bg-primary-600 dark:bg-primary-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {recurringTemplates.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 right-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[400px] overflow-y-auto">
          <div className="p-2 space-y-1">
            {recurringTemplates.map((op) => (
              <div
                key={op.id}
                className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {formatMoney(op.amount, op.currency)}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                        {getPeriodicityLabel(op.repeat)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {op.description || 'Без описания'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                      С {formatDate(op.operationDate)}
                      {op.recurrenceEndDate &&
                        ` до ${formatDate(op.recurrenceEndDate)}`}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => handleEdit(op, e)}
                      className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title="Редактировать"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDisableRecurrence(op, e)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                      title="Отключить"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
