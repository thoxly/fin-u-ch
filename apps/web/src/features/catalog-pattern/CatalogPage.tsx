// packages/shared/src/features/catalog/CatalogPage.tsx
import React from 'react';
import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { OffCanvas } from '../../shared/ui/OffCanvas';
import type { CatalogItem } from '@/hooks/useCatalogForm';

export interface CatalogColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

export interface CatalogPageProps<T extends CatalogItem> {
  title: string;
  createLabel: string;
  data: T[];
  isLoading: boolean;
  columns: CatalogColumn<T>[];
  keyExtractor: (item: T) => string;
  onCreate: () => void;
  onEdit: (item: T) => void;
  onDelete?: (item: T) => void;
  formComponent: React.ReactNode;
  isFormOpen: boolean;
  onCloseForm: () => void;
  formTitle: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Универсальная страница справочника с таблицей, кнопкой создания и формой в OffCanvas.
 * Устраняет дублирование логики между ArticlesPage, AccountsPage и др.
 */
export const CatalogPage = <T extends CatalogItem>({
  title,
  createLabel,
  data,
  isLoading,
  columns,
  keyExtractor,
  onCreate,
  onEdit,
  onDelete,
  formComponent,
  isFormOpen,
  onCloseForm,
  formTitle,
  size = 'md',
}: CatalogPageProps<T>) => {
  // Добавляем колонку действий в конец, если onDelete или onEdit заданы
  const columnsWithActions = React.useMemo(() => {
    const actionColumn: CatalogColumn<T> = {
      key: 'actions',
      header: 'Действия',
      render: (item: T) => (
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(item)}
            className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
            title="Изменить"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(item)}
              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
              title="Удалить"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      ),
    };

    return [...columns, actionColumn];
  }, [columns, onEdit, onDelete]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <Button onClick={onCreate}>{createLabel}</Button>
        </div>
        <Card>
          <Table
            columns={columnsWithActions}
            data={data}
            keyExtractor={keyExtractor}
            loading={isLoading}
          />
        </Card>
      </div>
      <OffCanvas
        isOpen={isFormOpen}
        onClose={onCloseForm}
        title={formTitle}
        size={size}
      >
        {formComponent}
      </OffCanvas>
    </Layout>
  );
};
