import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { Folder, FileText, Search } from 'lucide-react';
import { classNames } from '../../shared/lib/utils';
import { useArticleTree } from '../../shared/hooks/useArticleTree';
import { findArticleInTree, flattenTree } from '../../shared/lib/articleTree';
import type { ArticleTreeNode } from '../../shared/types/articleTree';
import type { Article } from '@shared/types/catalogs';

interface ArticleParentSelectProps {
  value: string;
  onChange: (value: string) => void;
  articleType: 'income' | 'expense';
  excludeArticleId?: string; // ID статьи, которую исключаем (текущая редактируемая)
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Компонент для выбора родительской статьи с иерархическим отображением
 * Показывает дерево статей в выпадающем списке с отступами и иконками
 */
export const ArticleParentSelect = ({
  value,
  onChange,
  articleType,
  excludeArticleId,
  label = 'Родительская статья',
  placeholder = 'Корневая статья (без родителя)',
  error,
  required = false,
  disabled = false,
}: ArticleParentSelectProps) => {
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

  // Получаем дерево статей того же типа
  const { tree, isLoading } = useArticleTree({
    type: articleType,
    isActive: true, // Только активные статьи
  });

  // Функция для получения всех потомков статьи (для исключения)
  const getDescendantIds = (node: ArticleTreeNode): string[] => {
    const ids = [node.id];
    node.children.forEach((child) => {
      ids.push(...getDescendantIds(child));
    });
    return ids;
  };

  // Фильтруем дерево: исключаем текущую редактируемую статью и её потомков
  const filteredTree = useMemo(() => {
    if (!excludeArticleId || !tree.length) {
      return tree;
    }

    const excludeIds = new Set<string>();
    const findAndExclude = (nodes: ArticleTreeNode[]): ArticleTreeNode[] => {
      return nodes
        .filter((node) => {
          if (node.id === excludeArticleId) {
            // Добавляем все ID потомков в исключения
            getDescendantIds(node).forEach((id) => excludeIds.add(id));
            return false; // Исключаем саму статью
          }
          return true;
        })
        .map((node) => ({
          ...node,
          children: findAndExclude(node.children),
        }));
    };

    return findAndExclude(tree);
  }, [tree, excludeArticleId, getDescendantIds]);

  // Преобразуем дерево в плоский список для отображения в селекте
  const options = useMemo(() => {
    const result: Array<{
      value: string;
      label: string;
      level: number;
      isLeaf: boolean;
    }> = [
      {
        value: '',
        label: 'Корневая статья (без родителя)',
        level: 0,
        isLeaf: true,
      },
    ];

    const addNode = (node: ArticleTreeNode, level: number) => {
      // Пропускаем неактивные статьи
      if (!node.isActive) {
        return;
      }

      const indent = '— '.repeat(level);
      result.push({
        value: node.id,
        label: `${indent}${node.name}`,
        level,
        isLeaf: node.children.length === 0,
      });

      node.children.forEach((child) => {
        addNode(child, level + 1);
      });
    };

    filteredTree.forEach((node) => {
      addNode(node, 0);
    });

    return result;
  }, [filteredTree]);

  // Фильтруем опции по поисковому запросу
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return options.filter((opt) => {
      // Убираем отступы для поиска
      const labelWithoutIndent = opt.label.replace(/^—+\s*/, '');
      return labelWithoutIndent.toLowerCase().includes(lowerQuery);
    });
  }, [options, searchQuery]);

  // Находим выбранную опцию
  const selectedOption = options.find((opt) => opt.value === value) || null;

  // Вычисляем позицию выпадающего списка
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < 300 && spaceAbove > spaceBelow;

      setPosition({
        top: openUpward ? rect.top - 300 : rect.bottom,
        left: rect.left,
        width: rect.width,
        openUpward,
        maxHeight: Math.min(
          300,
          openUpward ? spaceAbove - 10 : spaceBelow - 10
        ),
      });

      // Фокусируем поле поиска при открытии
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Обработчик изменения значения
  const handleChange = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Подсветка текста при поиске
  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    return (
      <>
        {before}
        <mark className="bg-yellow-200 dark:bg-yellow-800">{match}</mark>
        {after}
      </>
    );
  };

  const displayValue = selectedOption
    ? selectedOption.label.replace(/^—+\s*/, '') // Убираем отступы в отображаемом значении
    : placeholder;

  return (
    <div className="w-full">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Listbox value={value} onChange={handleChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className={classNames(
              'input',
              'flex items-center justify-between',
              'text-left',
              error && 'input-error',
              disabled && 'opacity-50 cursor-not-allowed',
              !selectedOption && 'text-gray-400 dark:text-gray-500'
            )}
          >
            <span className="block truncate">{displayValue}</span>
            <ChevronUpDownIcon
              className="w-4 h-4 ml-2 text-gray-400 dark:text-gray-500 flex-shrink-0"
              aria-hidden="true"
            />
          </Listbox.Button>

          {/* Выпадающий список через портал */}
          {typeof document !== 'undefined' &&
            isOpen &&
            createPortal(
              <div
                className="fixed z-50"
                style={{
                  top: `${position.top}px`,
                  left: `${position.left}px`,
                  width: `${position.width}px`,
                }}
              >
                <Transition
                  show={isOpen}
                  as={Listbox.Options}
                  static
                  className={classNames(
                    'mt-1 max-h-60 overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
                    'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent'
                  )}
                  style={{ maxHeight: `${position.maxHeight}px` }}
                >
                  {/* Поле поиска */}
                  <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700 z-10">
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск статьи..."
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Список опций */}
                  {isLoading ? (
                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Загрузка...
                    </div>
                  ) : filteredOptions.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery
                        ? 'Ничего не найдено'
                        : 'Нет доступных статей'}
                    </div>
                  ) : (
                    filteredOptions.map((option) => {
                      const isSelected = option.value === value;
                      const isRoot = option.value === '';

                      return (
                        <Listbox.Option
                          key={option.value}
                          value={option.value}
                          className={({ active }) =>
                            classNames(
                              'relative cursor-pointer select-none py-2 px-4',
                              active
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                                : 'text-gray-900 dark:text-gray-100',
                              isSelected && 'bg-blue-100 dark:bg-blue-900/40'
                            )
                          }
                        >
                          {({ active: _active }) => (
                            <div className="flex items-center gap-2">
                              {/* Иконка */}
                              <div
                                className={classNames(
                                  'flex-shrink-0',
                                  isRoot && 'opacity-0'
                                )}
                              >
                                {option.isLeaf ? (
                                  <FileText
                                    size={14}
                                    className="text-purple-600 dark:text-purple-400"
                                  />
                                ) : (
                                  <Folder
                                    size={14}
                                    className="text-blue-600 dark:text-blue-400"
                                  />
                                )}
                              </div>

                              {/* Текст */}
                              <span className="block truncate flex-1">
                                {searchQuery
                                  ? highlightText(option.label, searchQuery)
                                  : option.label}
                              </span>

                              {/* Галочка выбранного */}
                              {isSelected && (
                                <CheckIcon
                                  className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          )}
                        </Listbox.Option>
                      );
                    })
                  )}
                </Transition>
              </div>,
              document.body
            )}

          {/* Скрытый список для Headless UI */}
          <div className="sr-only" aria-hidden="true">
            <Listbox.Options>
              {options.map((option) => (
                <Listbox.Option key={option.value} value={option.value}>
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
};
