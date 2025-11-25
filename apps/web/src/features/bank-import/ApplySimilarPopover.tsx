import { useRef, useEffect, useState } from 'react';
import { Copy, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Portal } from '../../shared/ui/Portal';
import { formatDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';
import type { ImportedOperation } from '@shared/types/imports';
import type { OperationComparison } from './utils/findSimilarOperations';

interface SimilarOperation {
  operation: ImportedOperation;
  comparison: OperationComparison;
}

interface ApplySimilarPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedIds: string[]) => void;
  onSkip: () => void;
  similarCount: number;
  anchorPosition: { top: number; left: number; right?: number };
  fieldLabel: string;
  similarOperations?: SimilarOperation[];
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
  onClose: _onClose,
  onApply,
  onSkip,
  similarCount,
  anchorPosition,
  fieldLabel,
  similarOperations = [],
}: ApplySimilarPopoverProps) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(5); // Изначально показываем 5 операций
  const itemsPerLoad = 10; // Загружаем по 10 операций при нажатии "Загрузить еще"
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // Отслеживание выбранных операций

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

  // Сбрасываем displayedCount при открытии нового popover и инициализируем выбранные операции
  useEffect(() => {
    if (isOpen) {
      setDisplayedCount(5);
      setShowPreview(false); // Также сбрасываем превью
      // По умолчанию все операции выбраны
      const allIds = new Set(
        similarOperations
          .map((item) => item.operation.id)
          .filter((id): id is string => !!id)
      );
      setSelectedIds(allIds);
    }
  }, [isOpen, similarOperations]);

  // Функция для переключения выбора операции
  const toggleOperationSelection = (operationId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(operationId)) {
        newSet.delete(operationId);
      } else {
        newSet.add(operationId);
      }
      return newSet;
    });
  };

  // Функция для выбора/отмены выбора всех операций
  const toggleSelectAll = () => {
    if (selectedIds.size === similarOperations.length) {
      // Если все выбраны, снимаем выбор со всех
      setSelectedIds(new Set());
    } else {
      // Иначе выбираем все
      const allIds = new Set(
        similarOperations
          .map((item) => item.operation.id)
          .filter((id): id is string => !!id)
      );
      setSelectedIds(allIds);
    }
  };

  // Умное позиционирование popover
  useEffect(() => {
    if (!isOpen || !popoverRef.current) return;

    const updatePosition = () => {
      if (!popoverRef.current) return;

      const popoverRect = popoverRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const offset = 8;
      const padding = 16; // Отступ от краев viewport

      // Используем либо реальную ширину, либо минимальную (320px из CSS)
      const popoverWidth = popoverRect.width || 320;
      const popoverHeight = popoverRect.height || 200;

      // Вычисляем доступное место снизу и сверху
      const spaceBelow = viewportHeight - anchorPosition.top;
      const spaceAbove = anchorPosition.top;

      let top: number;

      // Решаем, открывать вверх или вниз на основе РЕАЛЬНОЙ высоты popover
      if (spaceBelow >= popoverHeight + padding) {
        // Достаточно места снизу - открываем вниз
        top = anchorPosition.top + offset;
      } else if (spaceAbove >= popoverHeight + padding) {
        // Места снизу мало, но сверху достаточно - открываем вверх
        top = anchorPosition.top - popoverHeight - offset;
      } else if (spaceBelow > spaceAbove) {
        // Места мало и сверху и снизу, но снизу больше
        top = anchorPosition.top + offset;
        // Ограничиваем снизу, чтобы не выходило за viewport
        const maxTop = viewportHeight - popoverHeight - padding;
        if (top > maxTop) {
          top = maxTop;
        }
        // Если всё равно не помещается, прижимаем к верхнему краю
        if (top < padding) {
          top = padding;
        }
      } else {
        // Места мало везде, но сверху больше
        top = anchorPosition.top - popoverHeight - offset;
        // Ограничиваем сверху
        if (top < padding) {
          top = padding;
        }
        // Проверяем, не выходит ли снизу
        const bottomEdge = top + popoverHeight;
        if (bottomEdge > viewportHeight - padding) {
          top = viewportHeight - popoverHeight - padding;
        }
      }

      // Горизонтальное позиционирование
      let left: number;

      // Проверяем, есть ли место справа от якорной точки
      const spaceRight = viewportWidth - anchorPosition.left;

      if (spaceRight >= popoverWidth + padding) {
        // Достаточно места справа - открываем вправо от левого края
        left = anchorPosition.left;
      } else if (anchorPosition.right !== undefined) {
        // Пробуем открыть, выровняв по правому краю якоря
        const rightAlignedLeft = anchorPosition.right - popoverWidth;
        if (rightAlignedLeft >= padding) {
          left = rightAlignedLeft;
        } else {
          // Нет места - прижимаем к правому краю viewport
          left = viewportWidth - popoverWidth - padding;
        }
      } else {
        // Нет информации о правом крае - сдвигаем влево чтобы поместиться
        left = viewportWidth - popoverWidth - padding;
      }

      // Финальная проверка границ
      if (left < padding) {
        left = padding;
      }
      if (left + popoverWidth > viewportWidth - padding) {
        left = viewportWidth - popoverWidth - padding;
      }

      setPositionStyle({
        top: `${top}px`,
        left: `${left}px`,
      });
    };

    // Небольшая задержка, чтобы popover успел отрендериться
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(updatePosition);
      });
    }, 10); // Даем время DOM обновиться

    // ResizeObserver для автоматического пересчета при изменении размера
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updatePosition);
    });

    if (popoverRef.current) {
      resizeObserver.observe(popoverRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [isOpen, anchorPosition, showPreview, displayedCount]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        ref={popoverRef}
        className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[320px] max-w-[380px] max-h-[90vh] flex flex-col"
        style={{
          ...positionStyle,
          zIndex: 10000, // Высокий z-index для отображения поверх всего
        }}
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
        <div className="p-3 overflow-y-auto flex-1">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Заполнить {getFieldLabel(fieldLabel)} для всех похожих операций этим
            же значением?
          </p>

          {/* Информация о критериях совпадения */}
          {similarOperations.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-900 rounded mb-3">
              <div className="font-medium mb-1">Критерии совпадения:</div>
              <div className="flex flex-wrap gap-1">
                {(() => {
                  // Собираем уникальные причины совпадения из всех операций
                  const allReasons = new Set<string>();
                  similarOperations.forEach((item) => {
                    item.comparison.similarity.matchReasons.forEach((reason) =>
                      allReasons.add(reason)
                    );
                  });
                  const reasonsArray = Array.from(allReasons);
                  return reasonsArray.length > 0 ? (
                    reasonsArray.map((reason, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs"
                      >
                        {reason}
                      </span>
                    ))
                  ) : (
                    <span>описание, контрагент или ИНН</span>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Предпросмотр похожих операций */}
          {similarOperations.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="w-full flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <span>
                  {showPreview ? 'Скрыть' : 'Показать'} похожие операции (
                  {similarOperations.length})
                </span>
                {showPreview ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>

              {showPreview && (
                <div className="mt-2 max-h-[50vh] overflow-y-auto space-y-2">
                  {/* Чекбокс "Выбрать все" */}
                  <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded mb-2 z-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.size === similarOperations.length &&
                          similarOperations.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:focus:ring-primary-600 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Выбрать все ({selectedIds.size} из{' '}
                        {similarOperations.length})
                      </span>
                    </label>
                  </div>

                  {similarOperations
                    .slice(0, displayedCount)
                    .map((item, idx) => {
                      const op = item.operation;
                      const comparison = item.comparison;
                      const isSelected = op.id ? selectedIds.has(op.id) : false;
                      const directionLabel =
                        op.direction === 'income'
                          ? 'Приход'
                          : op.direction === 'expense'
                            ? 'Расход'
                            : op.direction === 'transfer'
                              ? 'Перевод'
                              : '—';
                      const directionColor =
                        op.direction === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : op.direction === 'expense'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400';

                      // Обрезаем описание для компактности
                      const shortDescription =
                        op.description && op.description.length > 60
                          ? op.description.substring(0, 60) + '...'
                          : op.description || '—';

                      return (
                        <div
                          key={op.id || idx}
                          className={`p-2 bg-white dark:bg-gray-800 border rounded text-xs transition-colors ${
                            isSelected
                              ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                op.id && toggleOperationSelection(op.id)
                              }
                              className="mt-0.5 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:focus:ring-primary-600 cursor-pointer flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {shortDescription}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-gray-600 dark:text-gray-400">
                                    <span>{formatDate(op.date)}</span>
                                    <span className={directionColor}>
                                      {directionLabel}
                                    </span>
                                    <span className="font-medium">
                                      {formatMoney(
                                        op.amount,
                                        op.currency || 'RUB'
                                      )}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  {/* <div className="text-blue-600 dark:text-blue-400 font-medium">
                                    {Math.round(comparison.similarity.score)}%
                                  </div> */}
                                  {comparison.similarity.requiresReview && (
                                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                      ⚠ Проверка
                                    </div>
                                  )}
                                </div>
                              </div>
                              {comparison.similarity.matchReasons.length >
                                0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {comparison.similarity.matchReasons.map(
                                    (reason, reasonIdx) => (
                                      <span
                                        key={reasonIdx}
                                        className="inline-block px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
                                      >
                                        {reason}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  {similarOperations.length > displayedCount && (
                    <button
                      onClick={() =>
                        setDisplayedCount((prev) =>
                          Math.min(
                            prev + itemsPerLoad,
                            similarOperations.length
                          )
                        )
                      }
                      className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors font-medium"
                    >
                      Загрузить еще (
                      {Math.min(
                        itemsPerLoad,
                        similarOperations.length - displayedCount
                      )}{' '}
                      из {similarOperations.length - displayedCount} оставшихся)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex items-center gap-2 p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button
            onClick={onSkip}
            variant="secondary"
            size="sm"
            className="flex-1 text-xs"
          >
            Только эту
          </Button>
          <Button
            onClick={() => onApply(Array.from(selectedIds))}
            variant="primary"
            size="sm"
            className="flex-1 text-xs flex items-center justify-center gap-1"
            disabled={selectedIds.size === 0}
          >
            <Check size={14} />
            Применить ({selectedIds.size})
          </Button>
        </div>
      </div>
    </Portal>
  );
};
