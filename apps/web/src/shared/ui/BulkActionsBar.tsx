import { Button } from './Button';
import { classNames } from '../lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'danger' | 'warning' | 'secondary';
    className?: string;
  }>;
  className?: string;
}

/**
 * Reusable component for bulk actions bar
 * Displays selected count and action buttons
 */
export const BulkActionsBar = ({
  selectedCount,
  onClear,
  actions,
  className,
}: BulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className={classNames(
        'flex items-center justify-between gap-4 p-2.5 bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-lg shadow-sm',
        className
      )}
    >
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Выбрано: {selectedCount}
      </div>
      <div className="flex gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            className={
              action.variant === 'danger'
                ? 'btn-danger'
                : action.variant === 'warning'
                  ? 'btn-warning'
                  : action.className || 'btn-secondary'
            }
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
        <Button variant="secondary" size="sm" onClick={onClear}>
          Очистить
        </Button>
      </div>
    </div>
  );
};
