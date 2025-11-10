import { useState } from 'react';
import type { ImportedOperation } from '@shared/types/imports';

interface SaveRulesCellProps {
  operation: ImportedOperation;
  sessionId: string;
  onToggle?: (operationId: string, shouldSave: boolean) => void;
}

export const SaveRulesCell = ({ operation, sessionId, onToggle }: SaveRulesCellProps) => {
  const [shouldSave, setShouldSave] = useState(false);

  const handleToggle = (checked: boolean) => {
    setShouldSave(checked);
    if (onToggle) {
      onToggle(operation.id, checked);
    }
  };

  return (
    <div className="flex items-center justify-center w-full min-h-[24px]">
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={shouldSave}
          onChange={(e) => handleToggle(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );
};

