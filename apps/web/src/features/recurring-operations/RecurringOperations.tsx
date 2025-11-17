import { useState, useRef, useEffect } from 'react';
import { Calendar, Edit, XCircle, X } from 'lucide-react';
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
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { ConfirmDeleteModal } from '../../shared/ui/ConfirmDeleteModal';

interface RecurringOperationsProps {
  onEdit: (operation: Operation) => void;
}

export const RecurringOperations = ({ onEdit }: RecurringOperationsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useNotification();
  const isMobile = useIsMobile();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    operation: Operation | null;
    childrenCount: number;
  }>({
    isOpen: false,
    operation: null,
    childrenCount: 0,
  });

  // Получаем только шаблоны
  const { data: allOperations = [] } = useGetOperationsQuery({
    isTemplate: true,
  });
  const [updateOperation] = useUpdateOperationMutation();
  const [deleteOperation] = useDeleteOperationMutation();

  const recurringTemplates = allOperations;

  // Закрытие при клике вне (только для десктопной версии)
  useEffect(() => {
    if (isMobile) return; // Для мобильной версии используем клик на оверлей

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
  }, [isMobile]);

  const handleDisableRecurrence = (
    operation: Operation,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    // Проверяем, есть ли дочерние операции
    const children = allOperations.filter(
      (op) => op.recurrenceParentId === operation.id
    );

    setDeleteModal({
      isOpen: true,
      operation,
      childrenCount: children.length,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.operation) return;

    try {
      // Удаляем только шаблон, все дочерние операции остаются
      await deleteOperation(deleteModal.operation.id).unwrap();

      showSuccess(
        deleteModal.childrenCount > 0
          ? `Шаблон удален. ${deleteModal.childrenCount} дочерних операций остались в базе`
          : 'Шаблон удален'
      );
      setDeleteModal({ isOpen: false, operation: null, childrenCount: 0 });
    } catch (error) {
      console.error('Failed to delete template:', error);
      showError('Ошибка при удалении шаблона');
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-500 dark:hover:border-primary-400 transition-colors flex items-center justify-center"
        title="Повторяющиеся операции"
      >
        <Calendar
          size={18}
          className="text-primary-600 dark:text-primary-400"
        />
        {recurringTemplates.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-primary-600 dark:bg-primary-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {recurringTemplates.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {isMobile ? (
            // Мобильная версия - полноэкранное модальное окно
            <div
              className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 flex items-end sm:items-center justify-center"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsOpen(false);
                }
              }}
            >
              <div
                className="w-full max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Заголовок с кнопкой закрытия */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Повторяющиеся операции
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Закрыть"
                  >
                    <X size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                {/* Список операций */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {recurringTemplates.length === 0 ? (
                    <div className="p-6 text-center">
                      <Calendar
                        size={48}
                        className="mx-auto mb-4 text-gray-400 dark:text-gray-500"
                      />
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Нет повторяющихся операций
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                        Повторяющиеся операции позволяют автоматически создавать
                        операции по расписанию (например, ежемесячная аренда или
                        зарплата).
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Чтобы создать повторяющуюся операцию, создайте обычную
                        операцию и выберите периодичность в настройках.
                      </p>
                    </div>
                  ) : (
                    recurringTemplates.map((op) => (
                      <div
                        key={op.id}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {formatMoney(op.amount, op.currency)}
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                                {getPeriodicityLabel(op.repeat)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 break-words">
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
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                              title="Редактировать"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={(e) => handleDisableRecurrence(op, e)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                              title="Отключить"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Десктопная версия - выпадающее меню
            <div className="absolute z-50 right-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[400px] overflow-y-auto">
              <div className="p-2 space-y-1">
                {recurringTemplates.length === 0 ? (
                  <div className="p-6 text-center">
                    <Calendar
                      size={40}
                      className="mx-auto mb-3 text-gray-400 dark:text-gray-500"
                    />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Нет повторяющихся операций
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Повторяющиеся операции позволяют автоматически создавать
                      операции по расписанию (например, ежемесячная аренда или
                      зарплата).
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Чтобы создать повторяющуюся операцию, создайте обычную
                      операцию и выберите периодичность в настройках.
                    </p>
                  </div>
                ) : (
                  recurringTemplates.map((op) => (
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
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({ isOpen: false, operation: null, childrenCount: 0 })
        }
        onConfirm={confirmDelete}
        title="Подтверждение удаления шаблона"
        message={
          deleteModal.childrenCount > 0
            ? `Удалить шаблон?\n\nВсе ${deleteModal.childrenCount} дочерних операций останутся в базе как обычные операции.`
            : 'Удалить шаблон повторяющейся операции?'
        }
        confirmText="Удалить"
        variant="delete"
        description={
          deleteModal.childrenCount > 0 ? (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Все {deleteModal.childrenCount} дочерних операций останутся в базе
              как обычные операции.
            </div>
          ) : undefined
        }
      />
    </div>
  );
};
