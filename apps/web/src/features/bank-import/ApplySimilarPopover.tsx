import { useRef, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { Button } from '../../shared/ui/Button';

interface ApplySimilarPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onSkip: () => void;
  similarCount: number;
  anchorPosition: { top: number; left: number; right?: number };
  fieldLabel: string;
}

const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    counterparty: 'контрагента',
    article: 'статью',
    account: 'счет',
    deal: 'сделку',
    department: 'подразделение',
    currency: 'валюту',
    direction: 'тип операции',
  };
  return labels[field] || field;
};

export const ApplySimilarPopover = ({
  isOpen,
  onClose,
  onApply,
  onSkip,
  similarCount,
  anchorPosition,
  fieldLabel,
}: ApplySimilarPopoverProps) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onSkip();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onSkip();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onSkip]);

  if (!isOpen) return null;

  const offset = 8;
  const positionStyle =
    anchorPosition.right !== undefined
      ? {
          top: `${anchorPosition.top + offset}px`,
          right: `${window.innerWidth - anchorPosition.right}px`,
        }
      : {
          top: `${anchorPosition.top + offset}px`,
          left: `${anchorPosition.left}px`,
        };

  return (
    <div
      ref={popoverRef}
      className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-[320px] max-w-[380px]"
      style={positionStyle}
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Copy size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Применить ко всем похожим?
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Найдено {similarCount} операций
            </p>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Содержимое */}
      <div className="p-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          Заполнить {getFieldLabel(fieldLabel)} для всех похожих операций этим
          же значением?
        </p>

        <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-900 rounded mb-3">
          Похожие операции: одинаковое описание, контрагент или ИНН
        </div>

        {/* Кнопки */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onSkip}
            variant="secondary"
            size="sm"
            className="flex-1 text-xs"
          >
            Только эту
          </Button>
          <Button
            onClick={onApply}
            variant="primary"
            size="sm"
            className="flex-1 text-xs flex items-center justify-center gap-1"
          >
            <Check size={14} />
            Применить ({similarCount})
          </Button>
        </div>
      </div>
    </div>
  );
};
