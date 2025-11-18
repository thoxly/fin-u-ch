import { useState, useEffect } from 'react';
import type { ImportedOperation } from '@shared/types/imports';

interface SaveRulesCellProps {
  operation: ImportedOperation;
  sessionId: string;
  onToggle?: (operationId: string, shouldSave: boolean) => void;
  disabled?: boolean;
}

// Toggle switch base classes
const TOGGLE_SWITCH_BASE_CLASSES = [
  'w-11',
  'h-6',
  'bg-gray-200',
  'peer-focus:outline-none',
  'peer-focus:ring-4',
  'peer-focus:ring-blue-300',
  'dark:peer-focus:ring-blue-800',
  'rounded-full',
  'peer',
  'dark:bg-gray-700',
  'peer-checked:after:translate-x-full',
  'peer-checked:after:border-white',
  "after:content-['']",
  'after:absolute',
  'after:top-[2px]',
  'after:left-[2px]',
  'after:bg-white',
  'after:border-gray-300',
  'after:border',
  'after:rounded-full',
  'after:h-5',
  'after:w-5',
  'after:transition-all',
  'dark:border-gray-600',
  'peer-checked:bg-blue-600',
].join(' ');

export const SaveRulesCell = ({
  operation,
  sessionId,
  onToggle,
  disabled = false,
}: SaveRulesCellProps) => {
  // Тогл включен по умолчанию, если операция заполнилась по правилам
  const isMatchedByRule =
    operation.matchedBy === 'rule' || !!operation.matchedRuleId;
  const [shouldSave, setShouldSave] = useState(isMatchedByRule);

  // Обновляем состояние, если операция изменилась
  useEffect(() => {
    const isMatched =
      operation.matchedBy === 'rule' || !!operation.matchedRuleId;
    setShouldSave(isMatched);
    // Вызываем onToggle при изменении состояния
    if (onToggle) {
      onToggle(operation.id, isMatched);
    }
  }, [operation.matchedBy, operation.matchedRuleId, operation.id]);

  const handleToggle = (checked: boolean) => {
    setShouldSave(checked);
    if (onToggle) {
      onToggle(operation.id, checked);
    }
  };

  const labelClasses = `relative inline-flex items-center flex-shrink-0 ${
    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
  }`;

  const toggleSwitchClasses = `${TOGGLE_SWITCH_BASE_CLASSES} ${disabled ? 'opacity-60' : ''}`;

  return (
    <div className="flex items-center justify-center w-full min-h-[24px]">
      <label className={labelClasses}>
        <input
          type="checkbox"
          checked={shouldSave}
          onChange={(e) => !disabled && handleToggle(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={toggleSwitchClasses}
          title={disabled ? 'Операция распределена' : ''}
        ></div>
      </label>
    </div>
  );
};
