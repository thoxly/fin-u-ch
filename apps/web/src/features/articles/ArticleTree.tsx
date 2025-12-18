import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { Folder, FileText } from 'lucide-react';
import { classNames } from '../../shared/lib/utils';
import { ArticleTreeNode } from './ArticleTreeNode';
import type { ArticleTreeNode as ArticleTreeNodeType } from '../../shared/types/articleTree';
import type { Article } from '@shared/types/catalogs';
import {
  findArticleInTree,
  flattenTree,
  getLeafArticles,
  wouldCreateCycle,
} from '../../shared/lib/articleTree';

interface ArticleTreeProps {
  tree: ArticleTreeNodeType[];
  onEdit: (article: Article) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onChangeParent?: (articleId: string) => void;
  onDragEnd?: (draggedId: string, targetId: string | null) => void;
  searchQuery?: string;
  showLeavesOnly?: boolean;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  isAllExpanded?: boolean;
}

export const ArticleTree = ({
  tree,
  onEdit,
  onDelete,
  onAddChild,
  onChangeParent,
  onDragEnd,
  searchQuery,
  showLeavesOnly = false,
  onExpandAll: _onExpandAll,
  onCollapseAll: _onCollapseAll,
  isAllExpanded: _isAllExpanded,
}: ArticleTreeProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedArticle, setDraggedArticle] =
    useState<ArticleTreeNodeType | null>(null);

  // Настройка сенсоров для drag-and-drop (только мышь, не касание)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Минимальное расстояние для начала перетаскивания
      },
    })
  );

  // Зона для перетаскивания на корень (контейнер)
  const { setNodeRef: setContainerDropRef, isOver: isOverContainer } =
    useDroppable({
      id: 'root-drop-zone',
      disabled: false,
    });

  // Зона для перетаскивания на корень (визуальная зона)
  const { setNodeRef: setRootDropRef, isOver: isOverRoot } = useDroppable({
    id: 'root-drop-zone-visual',
    disabled: false,
  });

  // Фильтрация дерева по поисковому запросу
  const filteredTree = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return tree;
    }

    const lowerQuery = searchQuery.toLowerCase();

    // Функция проверяет, содержит ли узел или его потомки совпадение с поиском
    const nodeMatchesSearch = (
      node: ArticleTreeNodeType,
      query: string
    ): boolean => {
      // Проверяем текущий узел
      if (node.name.toLowerCase().includes(query)) {
        return true;
      }

      // Проверяем детей рекурсивно
      if (node.children && node.children.length > 0) {
        return node.children.some((child) => nodeMatchesSearch(child, query));
      }

      return false;
    };

    // Функция фильтрует дерево, оставляя только узлы с совпадениями и путь до них
    const filterTree = (
      nodes: ArticleTreeNodeType[]
    ): ArticleTreeNodeType[] => {
      return nodes
        .map((node) => {
          // Проверяем, есть ли совпадение в этом узле или его потомках
          if (!nodeMatchesSearch(node, lowerQuery)) {
            return null;
          }

          // Если есть совпадение, фильтруем детей
          const filteredChildren =
            node.children && node.children.length > 0
              ? filterTree(node.children)
              : [];

          return {
            ...node,
            children: filteredChildren,
          };
        })
        .filter((node): node is ArticleTreeNodeType => node !== null);
    };

    return filterTree(tree);
  }, [tree, searchQuery]);

  // Автоматически разворачиваем ветки до найденных статей при поиске
  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const newExpandedIds = new Set<string>();

    // Функция для поиска и разворачивания веток
    const expandToFound = (nodes: ArticleTreeNodeType[]): void => {
      for (const node of nodes) {
        // Если название статьи содержит поисковый запрос
        if (node.name.toLowerCase().includes(lowerQuery)) {
          // Разворачиваем всех родителей этой статьи
          const expandParents = (articleId: string) => {
            for (const rootNode of tree) {
              const found = findArticleInTree([rootNode], articleId);
              if (found) {
                // Находим путь от корня до найденной статьи
                const findPath = (
                  current: ArticleTreeNodeType,
                  targetId: string,
                  path: ArticleTreeNodeType[] = []
                ): ArticleTreeNodeType[] | null => {
                  const newPath = [...path, current];
                  if (current.id === targetId) {
                    return newPath;
                  }
                  for (const child of current.children) {
                    const result = findPath(child, targetId, newPath);
                    if (result) return result;
                  }
                  return null;
                };

                const path = findPath(rootNode, articleId);
                if (path) {
                  // Разворачиваем всех родителей в пути
                  path.slice(0, -1).forEach((parent) => {
                    newExpandedIds.add(parent.id);
                  });
                }
              }
            }
          };
          expandParents(node.id);
        }

        // Рекурсивно проверяем детей
        if (node.children && node.children.length > 0) {
          expandToFound(node.children);
        }
      }
    };

    expandToFound(filteredTree);
    setExpandedIds(newExpandedIds);
  }, [searchQuery, filteredTree]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Вычисляем, все ли развернуто (для внешнего использования)
  const _computedIsAllExpanded = useMemo(() => {
    const allIds = new Set<string>();
    const collectIds = (nodes: ArticleTreeNodeType[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      }
    };
    collectIds(filteredTree);
    return (
      allIds.size > 0 && Array.from(allIds).every((id) => expandedIds.has(id))
    );
  }, [filteredTree, expandedIds]);

  if (filteredTree.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Нет статей для отображения
      </div>
    );
  }

  const isExpandedCheck = (id: string) => expandedIds.has(id);

  // Обработчик начала перетаскивания
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    // Находим перетаскиваемую статью
    const article = findArticleInTree(filteredTree, active.id as string);
    if (article) {
      setDraggedArticle(article);
    }
  };

  // Обработчик окончания перетаскивания
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const draggedId = active.id as string;

    console.log('[ArticleTree] handleDragEnd called', {
      draggedId,
      over: over?.id,
    });

    if (!onDragEnd) {
      setActiveId(null);
      setDraggedArticle(null);
      return;
    }

    // Если перетаскиваем на root-drop-zone или root-drop-zone-visual, или отпускаем в пустое место, убираем из группы (null)
    if (
      !over ||
      over.id === 'root-drop-zone' ||
      over.id === 'root-drop-zone-visual'
    ) {
      console.log(
        '[ArticleTree] Making article root, draggedId:',
        draggedId,
        'over:',
        over?.id
      );
      onDragEnd(draggedId, null);
      setActiveId(null);
      setDraggedArticle(null);
      return;
    }

    const targetId = over.id as string;

    // Если перетаскиваем на ту же статью, ничего не делаем
    if (draggedId === targetId) {
      console.log('[ArticleTree] Dropped on same article, ignoring');
      setActiveId(null);
      setDraggedArticle(null);
      return;
    }

    // Проверяем на циклы
    if (wouldCreateCycle(filteredTree, draggedId, targetId)) {
      // Можно показать уведомление об ошибке
      console.warn('[ArticleTree] Cycle detected, cannot move');
      setActiveId(null);
      setDraggedArticle(null);
      return;
    }

    // Вызываем обработчик
    console.log('[ArticleTree] Moving article to parent', {
      draggedId,
      targetId,
    });
    onDragEnd(draggedId, targetId);
    setActiveId(null);
    setDraggedArticle(null);
  };

  // Обработчик отмены перетаскивания
  const handleDragCancel = () => {
    setActiveId(null);
    setDraggedArticle(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={setContainerDropRef}
        className={classNames(
          'space-y-1 relative min-h-[100px]',
          isOverContainer && activeId
            ? 'bg-green-50 dark:bg-green-900/10 border-2 border-green-300 dark:border-green-700 rounded-lg p-2'
            : ''
        )}
      >
        {filteredTree.map((node) => (
          <ArticleTreeNode
            key={node.id}
            article={node}
            level={0}
            isExpanded={expandedIds.has(node.id)}
            isExpandedCheck={isExpandedCheck}
            onToggleExpand={toggleExpand}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            onChangeParent={onChangeParent}
            searchQuery={searchQuery}
            isDragging={activeId === node.id}
          />
        ))}
        {/* Зона для перетаскивания, чтобы убрать из группы (показываем только если статья в группе) */}
        {activeId && draggedArticle && draggedArticle.parentId && (
          <div
            ref={setRootDropRef}
            className={classNames(
              'mt-4 p-4 border-2 border-dashed rounded-lg text-center text-sm transition-colors cursor-pointer',
              isOverRoot || isOverContainer
                ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
            )}
            style={{ minHeight: '60px' }}
          >
            <div className="flex items-center justify-center gap-2">
              <span>Перетащите сюда, чтобы убрать из группы</span>
            </div>
          </div>
        )}
      </div>
      <DragOverlay>
        {draggedArticle ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 border-2 border-blue-400 dark:border-blue-600">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 flex items-center justify-center">
                {draggedArticle.children &&
                draggedArticle.children.length > 0 ? (
                  <Folder
                    size={16}
                    className="text-blue-600 dark:text-blue-400"
                  />
                ) : (
                  <FileText
                    size={16}
                    className="text-purple-600 dark:text-purple-400"
                  />
                )}
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {draggedArticle.name}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
