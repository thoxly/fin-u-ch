import { Input, Select, Button } from '@/shared/ui';
import {
  useCreateArticleMutation,
  useUpdateArticleMutation,
  useGetCounterpartiesQuery,
} from '@/store/api/catalogsApi';
import { Article } from '@shared/types/catalogs';
import { useEffect, useState } from 'react';
import { ArticleParentSelect } from '@/features/articles';

interface ArticleFormProps {
  article: Article | null;
  onClose: () => void;
  onSuccess?: (createdId: string) => void;
  initialName?: string;
  initialType?: 'income' | 'expense' | 'transfer';
  initialParentId?: string;
}

export const ArticleForm = ({
  article,
  onClose,
  onSuccess,
  initialName = '',
  initialType = 'expense',
  initialParentId,
}: ArticleFormProps) => {
  const [name, setName] = useState(article?.name || initialName);
  const [type, setType] = useState(article?.type || initialType);
  const [activity, setActivity] = useState(article?.activity || 'operating');
  const [parentId, setParentId] = useState(
    article?.parentId || initialParentId || ''
  );
  const [counterpartyId, setCounterpartyId] = useState(
    article?.counterpartyId || ''
  );

  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const [create, { isLoading: isCreating }] = useCreateArticleMutation();
  const [update, { isLoading: isUpdating }] = useUpdateArticleMutation();
  useEffect(() => {
    if (article) {
      setName(article.name || '');
      setType(article.type || 'expense');
      setActivity(article.activity || 'operating');
      setParentId(article.parentId || '');
      setCounterpartyId(article.counterpartyId || '');
    } else {
      setName(initialName);
      setType(initialType);
      setActivity('operating');
      setParentId(initialParentId || '');
      setCounterpartyId('');
    }
  }, [article, initialName, initialType, initialParentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (article) {
        await update({
          id: article.id,
          data: {
            name,
            type,
            activity,
            parentId: parentId || undefined,
            counterpartyId: counterpartyId || undefined,
          },
        }).unwrap();
      } else {
        const result = await create({
          name,
          type,
          activity,
          parentId: parentId || undefined,
          isActive: true,
          counterpartyId: counterpartyId || undefined,
        }).unwrap();
        if (onSuccess && result.id) {
          onSuccess(result.id);
        } else {
          onClose();
        }
      }
      if (article) {
        onClose();
      }
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
        onChange={(value) => setType(value)}
        options={[
          { value: 'income', label: 'Поступления' },
          { value: 'expense', label: 'Списания' },
        ]}
        required
      />
      <Select
        label="Деятельность"
        value={activity}
        onChange={(value) => setActivity(value)}
        options={[
          { value: 'operating', label: 'Операционная' },
          { value: 'investing', label: 'Инвестиционная' },
          { value: 'financing', label: 'Финансовая' },
        ]}
        required
      />
      <ArticleParentSelect
        label="Родительская статья"
        value={parentId}
        onChange={(value) => setParentId(value)}
        articleType={type}
        excludeArticleId={article?.id}
        placeholder="Корневая статья (без родителя)"
      />
      <Select
        label="Контрагент"
        value={counterpartyId}
        onChange={(value) => setCounterpartyId(value)}
        options={counterparties.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Не выбран"
      />
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
