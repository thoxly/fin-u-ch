import { Input, Select, Button } from '@/shared/ui';
import {
  useCreateArticleMutation,
  useUpdateArticleMutation,
} from '@/store/api/catalogsApi';
import { Article } from '@shared/types/catalogs';
import { useEffect, useState } from 'react';

export const ArticleForm = ({
  article,
  onClose,
}: {
  article: Article | null;
  onClose: () => void;
}) => {
  const [name, setName] = useState(article?.name || '');
  const [type, setType] = useState(article?.type || 'expense');
  const [activity, setActivity] = useState(article?.activity || 'operating');
  const [isActive, setIsActive] = useState(article?.isActive ?? true);

  const [create, { isLoading: isCreating }] = useCreateArticleMutation();
  const [update, { isLoading: isUpdating }] = useUpdateArticleMutation();
  useEffect(() => {
    console.log('ArticleForm - article prop changed:', article);
    if (article) {
      console.log('ArticleForm - setting form values from article:', {
        name: article.name,
        type: article.type,
        activity: article.activity,
        isActive: article.isActive,
      });
      setName(article.name || '');
      setType(article.type || 'expense');
      setActivity(article.activity || 'operating');
      setIsActive(article.isActive ?? true);
    } else {
      console.log('ArticleForm - resetting form for new article');
      // Сброс при создании новой статьи
      setName('');
      setType('expense');
      setActivity('operating');
      setIsActive(true);
    }
  }, [article]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (article) {
        await update({
          id: article.id,
          data: { name, type, activity, isActive },
        }).unwrap();
      } else {
        await create({ name, type, activity, isActive }).unwrap();
      }
      onClose();
    } catch (error) {
      console.error('Failed to save article:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Название"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Select
        label="Тип"
        value={type}
        onChange={(e) => setType(e.target.value)}
        options={[
          { value: 'income', label: 'Доход' },
          { value: 'expense', label: 'Расход' },
        ]}
        required
      />
      <Select
        label="Деятельность"
        value={activity}
        onChange={(e) => setActivity(e.target.value)}
        options={[
          { value: 'operating', label: 'Операционная' },
          { value: 'investment', label: 'Инвестиционная' },
          { value: 'financial', label: 'Финансовая' },
        ]}
        required
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <span className="text-sm">Активна</span>
      </label>
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isCreating || isUpdating}>
          {article ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </form>
  );
};
