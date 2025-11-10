import { useState, useRef, useEffect } from 'react';
import { DateRangePicker as RDRDateRangePicker, Range } from 'react-date-range';
import { CalendarIcon } from '@heroicons/react/20/solid';
import { classNames } from '../lib/utils';
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  subWeeks,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import './DateRangePicker.css';

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onChange: (startDate: Date, endDate: Date) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const DateRangePicker = ({
  startDate,
  endDate,
  onChange,
  label,
  placeholder,
  className,
  disabled = false,
}: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  const [range, setRange] = useState<Range>({
    startDate: startDate || today,
    endDate: endDate || today,
    key: 'selection',
  });
  const [monthsCount, setMonthsCount] = useState(2);
  const [isMobile, setIsMobile] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [focusedRange, setFocusedRange] = useState<[number, number]>([0, 0]);

  // Ключ для пересоздания календаря при открытии, чтобы показать правильный месяц
  const [calendarKey, setCalendarKey] = useState(0);

  // Вспомогательные функции для работы с кварталами
  const getQuarter = (date: Date): number => {
    return Math.floor(date.getMonth() / 3) + 1;
  };

  const startOfQuarter = (date: Date): Date => {
    const quarter = getQuarter(date);
    const quarterStartMonth = (quarter - 1) * 3;
    return new Date(date.getFullYear(), quarterStartMonth, 1);
  };

  const endOfQuarter = (date: Date): Date => {
    const quarter = getQuarter(date);
    const quarterEndMonth = quarter * 3;
    return new Date(date.getFullYear(), quarterEndMonth, 0, 23, 59, 59, 999);
  };

  // Определяем предустановленные диапазоны
  const staticRanges = [
    {
      label: 'Сегодня',
      range: () => ({
        startDate: startOfDay(today),
        endDate: endOfDay(today),
      }),
      isSelected: () => {
        if (!range.startDate || !range.endDate) return false;
        const start = startOfDay(range.startDate);
        const end = endOfDay(range.endDate);
        return (
          start.getTime() === startOfDay(today).getTime() &&
          end.getTime() === endOfDay(today).getTime()
        );
      },
    },
    {
      label: 'Вчера',
      range: () => {
        const yesterday = subDays(today, 1);
        return {
          startDate: startOfDay(yesterday),
          endDate: endOfDay(yesterday),
        };
      },
      isSelected: () => {
        if (!range.startDate || !range.endDate) return false;
        const yesterday = subDays(today, 1);
        const start = startOfDay(range.startDate);
        const end = endOfDay(range.endDate);
        return (
          start.getTime() === startOfDay(yesterday).getTime() &&
          end.getTime() === endOfDay(yesterday).getTime()
        );
      },
    },
    {
      label: 'Эта неделя',
      range: () => ({
        startDate: startOfWeek(today, { weekStartsOn: 1 }),
        endDate: endOfWeek(today, { weekStartsOn: 1 }),
      }),
      isSelected: () => {
        if (!range.startDate || !range.endDate) return false;
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        const start = startOfDay(range.startDate);
        const end = endOfDay(range.endDate);
        return (
          start.getTime() === startOfDay(weekStart).getTime() &&
          end.getTime() === endOfDay(weekEnd).getTime()
        );
      },
    },
    {
      label: 'Прошлая неделя',
      range: () => {
        const lastWeek = subWeeks(today, 1);
        return {
          startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }),
          endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        };
      },
      isSelected: () => {
        if (!range.startDate || !range.endDate) return false;
        const lastWeek = subWeeks(today, 1);
        const weekStart = startOfWeek(lastWeek, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(lastWeek, { weekStartsOn: 1 });
        const start = startOfDay(range.startDate);
        const end = endOfDay(range.endDate);
        return (
          start.getTime() === startOfDay(weekStart).getTime() &&
          end.getTime() === endOfDay(weekEnd).getTime()
        );
      },
    },
    {
      label: 'Этот месяц',
      range: () => ({
        startDate: startOfMonth(today),
        endDate: endOfMonth(today),
      }),
      isSelected: () => {
        if (!range.startDate || !range.endDate) return false;
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        const start = startOfDay(range.startDate);
        const end = endOfDay(range.endDate);
        return (
          start.getTime() === startOfDay(monthStart).getTime() &&
          end.getTime() === endOfDay(monthEnd).getTime()
        );
      },
    },
    {
      label: 'Прошлый месяц',
      range: () => {
        const lastMonth = subMonths(today, 1);
        return {
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth),
        };
      },
      isSelected: () => {
        if (!range.startDate || !range.endDate) return false;
        const lastMonth = subMonths(today, 1);
        const monthStart = startOfMonth(lastMonth);
        const monthEnd = endOfMonth(lastMonth);
        const start = startOfDay(range.startDate);
        const end = endOfDay(range.endDate);
        return (
          start.getTime() === startOfDay(monthStart).getTime() &&
          end.getTime() === endOfDay(monthEnd).getTime()
        );
      },
    },
    {
      label: 'Текущий квартал',
      range: () => {
        const quarterStart = startOfQuarter(today);
        const quarterEnd = endOfQuarter(today);
        return {
          startDate: startOfDay(quarterStart),
          endDate: endOfDay(quarterEnd),
        };
      },
      isSelected: () => {
        if (!range.startDate || !range.endDate) return false;
        const quarterStart = startOfQuarter(today);
        const quarterEnd = endOfQuarter(today);
        const start = startOfDay(range.startDate);
        const end = endOfDay(range.endDate);
        return (
          start.getTime() === startOfDay(quarterStart).getTime() &&
          end.getTime() === endOfDay(quarterEnd).getTime()
        );
      },
    },
    {
      label: 'Текущий год',
      range: () => ({
        startDate: startOfDay(startOfYear(today)),
        endDate: endOfDay(endOfYear(today)),
      }),
      isSelected: () => {
        if (!range.startDate || !range.endDate) return false;
        const yearStart = startOfYear(today);
        const yearEnd = endOfYear(today);
        const start = startOfDay(range.startDate);
        const end = endOfDay(range.endDate);
        return (
          start.getTime() === startOfDay(yearStart).getTime() &&
          end.getTime() === endOfDay(yearEnd).getTime()
        );
      },
    },
  ];

  useEffect(() => {
    if (startDate && endDate) {
      setRange({
        startDate,
        endDate,
        key: 'selection',
      });
      setFocusedRange([0, 0]);
    }
  }, [startDate, endDate]);

  // При открытии календаря обновляем ключ, чтобы календарь показал правильный месяц
  useEffect(() => {
    if (isOpen && range.startDate) {
      // Обновляем ключ для пересоздания календаря с правильным месяцем
      setCalendarKey((prev) => prev + 1);
    }
  }, [isOpen, range.startDate]);

  // Принудительно применяем темные стили к select элементам
  useEffect(() => {
    if (!isOpen) return;

    const applyDarkStyles = () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (!isDark) return;

      // Находим все select элементы внутри календаря
      const selects = document.querySelectorAll(
        '.rdrCalendarWrapper select, .rdrMonthAndYearPickers select, .rdrMonthPicker select, .rdrYearPicker select'
      );
      selects.forEach((select) => {
        const htmlSelect = select as HTMLSelectElement;
        htmlSelect.style.setProperty(
          'background-color',
          '#2a2a2a',
          'important'
        );
        htmlSelect.style.setProperty('color', '#ffffff', 'important');
        htmlSelect.style.setProperty('border-color', '#404040', 'important');
      });

      // Находим все кнопки навигации
      const buttons = document.querySelectorAll('.rdrNextPrevButton');
      buttons.forEach((button) => {
        const htmlButton = button as HTMLButtonElement;
        htmlButton.style.setProperty(
          'background-color',
          '#2a2a2a',
          'important'
        );
        htmlButton.style.setProperty('border-color', '#404040', 'important');
        htmlButton.style.setProperty('color', '#ffffff', 'important');
      });

      // Устраняем белые границы в таблице
      const tableElements = document.querySelectorAll(
        '.rdrCalendarWrapper table, .rdrCalendarWrapper thead, .rdrCalendarWrapper tbody, .rdrCalendarWrapper tr'
      );
      tableElements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.setProperty(
          'background-color',
          'transparent',
          'important'
        );
        htmlElement.style.setProperty('border-color', '#404040', 'important');
      });

      // Устраняем белый фон в контейнерах календаря
      const containers = document.querySelectorAll(
        '.rdrMonths, .rdrMonth, .rdrMonthAndYearWrapper'
      );
      containers.forEach((element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.setProperty(
          'background-color',
          '#1a1a1a',
          'important'
        );
        htmlElement.style.setProperty('border-color', '#404040', 'important');
      });
    };

    // Применяем стили сразу и с небольшой задержкой
    applyDarkStyles();
    const timeoutId = setTimeout(applyDarkStyles, 100);

    // Наблюдаем за изменениями в DOM для динамического применения стилей
    const observer = new MutationObserver(() => {
      applyDarkStyles();
    });

    // Находим контейнер календаря и начинаем наблюдение
    const calendarContainer = document.querySelector('.rdrCalendarWrapper');
    if (calendarContainer) {
      observer.observe(calendarContainer, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [isOpen, calendarKey]);

  // Определяем количество месяцев для календаря и мобильный режим в зависимости от размера экрана
  useEffect(() => {
    const updateLayout = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setMonthsCount(mobile ? 1 : 2);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
    };
  }, []);

  // Обработчик клика вне календаря (только для десктопа)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      // На мобильном не закрываем по клику вне зоны
      if (isMobile) return;

      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node) &&
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile]);

  // Блокируем скролл body когда модалка открыта на мобильном
  useEffect(() => {
    if (isOpen && isMobile) {
      // Сохраняем текущую позицию скролла
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Восстанавливаем скролл при закрытии
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen, isMobile]);

  const handleSelect = (ranges: { selection: Range }) => {
    const { selection } = ranges;

    if (!selection.startDate || !selection.endDate) return;

    // Логируем для отладки
    console.log('DateRangePicker: handleSelect', {
      isMobile,
      start: selection.startDate.toLocaleDateString('ru-RU'),
      end: selection.endDate.toLocaleDateString('ru-RU'),
      sameDate: selection.startDate.getTime() === selection.endDate.getTime(),
    });

    // Обновляем состояние диапазона
    setRange(selection);

    // Проверяем, является ли это полным диапазоном (даты разные)
    const isFullRange =
      selection.startDate.getTime() !== selection.endDate.getTime();

    // На десктопе: автоматически применяем когда выбран полный диапазон
    if (!isMobile && isFullRange) {
      console.log('DateRangePicker: Автоматическое применение (desktop)');
      onChange(selection.startDate, selection.endDate);
      setTimeout(() => {
        setIsOpen(false);
      }, 200);
    }

    // На мобильных: не применяем автоматически, ждем кнопку "Применить"
    if (isMobile && isFullRange) {
      console.log('DateRangePicker: Диапазон готов, нажмите "Применить"');
    }
  };

  const handleQuickFilterClick = (staticRange: (typeof staticRanges)[0]) => {
    const newRange = staticRange.range();
    setRange({
      startDate: newRange.startDate,
      endDate: newRange.endDate,
      key: 'selection',
    });
    setFocusedRange([0, 0]);

    // На десктопе применяем и закрываем сразу
    if (!isMobile) {
      onChange(newRange.startDate, newRange.endDate);
      setTimeout(() => {
        setIsOpen(false);
      }, 150);
    }
    // На мобильном только обновляем range, но не применяем - дожидаемся кнопки "Применить"
  };

  const handleApply = () => {
    if (range.startDate && range.endDate) {
      onChange(range.startDate, range.endDate);
    }
    setIsOpen(false);
    setFocusedRange([0, 0]);
  };

  const handleClose = () => {
    // Восстанавливаем исходные значения при закрытии без применения
    if (startDate && endDate) {
      setRange({
        startDate,
        endDate,
        key: 'selection',
      });
    }
    setIsOpen(false);
    setFocusedRange([0, 0]);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const displayValue =
    range.startDate && range.endDate
      ? isSameDate(range.startDate, range.endDate)
        ? formatDate(range.startDate)
        : `${formatDate(range.startDate)} — ${formatDate(range.endDate)}`
      : placeholder || 'Выберите диапазон дат';

  return (
    <div className={classNames('relative', className)}>
      {label && !placeholder && <label className="label">{label}</label>}
      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={classNames(
            'input',
            'flex items-center justify-between',
            'text-left',
            disabled && 'opacity-50 cursor-not-allowed',
            !range.startDate && 'text-gray-400 dark:text-gray-500'
          )}
        >
          <span className="block truncate">{displayValue}</span>
          <CalendarIcon
            className="w-4 h-4 ml-2 text-gray-400 dark:text-gray-500 flex-shrink-0"
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <>
            {isMobile ? (
              // Мобильная модалка на весь экран
              <div
                className="date-range-picker-mobile-modal"
                onClick={(e) => {
                  // Закрываем модалку только при клике на оверлей (вне контейнера)
                  if (e.target === e.currentTarget) {
                    handleClose();
                  }
                }}
              >
                <div
                  ref={wrapperRef}
                  className="date-range-picker-wrapper"
                  onClick={(e) => {
                    // Останавливаем всплытие, чтобы клики внутри не закрывали модалку
                    e.stopPropagation();
                  }}
                >
                  {/* Шапка с кнопкой закрытия */}
                  <div className="date-range-picker-mobile-header">
                    <h3 className="date-range-picker-mobile-title">
                      Выбор периода
                    </h3>
                    <button
                      type="button"
                      className="date-range-picker-mobile-close"
                      onClick={handleClose}
                      aria-label="Закрыть"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Быстрые фильтры сверху */}
                  <div className="date-range-picker-quick-filters">
                    {staticRanges.map((staticRange, index) => {
                      const isSelected = staticRange.isSelected();
                      return (
                        <button
                          key={index}
                          type="button"
                          className={classNames(
                            'date-range-picker-quick-filter-btn',
                            isSelected && 'active'
                          )}
                          onClick={() => handleQuickFilterClick(staticRange)}
                        >
                          {staticRange.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Текст-подсказка */}
                  <div className="date-range-picker-hint">
                    {range.startDate &&
                    range.endDate &&
                    range.startDate.getTime() !== range.endDate.getTime() ? (
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        ✓ Выбран диапазон: {formatDate(range.startDate)} —{' '}
                        {formatDate(range.endDate)}. Нажмите "Применить".
                      </span>
                    ) : range.startDate &&
                      range.endDate &&
                      range.startDate.getTime() === range.endDate.getTime() ? (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        📅 Начало: {formatDate(range.startDate)}. Выберите
                        конечную дату →
                      </span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400">
                        Выберите начальную дату или готовый фильтр
                      </span>
                    )}
                  </div>

                  {/* Календарь */}
                  <div className="date-range-picker-calendar-container">
                    <RDRDateRangePicker
                      key={`calendar-mobile-${calendarKey}`}
                      ranges={[range]}
                      onChange={handleSelect}
                      focusedRange={focusedRange}
                      onRangeFocusChange={(nextRange) =>
                        setFocusedRange(nextRange as [number, number])
                      }
                      showSelectionPreview={true}
                      moveRangeOnFirstSelection={false}
                      preventSnapRefocus={true}
                      direction="horizontal"
                      months={monthsCount}
                      rangeColors={['#3b82f6']}
                      locale={ru}
                      staticRanges={[]}
                      inputRanges={[]}
                      editableDateInputs={false}
                    />
                  </div>

                  {/* Кнопки действий */}
                  <div className="date-range-picker-actions">
                    <button
                      type="button"
                      className="date-range-picker-close-btn"
                      onClick={handleClose}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      className={classNames(
                        'date-range-picker-apply-btn',
                        (!range.startDate || !range.endDate) &&
                          'opacity-50 cursor-not-allowed'
                      )}
                      onClick={handleApply}
                      disabled={!range.startDate || !range.endDate}
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Десктопный режим - плавающий блок с боковой панелью
              <div
                ref={wrapperRef}
                className="date-range-picker-desktop-wrapper"
              >
                {/* Быстрые фильтры слева */}
                <div className="date-range-picker-desktop-sidebar">
                  {staticRanges.map((staticRange, index) => {
                    const isSelected = staticRange.isSelected();
                    return (
                      <button
                        key={index}
                        type="button"
                        className={classNames(
                          'date-range-picker-desktop-filter-btn',
                          isSelected && 'active'
                        )}
                        onClick={() => handleQuickFilterClick(staticRange)}
                      >
                        {staticRange.label}
                      </button>
                    );
                  })}
                </div>

                {/* Календарь */}
                <div className="date-range-picker-desktop-calendar">
                  <RDRDateRangePicker
                    key={`calendar-desktop-${calendarKey}`}
                    ranges={[range]}
                    onChange={handleSelect}
                    focusedRange={focusedRange}
                    onRangeFocusChange={(nextRange) =>
                      setFocusedRange(nextRange as [number, number])
                    }
                    showSelectionPreview={true}
                    moveRangeOnFirstSelection={false}
                    preventSnapRefocus={true}
                    direction="horizontal"
                    months={monthsCount}
                    rangeColors={['#3b82f6']}
                    locale={ru}
                    staticRanges={[]}
                    inputRanges={[]}
                    editableDateInputs={false}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
