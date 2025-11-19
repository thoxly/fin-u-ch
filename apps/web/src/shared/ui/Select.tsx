import {
  SelectHTMLAttributes,
  forwardRef,
  Fragment,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { Listbox, Transition } from '@headlessui/react';
import {
  ChevronUpDownIcon,
  CheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/20/solid';
import { classNames } from '../lib/utils';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
  onCreateNew?: () => void; // Callback для создания нового элемента
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder,
      fullWidth = true,
      className,
      value,
      onChange,
      disabled,
      required,
      onCreateNew,
    },
    _ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPositioned, setIsPositioned] = useState(false); // Флаг готовности позиции
    const [position, setPosition] = useState({
      top: 0,
      left: 0,
      width: 0,
      openUpward: false,
      maxHeight: 300,
    });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectedOption = options.find((opt) => opt.value === value) || null;
    const displayValue = selectedOption
      ? selectedOption.label
      : placeholder || '';

    // Фильтруем опции без __create__
    const regularOptions = options.filter(
      (opt) => String(opt.value) !== '__create__'
    );
    const filteredOptions = searchQuery
      ? regularOptions.filter((opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : regularOptions;

    const handleChange = (option: SelectOption | null) => {
      if (onChange && option) {
        onChange(String(option.value));
      }
      setSearchQuery(''); // Сбрасываем поиск после выбора
    };

    const handleCreateNew = () => {
      if (onCreateNew) {
        onCreateNew();
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    const updatePosition = useCallback(() => {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // ВАЖНО: getBoundingClientRect уже дает координаты относительно viewport
      // с учетом всех скроллов, поэтому мы можем использовать их напрямую

      // Максимальная высота списка
      const maxListHeight = 300;
      const gap = 4; // Отступ от кнопки
      const padding = 16; // Отступ от краев viewport

      // Вычисляем доступное место снизу и сверху от КНОПКИ
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Определяем направление открытия
      // СТРАТЕГИЯ: если кнопка в нижней половине экрана - ВСЕГДА открывать вниз
      let openUpward = false;
      let top: number;
      let actualMaxHeight = maxListHeight;

      const minUsableSpace = 100; // Минимум для обычных случаев
      const minForceDownSpace = 10; // Минимум для принудительного открытия вниз (хоть что-то)
      const isButtonInBottomHalf = rect.top > viewportHeight / 2;

      if (isButtonInBottomHalf && spaceBelow >= minForceDownSpace) {
        // Кнопка в нижней половине и есть хоть 10px снизу - ВСЕГДА открываем вниз
        openUpward = false;
        top = rect.bottom + gap;
        // Используем ВСЕ доступное место снизу (даже если это всего 10px)
        actualMaxHeight = Math.max(spaceBelow - gap - padding, 50); // минимум 50px для скроллинга
      } else if (spaceBelow >= maxListHeight + padding) {
        // Достаточно места снизу для полного списка
        openUpward = false;
        top = rect.bottom + gap;
        actualMaxHeight = maxListHeight;
      } else if (spaceAbove >= minUsableSpace && !isButtonInBottomHalf) {
        // Снизу совсем мало - открываем вверх
        openUpward = true;

        if (spaceAbove >= maxListHeight + padding) {
          // Достаточно места для полного списка
          actualMaxHeight = maxListHeight;
        } else {
          // Используем все доступное место сверху
          actualMaxHeight = Math.max(
            spaceAbove - gap - padding,
            minUsableSpace
          );
        }

        // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: позиционируем так, чтобы НИЖНИЙ край списка был у ВЕРХНЕГО края кнопки
        // Это создает визуальную связь между кнопкой и списком
        top = rect.top - actualMaxHeight - gap;

        // Финальная проверка границ
        if (top < padding) {
          top = padding;
          actualMaxHeight = rect.top - padding - gap;
        }
      } else {
        // Совсем мало места везде - выбираем где больше
        if (spaceAbove > spaceBelow) {
          openUpward = true;
          actualMaxHeight = Math.max(spaceAbove - gap - padding, 100);
          top = rect.top - actualMaxHeight - gap;
          if (top < padding) {
            top = padding;
            actualMaxHeight = rect.top - padding - gap;
          }
        } else {
          openUpward = false;
          actualMaxHeight = Math.max(spaceBelow - gap - padding, 100);
          top = rect.bottom + gap;
          if (top + actualMaxHeight > viewportHeight - padding) {
            actualMaxHeight = viewportHeight - top - padding;
          }
        }
      }

      // Вычисляем позицию по горизонтали
      const minWidth = 280;
      const maxWidth = 320;
      let left = rect.left;
      let width = Math.max(rect.width, minWidth);

      // Ограничиваем ширину максимумом
      if (width > maxWidth) {
        width = maxWidth;
      }

      // Корректируем позицию, если список выходит за правый край viewport
      if (left + width > viewportWidth - padding) {
        left = viewportWidth - width - padding;
      }

      // Корректируем позицию, если список выходит за левый край viewport
      if (left < padding) {
        left = padding;
        // Уменьшаем ширину, если все равно не помещается
        if (left + width > viewportWidth - padding) {
          width = viewportWidth - padding * 2;
        }
      }

      setPosition({
        top,
        left,
        width,
        openUpward,
        maxHeight: actualMaxHeight,
      });
      setIsPositioned(true); // Позиция рассчитана
    }, []);

    useEffect(() => {
      if (isOpen && buttonRef.current) {
        setIsPositioned(false); // Сбрасываем флаг при открытии

        // Сохраняем начальную позицию кнопки при открытии
        const initialButtonTop = buttonRef.current.getBoundingClientRect().top;

        // Обновляем позицию сразу при открытии - несколько раз для надежности
        const updateMultipleTimes = () => {
          updatePosition();
          requestAnimationFrame(() => {
            updatePosition();
            setTimeout(() => {
              updatePosition(); // Финальное обновление через 50мс
            }, 50);
          });
        };

        updateMultipleTimes();

        const handleResize = () => {
          requestAnimationFrame(updatePosition);
        };

        const handleScroll = () => {
          // Проверяем, насколько сместилась кнопка при скролле
          if (buttonRef.current) {
            const currentButtonTop =
              buttonRef.current.getBoundingClientRect().top;
            const movement = Math.abs(currentButtonTop - initialButtonTop);

            // Если кнопка сместилась больше чем на 50px - закрываем селект
            if (movement > 50) {
              setIsOpen(false);
              return;
            }
          }

          // Небольшое смещение - обновляем позицию
          requestAnimationFrame(updatePosition);
        };

        // ResizeObserver для отслеживания изменений размера кнопки
        const resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(updatePosition);
        });

        resizeObserver.observe(buttonRef.current);

        // MutationObserver для отслеживания изменений DOM
        const mutationObserver = new MutationObserver(() => {
          requestAnimationFrame(updatePosition);
        });

        mutationObserver.observe(buttonRef.current, {
          attributes: true,
          childList: true,
          subtree: true,
        });

        window.addEventListener('resize', handleResize);
        document.addEventListener('scroll', handleScroll, true);

        return () => {
          resizeObserver.disconnect();
          mutationObserver.disconnect();
          window.removeEventListener('resize', handleResize);
          document.removeEventListener('scroll', handleScroll, true);
        };
      } else {
        setIsPositioned(false); // Сбрасываем при закрытии
      }
    }, [isOpen, updatePosition]);

    // Отслеживаем изменения aria-expanded для синхронизации состояния
    useEffect(() => {
      if (!buttonRef.current) return;

      const checkOpen = () => {
        if (buttonRef.current) {
          const expanded =
            buttonRef.current.getAttribute('aria-expanded') === 'true';
          if (expanded !== isOpen) {
            setIsOpen(expanded);
            if (expanded) {
              // Используем requestAnimationFrame для синхронизации с рендером
              requestAnimationFrame(() => {
                requestAnimationFrame(updatePosition);
              });
            }
          }
        }
      };

      const observer = new MutationObserver(checkOpen);
      observer.observe(buttonRef.current, {
        attributes: true,
        attributeFilter: ['aria-expanded'],
      });

      // Проверяем сразу
      checkOpen();

      return () => observer.disconnect();
    }, [isOpen, updatePosition]);

    // Фокусируемся на поле поиска при открытии
    useEffect(() => {
      if (isOpen && searchInputRef.current) {
        // Используем requestAnimationFrame для синхронизации
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }
    }, [isOpen]);

    const optionsContent = (
      <Transition
        as={Fragment}
        show={isOpen}
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Listbox.Options
          static
          className={classNames(
            'fixed z-[10000] rounded-lg bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 shadow-xl focus:outline-none transition-opacity duration-100',
            position.openUpward ? 'mb-1' : 'mt-1',
            !isPositioned && 'opacity-0' // Скрываем до расчета позиции
          )}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            minWidth: '280px',
            maxWidth: '320px',
            maxHeight: `${position.maxHeight}px`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Строка поиска с кнопкой + */}
          <div className="p-2 border-b border-gray-200 dark:border-zinc-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 text-gray-900 dark:text-gray-100"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchQuery('');
                      setIsOpen(false);
                    }
                  }}
                />
              </div>
              {onCreateNew && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="flex-shrink-0 p-1.5 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded transition-colors"
                  title="Добавить новый"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Список опций с прокруткой */}
          <div className="overflow-auto flex-1">
            {filteredOptions.length === 0 ? (
              <div className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                Ничего не найдено
              </div>
            ) : (
              filteredOptions.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option}
                  className={({ active }) =>
                    classNames(
                      'relative cursor-pointer select-none py-1.5 pl-3 pr-9 transition-colors duration-150',
                      active
                        ? 'bg-primary-100 dark:bg-zinc-800 text-primary-900 dark:text-white'
                        : 'text-gray-900 dark:text-gray-100'
                    )
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={classNames(
                          'block truncate text-sm',
                          selected ? 'font-medium' : 'font-normal'
                        )}
                      >
                        {option.label}
                      </span>
                      {selected ? (
                        <span
                          className={classNames(
                            'absolute inset-y-0 right-0 flex items-center pr-3',
                            active
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-primary-600 dark:text-primary-400'
                          )}
                        >
                          <CheckIcon className="w-5 h-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))
            )}
          </div>
        </Listbox.Options>
      </Transition>
    );

    return (
      <div className={classNames(fullWidth && 'w-full')}>
        {label && (
          <label className="label">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <Listbox
          value={selectedOption}
          onChange={handleChange}
          disabled={disabled}
        >
          <div className="relative">
            <Listbox.Button
              ref={buttonRef}
              className={classNames(
                'input',
                'flex items-center justify-between',
                'text-left',
                error && 'input-error',
                disabled && 'opacity-50 cursor-not-allowed',
                !selectedOption && 'text-gray-400 dark:text-gray-500',
                className
              )}
            >
              <span className="block truncate">{displayValue}</span>
              <ChevronUpDownIcon
                className="w-4 h-4 ml-2 text-gray-400 dark:text-gray-500 flex-shrink-0"
                aria-hidden="true"
              />
            </Listbox.Button>

            {/* Рендерим выпадающий список через портал вместо стандартного */}
            {typeof document !== 'undefined' &&
              isOpen &&
              createPortal(optionsContent, document.body)}

            {/* Скрытый стандартный список для управления состоянием Headless UI */}
            <div className="sr-only" aria-hidden="true">
              <Listbox.Options>
                {filteredOptions.map((option) => (
                  <Listbox.Option key={option.value} value={option}>
                    {option.label}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </div>
        </Listbox>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
