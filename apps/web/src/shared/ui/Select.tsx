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
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
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

    // Находим ближайший контейнер с overflow (модалка, таблица и т.д.)
    const findScrollContainer = useCallback(
      (
        element: HTMLElement | null
      ): {
        top: number;
        bottom: number;
        left: number;
        right: number;
      } | null => {
        if (!element) return null;

        let current: HTMLElement | null = element;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Ищем родительский элемент с overflow или модальное окно
        while (current && current !== document.body) {
          const style = window.getComputedStyle(current);
          const overflow = style.overflow + style.overflowY + style.overflowX;
          const isModal =
            current.classList.contains('fixed') ||
            current.getAttribute('role') === 'dialog' ||
            current.classList.contains('modal') ||
            current.classList.contains('offcanvas');

          // Если это модальное окно или элемент с overflow, используем его границы
          if (
            isModal ||
            overflow.includes('auto') ||
            overflow.includes('scroll') ||
            overflow.includes('hidden')
          ) {
            const rect = current.getBoundingClientRect();
            // Проверяем, что элемент видим
            if (rect.width > 0 && rect.height > 0) {
              return {
                top: Math.max(rect.top, 0),
                bottom: Math.min(rect.bottom, viewportHeight),
                left: Math.max(rect.left, 0),
                right: Math.min(rect.right, viewportWidth),
              };
            }
          }
          current = current.parentElement;
        }

        // Если не нашли, используем viewport
        return {
          top: 0,
          bottom: viewportHeight,
          left: 0,
          right: viewportWidth,
        };
      },
      []
    );

    const updatePosition = useCallback(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Находим границы контейнера (модалка, таблица и т.д.)
        const containerBounds = findScrollContainer(buttonRef.current);
        const containerTop = containerBounds?.top ?? 0;
        const containerBottom = containerBounds?.bottom ?? viewportHeight;
        const containerLeft = containerBounds?.left ?? 0;
        const containerRight = containerBounds?.right ?? viewportWidth;

        // Максимальная высота списка
        const maxListHeight = 300;
        const gap = 4; // Отступ от кнопки
        const padding = 8; // Отступ от краев

        // Вычисляем доступное место снизу и сверху относительно контейнера
        const spaceBelow = containerBottom - rect.bottom;
        const spaceAbove = rect.top - containerTop;

        // Определяем направление открытия
        // Открываем вниз, если есть достаточно места (больше чем половина maxListHeight)
        // Или если места снизу больше, чем сверху
        let openUpward = false;
        let top: number;
        let actualMaxHeight = maxListHeight;

        if (spaceBelow >= maxListHeight) {
          // Достаточно места снизу - открываем вниз
          openUpward = false;
          top = rect.bottom + gap;
        } else if (spaceAbove >= maxListHeight) {
          // Достаточно места сверху - открываем вверх
          openUpward = true;
          top = rect.top - maxListHeight - gap;
        } else {
          // Недостаточно места ни сверху, ни снизу
          // Выбираем направление, где больше места
          if (spaceAbove > spaceBelow) {
            // Открываем вверх, ограничивая высоту доступным пространством
            openUpward = true;
            actualMaxHeight = Math.max(spaceAbove - gap - padding, 100); // Минимум 100px
            top = rect.top - actualMaxHeight - gap;
            // Если выходит за верхний край, прижимаем к верху
            if (top < containerTop + padding) {
              top = containerTop + padding;
              actualMaxHeight = rect.top - top - gap;
            }
          } else {
            // Открываем вниз, ограничивая высоту доступным пространством
            openUpward = false;
            actualMaxHeight = Math.max(spaceBelow - gap - padding, 100); // Минимум 100px
            top = rect.bottom + gap;
            // Если выходит за нижний край, прижимаем к низу
            if (top + actualMaxHeight > containerBottom - padding) {
              top = containerBottom - actualMaxHeight - padding;
              actualMaxHeight = containerBottom - top - padding;
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

        // Корректируем позицию, если список выходит за правый край контейнера
        if (left + width > containerRight - padding) {
          left = containerRight - width - padding;
          // Если список выходит за левый край, прижимаем к левому краю
          if (left < containerLeft + padding) {
            left = containerLeft + padding;
            // Уменьшаем ширину, если нужно
            width = Math.min(
              width,
              containerRight - containerLeft - padding * 2
            );
          }
        }

        // Корректируем позицию, если список выходит за левый край
        if (left < containerLeft + padding) {
          left = containerLeft + padding;
          width = Math.min(width, containerRight - containerLeft - padding * 2);
        }

        setPosition({
          top,
          left,
          width,
          openUpward,
          maxHeight: actualMaxHeight,
        });
      }
    }, [findScrollContainer]);

    useEffect(() => {
      if (isOpen) {
        updatePosition();

        const handleResize = () => updatePosition();
        const handleScroll = (e: Event) => {
          // Закрываем список при прокрутке таблицы или модалки
          const target = e.target as HTMLElement;
          if (target && buttonRef.current) {
            // Проверяем, является ли прокручиваемый элемент родителем кнопки или контейнером
            let isRelatedScroll = false;
            let current: HTMLElement | null = buttonRef.current.parentElement;

            while (current && current !== document.body) {
              if (current === target || current.contains(target)) {
                isRelatedScroll = true;
                break;
              }
              current = current.parentElement;
            }

            // Если прокрутка происходит в контейнере с селектором или в модалке/таблице
            if (
              isRelatedScroll ||
              target === document.body ||
              target === document.documentElement
            ) {
              // Закрываем список через blur кнопки (Headless UI автоматически закроет)
              if (
                buttonRef.current &&
                document.activeElement === buttonRef.current
              ) {
                buttonRef.current.blur();
              }
              setIsOpen(false);
            } else {
              // Иначе обновляем позицию
              updatePosition();
            }
          }
        };

        window.addEventListener('resize', handleResize);
        // Слушаем прокрутку на всех уровнях
        document.addEventListener('scroll', handleScroll, true);

        return () => {
          window.removeEventListener('resize', handleResize);
          document.removeEventListener('scroll', handleScroll, true);
        };
      }
    }, [isOpen, updatePosition, findScrollContainer]);

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
              // Небольшая задержка для обновления позиции после открытия
              setTimeout(updatePosition, 0);
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
        // Небольшая задержка для корректного отображения
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
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
            'fixed z-[10000] rounded-lg bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 shadow-xl focus:outline-none',
            position.openUpward ? 'mb-1' : 'mt-1'
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
