import { useState } from 'react';
import { Pencil, Trash2, Archive, RotateCcw, X } from 'lucide-react';

import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Select } from '../../shared/ui/Select';
import { ConfirmDeleteModal } from '../../shared/ui/ConfirmDeleteModal';
import {
  useGetArticlesQuery,
  useDeleteArticleMutation,
  useArchiveArticleMutation,
  useUnarchiveArticleMutation,
} from '../../store/api/catalogsApi';
import { useBulkArchiveArticlesMutation } from '../../store/api/catalogsApi';
import type { Article } from '@shared/types/catalogs';
import { OffCanvas } from '@/shared/ui/OffCanvas';
import { ArticleForm } from '@/features/catalog-forms/index';
import { useBulkSelection } from '../../shared/hooks/useBulkSelection';
import { BulkActionsBar } from '../../shared/ui/BulkActionsBar';

export const ArticlesPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);

  // Состояния для модалок подтверждения
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
    type: 'delete' | 'archive' | 'bulk';
    ids?: string[];
  }>({
    isOpen: false,
    id: null,
    type: 'delete',
  });

  // Фильтры
  const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | ''>('');
  const [activityFilter, setActivityFilter] = useState<
    'operating' | 'investing' | 'financing' | ''
  >('');
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(
    undefined
  );

  const filters = {
    ...(typeFilter && { type: typeFilter as 'income' | 'expense' }),
    ...(activityFilter && {
      activity: activityFilter as 'operating' | 'investing' | 'financing',
    }),
    ...(isActiveFilter !== undefined && { isActive: isActiveFilter }),
  };

  const {
    data: articles = [],
    isLoading,
    error,
  } = useGetArticlesQuery(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const [deleteArticle] = useDeleteArticleMutation();
  const [archiveArticle] = useArchiveArticleMutation();
  const [unarchiveArticle] = useUnarchiveArticleMutation();
  const [bulkArchiveArticles] = useBulkArchiveArticlesMutation();

  const { selectedIds, toggleSelectOne, clearSelection } = useBulkSelection();

  // Отладочная информация
  console.log('ArticlesPage - articles:', articles);
  console.log('ArticlesPage - isLoading:', isLoading);
  console.log('ArticlesPage - error:', error);

  const handleCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const handleEdit = (article: Article) => {
    console.log('ArticlesPage - handleEdit called with article:', article);
    setEditing(article);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id, type: 'delete' });
  };

  const handleArchive = (id: string) => {
    setDeleteModal({ isOpen: true, id, type: 'archive' });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    await deleteArticle(deleteModal.id);
    setDeleteModal({ isOpen: false, id: null, type: 'delete' });
  };

  const confirmArchive = async () => {
    if (!deleteModal.id) return;
    await archiveArticle(deleteModal.id);
    setDeleteModal({ isOpen: false, id: null, type: 'delete' });
  };

  const confirmBulkArchive = async () => {
    if (!deleteModal.ids || deleteModal.ids.length === 0) return;
    await bulkArchiveArticles(deleteModal.ids);
    clearSelection();
    setDeleteModal({ isOpen: false, id: null, type: 'delete' });
  };

  const handleModalConfirm = async () => {
    if (deleteModal.type === 'delete') {
      await confirmDelete();
    } else if (deleteModal.type === 'archive') {
      await confirmArchive();
    } else if (deleteModal.type === 'bulk') {
      await confirmBulkArchive();
    }
  };

  const handleUnarchive = async (id: string) => {
    await unarchiveArticle(id);
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
    setIsActiveFilter(undefined);
  };

  const hasActiveFilters =
    typeFilter || activityFilter || isActiveFilter !== undefined;

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
      key: 'status',
      header: 'Статус',
      render: (a: Article) => (a.isActive ? 'Активна' : 'В архиве'),
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (a: Article) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(a)}
            className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
            title="Изменить"
          >
            <Pencil size={16} />
          </button>
          {a.isActive ? (
            <button
              onClick={() => handleArchive(a.id)}
              className="text-amber-600 hover:text-amber-800 p-1 rounded hover:bg-amber-50 transition-colors"
              title="Архивировать"
            >
              <Archive size={16} />
            </button>
          ) : (
            <button
              onClick={() => handleUnarchive(a.id)}
              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors"
              title="Вернуть из архива"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            onClick={() => handleDelete(a.id)}
            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
            title="Удалить"
          >
            <Trash2 size={16} />
          </button>
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
          <Button onClick={handleCreate}>Создать статью</Button>
        </div>

        <Card>
          <div className="mb-4 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Select
                  label="Тип"
                  value={typeFilter}
                  onChange={(value) =>
                    setTypeFilter(value as 'income' | 'expense' | '')
                  }
                  options={[
                    { value: '', label: 'Все типы' },
                    { value: 'income', label: 'Поступления' },
                    { value: 'expense', label: 'Списания' },
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
              <div className="flex-1 min-w-[200px]">
                <Select
                  label="Статус"
                  value={
                    isActiveFilter === undefined
                      ? ''
                      : isActiveFilter
                        ? 'true'
                        : 'false'
                  }
                  onChange={(value) => {
                    setIsActiveFilter(
                      value === '' ? undefined : value === 'true'
                    );
                  }}
                  options={[
                    { value: '', label: 'Все статусы' },
                    { value: 'true', label: 'Активна' },
                    { value: 'false', label: 'В архиве' },
                  ]}
                  placeholder="Выберите статус"
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
            <BulkActionsBar
              selectedCount={selectedIds.length}
              onClear={clearSelection}
              actions={[
                {
                  label: `В архив выбранные (${selectedIds.length})`,
                  variant: 'warning',
                  onClick: () => {
                    setDeleteModal({
                      isOpen: true,
                      id: null,
                      type: 'bulk',
                      ids: selectedIds,
                    });
                  },
                },
              ]}
            />
          </>
        </Card>
      </div>
      <OffCanvas
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Редактировать статью' : 'Создать статью'}
      >
        <ArticleForm article={editing} onClose={() => setIsFormOpen(false)} />
      </OffCanvas>

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({ isOpen: false, id: null, type: 'delete' })
        }
        onConfirm={handleModalConfirm}
        title={
          deleteModal.type === 'archive'
            ? 'Подтверждение архивирования'
            : deleteModal.type === 'bulk'
              ? 'Подтверждение архивирования'
              : 'Подтверждение удаления'
        }
        message={
          deleteModal.type === 'archive'
            ? 'Вы уверены, что хотите архивировать эту статью?'
            : deleteModal.type === 'bulk'
              ? `Отправить в архив выбранные статьи (${deleteModal.ids?.length || 0})?`
              : 'Вы уверены, что хотите удалить эту статью?'
        }
        confirmText={
          deleteModal.type === 'archive'
            ? 'Архивировать'
            : deleteModal.type === 'bulk'
              ? `В архив (${deleteModal.ids?.length || 0})`
              : 'Удалить'
        }
        variant={
          deleteModal.type === 'archive' || deleteModal.type === 'bulk'
            ? 'warning'
            : 'delete'
        }
      />
    </Layout>
  );
};
