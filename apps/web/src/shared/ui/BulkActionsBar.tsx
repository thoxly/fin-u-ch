import { Button } from './Button';

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
      className={`mt-4 flex items-center justify-between ${className || ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Выбрано: {selectedCount}
        </span>
        <Button
          variant="secondary"
          className="text-xs px-2 py-1 h-auto min-h-0 ml-2"
          onClick={onClear}
        >
          Сбросить
        </Button>
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
      </div>
    </div>
  );
};
