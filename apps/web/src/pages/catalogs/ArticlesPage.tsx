import { useState, useMemo } from 'react';
import { Pencil, Trash2, X, List, Network } from 'lucide-react';

import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Select } from '../../shared/ui/Select';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { ProtectedAction } from '../../shared/components/ProtectedAction';
import { ConfirmDeleteModal } from '../../shared/ui/ConfirmDeleteModal';
import {
  useGetArticlesQuery,
  useDeleteArticleMutation,
  useUpdateArticleMutation,
} from '../../store/api/catalogsApi';
import type { Article } from '@shared/types/catalogs';
import { OffCanvas } from '@/shared/ui/OffCanvas';
import { ArticleForm } from '@/features/catalog-forms/index';
import { useBulkSelection } from '../../shared/hooks/useBulkSelection';
import { useArticleTree } from '../../shared/hooks/useArticleTree';
import {
  ArticleTree,
  ArticleTreeSearch,
  ArticleParentSelect,
} from '../../features/articles';
import { findArticleInTree } from '../../shared/lib/articleTree';

export const ArticlesPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLeavesOnly, setShowLeavesOnly] = useState(false);
  const [initialParentId, setInitialParentId] = useState<string | null>(null);
  const [isChangeParentModalOpen, setIsChangeParentModalOpen] = useState(false);
  const [articleToChangeParent, setArticleToChangeParent] =
    useState<Article | null>(null);
  const [newParentId, setNewParentId] = useState<string>('');
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

  // Состояния для модалок подтверждения
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });

  // Фильтры
  const [typeFilter, setTypeFilter] = useState<
    'income' | 'expense' | 'transfer' | ''
  >('');
  const [activityFilter, setActivityFilter] = useState<
    'operating' | 'investing' | 'financing' | ''
  >('');
  const filters = {
    ...(typeFilter && {
      type: typeFilter as 'income' | 'expense' | 'transfer',
    }),
    ...(activityFilter && {
      activity: activityFilter as 'operating' | 'investing' | 'financing',
    }),
  };

  const { canRead } = usePermissions();

  const {
    data: articles = [],
    isLoading,
    error,
  } = useGetArticlesQuery(
    Object.keys(filters).length > 0 ? filters : undefined,
    { skip: !canRead('articles') }
  );

  const {
    tree,
    isLoading: isTreeLoading,
    error: treeError,
  } = useArticleTree(Object.keys(filters).length > 0 ? filters : undefined);
  const [deleteArticle] = useDeleteArticleMutation();
  const [updateArticle] = useUpdateArticleMutation();

  const { selectedIds, toggleSelectOne } = useBulkSelection();

  // Отладочная информация
  console.log('ArticlesPage - articles:', articles);
  console.log('ArticlesPage - isLoading:', isLoading);
  console.log('ArticlesPage - error:', error);

  const handleCreate = () => {
    setEditing(null);
    setInitialParentId(null);
    setIsFormOpen(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditing(null);
    setInitialParentId(parentId);
    setIsFormOpen(true);
  };

  const handleChangeParent = (articleId: string) => {
    // Находим статью в дереве
    const articleNode = findArticleInTree(tree, articleId);
    if (articleNode) {
      setArticleToChangeParent(articleNode);
      setNewParentId(articleNode.parentId || '');
      setIsChangeParentModalOpen(true);
    }
  };

  const handleConfirmChangeParent = async () => {
    if (!articleToChangeParent) return;

    try {
      await updateArticle({
        id: articleToChangeParent.id,
        data: {
          parentId: newParentId || undefined,
        },
      }).unwrap();
      setIsChangeParentModalOpen(false);
      setArticleToChangeParent(null);
      setNewParentId('');
    } catch (error) {
      console.error('Failed to change parent:', error);
    }
  };

  // Обработчик drag-and-drop для изменения родителя
  const handleDragEnd = async (draggedId: string, targetId: string | null) => {
    console.log('[ArticlesPage] handleDragEnd called', { draggedId, targetId });
    try {
      // Если targetId null, делаем статью корневой (передаем null, а не undefined)
      const newParentId = targetId === null ? null : targetId;
      console.log('[ArticlesPage] Updating article parent', {
        draggedId,
        newParentId,
      });

      await updateArticle({
        id: draggedId,
        data: {
          parentId: newParentId,
        },
      }).unwrap();
      console.log('[ArticlesPage] Article parent updated successfully');
    } catch (error: unknown) {
      console.error(
        '[ArticlesPage] Failed to change parent via drag-and-drop:',
        error
      );
      // Ошибка будет обработана бэкендом (валидация циклов и т.д.)
      // Можно добавить уведомление, если нужно
    }
  };

  const handleEdit = (article: Article) => {
    console.log('ArticlesPage - handleEdit called with article:', article);
    setEditing(article);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log('[ArticlesPage] handleDelete called with id:', id);
    // Находим статью в дереве для отображения информации
    const articleNode = findArticleInTree(tree, id);
    // Если не найдена в дереве, ищем в плоском списке
    const article = articleNode || articles.find((a) => a.id === id);
    console.log('[ArticlesPage] Found article:', article);
    setArticleToDelete(article || null);
    setDeleteModal({ isOpen: true, id });
    console.log('[ArticlesPage] Delete modal opened, deleteModal:', {
      isOpen: true,
      id,
    });
  };

  // Подсчитываем общее количество потомков (включая вложенные)
  const getTotalDescendantsCount = (article: Article | null): number => {
    if (!article || !article.children) return 0;
    let count = article.children.length;
    article.children.forEach((child) => {
      count += getTotalDescendantsCount(child as Article);
    });
    return count;
  };

  const confirmDelete = async () => {
    console.log(
      '[ArticlesPage] confirmDelete called, deleteModal.id:',
      deleteModal.id
    );
    if (!deleteModal.id) {
      console.warn('[ArticlesPage] confirmDelete: no deleteModal.id');
      return;
    }
    try {
      console.log(
        '[ArticlesPage] Calling deleteArticle mutation with id:',
        deleteModal.id
      );
      const result = await deleteArticle(deleteModal.id).unwrap();
      console.log('[ArticlesPage] deleteArticle success, result:', result);
      setArticleToDelete(null);
      console.log('[ArticlesPage] Delete completed successfully');
    } catch (error) {
      console.error('[ArticlesPage] Failed to delete article:', error);
      console.error(
        '[ArticlesPage] Error details:',
        JSON.stringify(error, null, 2)
      );
      throw error;
    }
  };

  const getActivityLabel = (activity: string | null | undefined) => {
    const labels: Record<string, string> = {
      operating: 'Операционная',
      investing: 'Инвестиционная',
      financing: 'Финансовая',
    };
    return activity ? labels[activity] || activity : '-';
  };

  const handleClearFilters = () => {
    setTypeFilter('');
    setActivityFilter('');
  };

  const hasActiveFilters = typeFilter || activityFilter;

  const columns = [
    {
      key: 'select',
      header: '',
      render: (a: Article) => (
        <input
          type="checkbox"
          aria-label="Выбрать статью"
          checked={selectedIds.includes(a.id)}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelectOne(a.id);
          }}
        />
      ),
      width: '40px',
    },
    { key: 'name', header: 'Название' },
    {
      key: 'type',
      header: 'Тип',
      render: (a: Article) =>
        a.type === 'income' ? 'Поступления' : 'Списания',
    },
    {
      key: 'activity',
      header: 'Деятельность',
      render: (a: Article) => getActivityLabel(a.activity),
    },
    {
      key: 'counterpartyName',
      header: 'Контрагент',
      render: (a: Article & { counterparty?: { name: string } }) =>
        a.counterparty?.name || '-',
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (a: Article) => (
        <div className="flex gap-2">
          <ProtectedAction
            entity="articles"
            action="update"
            fallback={
              <button
                disabled
                className="text-gray-400 p-1 rounded cursor-not-allowed"
                title="Нет прав на редактирование"
              >
                <Pencil size={16} />
              </button>
            }
          >
            <button
              onClick={() => handleEdit(a)}
              className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
              title="Изменить"
            >
              <Pencil size={16} />
            </button>
          </ProtectedAction>
          <ProtectedAction
            entity="articles"
            action="delete"
            fallback={
              <button
                disabled
                className="text-gray-400 p-1 rounded cursor-not-allowed"
                title="Нет прав на удаление"
              >
                <Trash2 size={16} />
              </button>
            }
          >
            <button
              onClick={() => handleDelete(a.id)}
              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
              title="Удалить"
            >
              <Trash2 size={16} />
            </button>
          </ProtectedAction>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Статьи
          </h1>
          <ProtectedAction entity="articles" action="create">
            <Button onClick={handleCreate}>Создать статью</Button>
          </ProtectedAction>
        </div>

        <Card>
          {/* Переключатель вида */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={() => setViewMode('tree')}
                variant={viewMode === 'tree' ? 'primary' : 'secondary'}
                size="sm"
                icon={<Network size={16} />}
              >
                Дерево
              </Button>
              <Button
                onClick={() => setViewMode('table')}
                variant={viewMode === 'table' ? 'primary' : 'secondary'}
                size="sm"
                icon={<List size={16} />}
              >
                Таблица
              </Button>
            </div>
          </div>

          {viewMode === 'tree' && (
            <>
              <ArticleTreeSearch
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                showLeavesOnly={showLeavesOnly}
                onShowLeavesOnlyChange={setShowLeavesOnly}
              />
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
                <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Структура статей
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        Найдено: {tree.length}{' '}
                        {tree.length === 1 ? 'статья' : 'статей'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {isTreeLoading ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Загрузка...
                    </div>
                  ) : treeError ? (
                    <div className="text-center py-8 text-red-500">
                      Ошибка загрузки статей
                    </div>
                  ) : (
                    <ArticleTree
                      tree={tree}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onAddChild={handleAddChild}
                      onChangeParent={handleChangeParent}
                      onDragEnd={handleDragEnd}
                      searchQuery={searchQuery}
                      showLeavesOnly={showLeavesOnly}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {viewMode === 'table' && (
            <>
              <div className="mb-4 space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Select
                      label="Тип"
                      value={typeFilter}
                      onChange={(value) =>
                        setTypeFilter(
                          value as 'income' | 'expense' | 'transfer' | ''
                        )
                      }
                      options={[
                        { value: '', label: 'Все типы' },
                        { value: 'income', label: 'Поступления' },
                        { value: 'expense', label: 'Списания' },
                        { value: 'transfer', label: 'Перевод' },
                      ]}
                      placeholder="Выберите тип"
                      fullWidth={false}
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <Select
                      label="Деятельность"
                      value={activityFilter}
                      onChange={(value) =>
                        setActivityFilter(
                          value as 'operating' | 'investing' | 'financing' | ''
                        )
                      }
                      options={[
                        { value: '', label: 'Все виды деятельности' },
                        { value: 'operating', label: 'Операционная' },
                        { value: 'investing', label: 'Инвестиционная' },
                        { value: 'financing', label: 'Финансовая' },
                      ]}
                      placeholder="Выберите деятельность"
                      fullWidth={false}
                    />
                  </div>
                  {hasActiveFilters && (
                    <Button
                      onClick={handleClearFilters}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <X size={16} />
                      Сбросить фильтры
                    </Button>
                  )}
                </div>
              </div>

              <>
                <Table
                  columns={columns}
                  data={articles}
                  keyExtractor={(a) => a.id}
                  loading={isLoading}
                />
              </>
            </>
          )}
        </Card>
      </div>
      <OffCanvas
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setInitialParentId(null);
        }}
        title={editing ? 'Редактировать статью' : 'Создать статью'}
      >
        <ArticleForm
          article={editing}
          onClose={() => {
            setIsFormOpen(false);
            setInitialParentId(null);
          }}
          initialParentId={initialParentId || undefined}
        />
      </OffCanvas>

      {/* Модальное окно для изменения родителя */}
      <OffCanvas
        isOpen={isChangeParentModalOpen}
        onClose={() => {
          setIsChangeParentModalOpen(false);
          setArticleToChangeParent(null);
          setNewParentId('');
        }}
        title="Изменить родительскую статью"
      >
        {articleToChangeParent && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Текущая статья:
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {articleToChangeParent.name}
              </p>
            </div>
            {articleToChangeParent.type !== 'transfer' && (
              <ArticleParentSelect
                label="Новая родительская статья"
                value={newParentId}
                onChange={setNewParentId}
                articleType={articleToChangeParent.type as 'income' | 'expense'}
                excludeArticleId={articleToChangeParent.id}
                placeholder="Корневая статья (без родителя)"
              />
            )}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleConfirmChangeParent}
                disabled={
                  newParentId === (articleToChangeParent.parentId || '')
                }
              >
                Сохранить
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsChangeParentModalOpen(false);
                  setArticleToChangeParent(null);
                  setNewParentId('');
                }}
              >
                Отмена
              </Button>
            </div>
          </div>
        )}
      </OffCanvas>

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          setDeleteModal({ isOpen: false, id: null });
          setArticleToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Подтверждение удаления"
        message={
          articleToDelete &&
          articleToDelete.children &&
          articleToDelete.children.length > 0
            ? (() => {
                const directChildren = articleToDelete.children.length;
                const totalDescendants =
                  getTotalDescendantsCount(articleToDelete);
                return `Вы уверены, что хотите удалить статью "${articleToDelete.name}"? У неё есть ${directChildren} ${directChildren === 1 ? 'дочерняя статья' : 'дочерних статей'}${totalDescendants > directChildren ? ` (всего ${totalDescendants} ${totalDescendants === 1 ? 'потомок' : 'потомков'})` : ''}, которые станут корневыми.`;
              })()
            : 'Вы уверены, что хотите удалить эту статью?'
        }
        confirmText="Удалить"
        variant="delete"
      />
    </Layout>
  );
};
