import {
  Folder,
  FileText,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  GripVertical,
} from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { ArticleTreeNode as ArticleTreeNodeType } from '../../shared/types/articleTree';
import type { Article } from '@shared/types/catalogs';
import { classNames } from '../../shared/lib/utils';

interface ArticleTreeNodeProps {
  article: ArticleTreeNodeType;
  level: number;
  isExpanded: boolean;
  isExpandedCheck: (id: string) => boolean;
  onToggleExpand: (id: string) => void;
  onEdit: (article: Article) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onChangeParent?: (articleId: string) => void;
  searchQuery?: string;
  isDragging?: boolean;
}

export const ArticleTreeNode = ({
  article,
  level,
  isExpanded,
  isExpandedCheck,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddChild,
  onChangeParent,
  searchQuery,
  isDragging = false,
}: ArticleTreeNodeProps) => {
  const hasChildren = article.children && article.children.length > 0;

  // Настройка draggable для статьи
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging: isNodeDragging,
  } = useDraggable({
    id: article.id,
    disabled: false,
  });

  // Настройка droppable для статьи (можно перетащить на неё)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: article.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // Подсветка поиска
  const highlightText = (text: string, query?: string) => {
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

  const indentSize = level * 24; // 24px на уровень

  // Комбинируем refs для drag и drop
  const setRefs = (element: HTMLDivElement | null) => {
    setDragRef(element);
    setDropRef(element);
  };

  return (
    <div className="tree-item">
      <div
        ref={setRefs}
        style={{ ...style, paddingLeft: `${indentSize + 12}px` }}
        className={classNames(
          'flex items-center py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-3 -mx-3 group cursor-pointer transition-all duration-200',
          searchQuery &&
            article.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            'bg-yellow-50 dark:bg-yellow-900/20',
          isNodeDragging && 'opacity-50',
          isOver &&
            !isNodeDragging &&
            'bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-600',
          isDragging && 'opacity-30'
        )}
      >
        {/* Ручка для перетаскивания */}
        <div
          {...attributes}
          {...listeners}
          className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 mr-1 flex-shrink-0 cursor-grab active:cursor-grabbing"
          title="Перетащите для изменения родителя"
        >
          <GripVertical size={14} />
        </div>
        {/* Кнопка сворачивания/разворачивания */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(article.id);
            }}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 mr-2 flex-shrink-0"
            aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        ) : (
          <div className="w-6 h-6 mr-2 flex-shrink-0" />
        )}

        {/* Иконка статьи */}
        <div
          className={classNames(
            'w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0',
            hasChildren
              ? 'bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800'
              : 'bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800'
          )}
        >
          {hasChildren ? (
            <Folder size={16} className="text-blue-600 dark:text-blue-300" />
          ) : (
            <FileText
              size={16}
              className="text-purple-600 dark:text-purple-300"
            />
          )}
        </div>

        {/* Информация о статье */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400">
            {highlightText(article.name, searchQuery)}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {hasChildren
              ? `Тип: Группа • ${article.children.length} подстатей`
              : 'Тип: Статья'}
            {article.type && (
              <>
                {' • '}
                {article.type === 'income' ? 'Поступления' : 'Списания'}
              </>
            )}
          </p>
        </div>

        {/* Кнопки действий */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(article.id);
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="Добавить подстатью"
            aria-label="Добавить подстатью"
          >
            <Plus size={14} />
          </button>
          {onChangeParent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChangeParent(article.id);
              }}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
              title="Изменить родителя"
              aria-label="Изменить родителя"
            >
              <ArrowRight size={14} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(article);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
            title="Редактировать"
            aria-label="Редактировать"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(article.id);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Удалить"
            aria-label="Удалить"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Дочерние статьи */}
      {hasChildren && isExpanded && (
        <div className="ml-8 border-l border-gray-200 dark:border-gray-700 pl-4">
          {article.children.map((child) => (
            <ArticleTreeNode
              key={child.id}
              article={child}
              level={level + 1}
              isExpanded={isExpandedCheck(child.id)}
              isExpandedCheck={isExpandedCheck}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onChangeParent={onChangeParent}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};
