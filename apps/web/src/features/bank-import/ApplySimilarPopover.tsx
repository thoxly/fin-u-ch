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

/**
 * Переводит тег операции на русский язык
 */
const translateTag = (tag: string): string => {
  const tagTranslations: Record<string, string> = {
    salary: 'Зарплата',
    payroll_taxes: 'Налоги с ФОТ',
    hr_expenses: 'HR расходы',
    employee_training: 'Обучение сотрудников',
    employee_medical_checks: 'Медосмотры',
    employee_uniform: 'Спецодежда',
    travel_accommodation: 'Проживание в командировках',
    travel_transport: 'Транспорт в командировках',
    travel_daily_allowance: 'Суточные',
    taxes_general: 'Налоги',
    fines_penalties: 'Штрафы и пени',
    government_fees: 'Госпошлины',
    rent_office: 'Аренда офиса',
    rent_warehouse: 'Аренда склада',
    rent_equipment: 'Аренда оборудования',
    utilities_power: 'Электроэнергия',
    utilities_water: 'Водоснабжение',
    utilities_heating: 'Отопление',
    utilities_gas: 'Газоснабжение',
    telecom_internet: 'Интернет',
    telecom_mobile: 'Мобильная связь',
    raw_materials: 'Сырье',
    components: 'Комплектующие',
    spare_parts: 'Запчасти',
    goods_purchase: 'Товары',
    packaging: 'Упаковка',
    office_supplies: 'Канцелярия',
    furniture: 'Мебель',
    cleaning_supplies: 'Хозтовары',
    equipment_purchase: 'Оборудование',
    maintenance_service: 'Техобслуживание',
    repair: 'Ремонт',
    construction_materials: 'Стройматериалы',
    construction_services: 'Строительные работы',
    special_equipment_services: 'Спецтехника',
    movers_transport: 'Грузчики',
    logistics_delivery: 'Доставка',
    courier_services: 'Курьерские услуги',
    freight_transport: 'Грузоперевозки',
    fuel: 'ГСМ',
    tolls_parking: 'Парковка и платные дороги',
    it_software: 'ПО',
    it_hardware: 'IT оборудование',
    it_hosting: 'Хостинг',
    it_domains: 'Домены',
    it_support: 'IT поддержка',
    it_dev_services: 'Разработка',
    acquiring_fee: 'Комиссия эквайринга',
    acquiring_income: 'Эквайринг (доход)',
    banking_fees: 'Банковские комиссии',
    loan_payments: 'Кредиты',
    insurance: 'Страхование',
    legal_services: 'Юридические услуги',
    accounting_services: 'Бухгалтерские услуги',
    audit_services: 'Аудит',
    marketing_ads: 'Реклама',
    marketing_ppc: 'Контекстная реклама',
    marketing_smm: 'SMM',
    marketplace_fee: 'Комиссия маркетплейса',
    marketplace_payment: 'Выплаты с маркетплейса',
    consulting: 'Консалтинг',
    design_services: 'Дизайн',
    photo_video_services: 'Фото/видео услуги',
    medical_services: 'Медицинские услуги',
    lab_services: 'Лабораторные услуги',
    beauty_supplies: 'Косметология',
    horeca_food: 'Продукты (HoReCa)',
    horeca_inventory: 'Инвентарь (HoReCa)',
    horeca_delivery: 'Доставка (HoReCa)',
    waste_disposal: 'Вывоз мусора',
    security_services: 'Охранные услуги',
    cleaning_services: 'Уборка',
    printing_services: 'Печать',
    research_services: 'Исследования',
    charity: 'Благотворительность',
    government_services: 'Госуслуги',
    customs: 'Таможня',
    warehouse_services: 'Складские услуги',
    mortgage_lease: 'Лизинг',
    advertising_production: 'Производство рекламы',
    subscription_services: 'Подписки',
    office_cleaning: 'Уборка офиса',
    hr_benefits: 'Соцпакет',
    internal_transfer: 'Внутренний перевод',
    cash_withdrawal: 'Снятие наличных',
    cash_deposit: 'Внесение наличных',
    currency_exchange: 'Обмен валют',
    depreciation: 'Амортизация',
    inventory_services: 'Инвентаризация',
    printing_materials: 'Расходники для печати',
    event_services: 'Мероприятия',
    catering: 'Кейтеринг',
    hr_outstaff: 'Аутстаффинг',
    pr_services: 'PR услуги',
    merchandising: 'Мерчендайзинг',
    education_services: 'Образовательные услуги',
    other: 'Другое',
  };
  return tagTranslations[tag] || tag;
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
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(
    new Set()
  ); // Отслеживание развернутых операций

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
      setExpandedOperations(new Set()); // Сбрасываем развернутые операции
      // По умолчанию все операции выбраны
      const allIds = new Set(
        similarOperations
          .map((item) => item.operation.id)
          .filter((id): id is string => !!id)
      );
      setSelectedIds(allIds);
    }
  }, [isOpen, similarOperations]);

  // Функция для переключения развернутого состояния операции
  const toggleOperationExpanded = (operationId: string) => {
    setExpandedOperations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(operationId)) {
        newSet.delete(operationId);
      } else {
        newSet.add(operationId);
      }
      return newSet;
    });
  };

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
    if (!isOpen) return;

    let rafId = 0;
    let resizeObserver: ResizeObserver | null = null;

    const updatePosition = () => {
      const element = popoverRef.current;
      if (!element) {
        rafId = requestAnimationFrame(updatePosition);
        return;
      }

      const popoverRect = element.getBoundingClientRect();
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

      console.log('[ApplySimilarPopover] позиция поповера', {
        anchorPosition,
        computedTop: top,
        computedLeft: left,
        popoverWidth,
        popoverHeight,
        viewportWidth,
        viewportHeight,
      });
    };

    const scheduleUpdate = () => {
      rafId = requestAnimationFrame(updatePosition);
    };

    scheduleUpdate();

    const handleScroll = () => scheduleUpdate();
    const handleResize = () => scheduleUpdate();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    const observeResize = () => {
      const element = popoverRef.current;
      if (!element || resizeObserver) return;
      resizeObserver = new ResizeObserver(() => scheduleUpdate());
      resizeObserver.observe(element);
    };

    rafId = requestAnimationFrame(() => {
      observeResize();
      updatePosition();
    });

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
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
                    item.comparison.matchReasons.forEach((reason) =>
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
                    <span>
                      тег:{' '}
                      {translateTag(
                        similarOperations[0]?.comparison.primaryTag || 'other'
                      )}
                    </span>
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
                          ? 'Поступление'
                          : op.direction === 'expense'
                            ? 'Списание'
                            : op.direction === 'transfer'
                              ? 'Перевод'
                              : '—';
                      const directionColor =
                        op.direction === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : op.direction === 'expense'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400';

                      const isExpanded = op.id
                        ? expandedOperations.has(op.id)
                        : false;
                      const hasLongDescription =
                        op.description && op.description.length > 60;

                      return (
                        <div
                          key={op.id || idx}
                          className={`p-2 bg-white dark:bg-gray-800 border rounded text-xs transition-colors ${
                            isSelected
                              ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                if (op.id) {
                                  toggleOperationSelection(op.id);
                                }
                              }}
                              className="mt-0.5 flex-shrink-0"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  op.id && toggleOperationSelection(op.id)
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:focus:ring-primary-600 cursor-pointer"
                              />
                            </div>
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() =>
                                op.id && toggleOperationExpanded(op.id)
                              }
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {isExpanded || !hasLongDescription
                                      ? op.description || '—'
                                      : `${op.description.substring(0, 60)}...`}
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
                                  {/* Плательщик и получатель */}
                                  <div className="mt-2 space-y-1">
                                    {op.payer && (
                                      <div className="text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">
                                          Плательщик:{' '}
                                        </span>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                          {op.payer}
                                        </span>
                                        {op.payerInn && (
                                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                                            (ИНН: {op.payerInn})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {op.receiver && (
                                      <div className="text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">
                                          Получатель:{' '}
                                        </span>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                          {op.receiver}
                                        </span>
                                        {op.receiverInn && (
                                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                                            (ИНН: {op.receiverInn})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    {translateTag(comparison.primaryTag)}
                                  </div>
                                </div>
                              </div>
                              {comparison.matchReasons.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {comparison.matchReasons.map(
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
                              {hasLongDescription && (
                                <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                                  {isExpanded ? (
                                    <span className="flex items-center gap-1">
                                      <ChevronUp size={12} />
                                      Свернуть
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <ChevronDown size={12} />
                                      Развернуть
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
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
