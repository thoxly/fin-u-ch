import { Button } from '../../shared/ui/Button';
import type { Operation } from '@fin-u-ch/shared';

interface OperationFormActionsProps {
  operation: Operation | null;
  isCopy: boolean;
  isChildOperation: boolean;
  updateScope: 'current' | 'all';
  isCreating: boolean;
  isUpdating: boolean;
  onUpdateScopeChange: (scope: 'current' | 'all') => void;
  onClose: () => void;
}

export const OperationFormActions = ({
  operation,
  isCopy,
  isChildOperation,
  updateScope,
  isCreating,
  isUpdating,
  onUpdateScopeChange,
  onClose,
}: OperationFormActionsProps) => {
  return (
    <>
      {/* Update scope selector for child operations */}
      {isChildOperation && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Обновить:
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="updateScope"
                value="current"
                checked={updateScope === 'current'}
                onChange={(e) =>
                  onUpdateScopeChange(e.target.value as 'current' | 'all')
                }
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Только текущую операцию
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="updateScope"
                value="all"
                checked={updateScope === 'all'}
                onChange={(e) =>
                  onUpdateScopeChange(e.target.value as 'current' | 'all')
                }
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Все последующие операции (изменит шаблон)
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Sticky Footer with buttons */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            type="submit"
            disabled={isCreating || isUpdating}
            className="flex-1 sm:flex-none"
          >
            {operation?.id && !isCopy ? 'Сохранить' : 'Создать'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 sm:flex-none"
          >
            Отмена
          </Button>
        </div>
      </div>
    </>
  );
};
