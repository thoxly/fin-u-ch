import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import {
  useGetArticlesQuery,
  useCreateArticleMutation,
  useUpdateArticleMutation,
  useDeleteArticleMutation,
} from '../../store/api/catalogsApi';
import type { Article } from '@shared/types/catalogs';
import { OffCanvas } from '@/shared/ui/OffCanvas';
import { ArticleForm } from '@/features/catalog-forms/index';

export const ArticlesPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);

  const { data: articles = [], isLoading } = useGetArticlesQuery();
  const [deleteArticle] = useDeleteArticleMutation();

  const handleCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const handleEdit = (article: Article) => {
    setEditing(article);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту статью?')) {
      await deleteArticle(id);
    }
  };

  const columns = [
    { key: 'name', header: 'Название' },
    {
      key: 'type',
      header: 'Тип',
      render: (a: Article) => (a.type === 'income' ? 'Доход' : 'Расход'),
    },
    { key: 'activity', header: 'Деятельность' },
    {
      key: 'isActive',
      header: 'Активна',
      render: (a: Article) => (a.isActive ? 'Да' : 'Нет'),
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
          <h1 className="text-3xl font-bold text-gray-900">Статьи</h1>
          <Button onClick={handleCreate}>Создать статью</Button>
        </div>

        <Card>
          <Table
            columns={columns}
            data={articles}
            keyExtractor={(a) => a.id}
            loading={isLoading}
          />
        </Card>
      </div>
      <OffCanvas
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Редактировать статью' : 'Создать статью'}
      >
        <ArticleForm article={editing} onClose={() => setIsFormOpen(false)} />
      </OffCanvas>
    </Layout>
  );
};
