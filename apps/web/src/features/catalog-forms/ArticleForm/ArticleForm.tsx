import { Input, Select, Button } from '@/shared/ui';
import {
  useCreateArticleMutation,
  useUpdateArticleMutation,
  useGetCounterpartiesQuery,
} from '@/store/api/catalogsApi';
import { Article } from '@shared/types/catalogs';
import { useEffect, useState } from 'react';

interface ArticleFormProps {
  article: Article | null;
  onClose: () => void;
  onSuccess?: (createdId: string) => void;
  initialName?: string;
  initialType?: 'income' | 'expense' | 'transfer';
}

export const ArticleForm = ({
  article,
  onClose,
  onSuccess,
  initialName = '',
  initialType = 'expense',
}: ArticleFormProps) => {
  const [name, setName] = useState(article?.name || initialName);
  const [type, setType] = useState(article?.type || initialType);
  const [activity, setActivity] = useState(article?.activity || 'operating');
  const [counterpartyId, setCounterpartyId] = useState(
    article?.counterpartyId || ''
  );

  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const [create, { isLoading: isCreating }] = useCreateArticleMutation();
  const [update, { isLoading: isUpdating }] = useUpdateArticleMutation();

  useEffect(() => {
    setName(article?.name || initialName);
    setType(article?.type || initialType);
    setActivity(article?.activity || 'operating');
    setCounterpartyId(article?.counterpartyId || '');
  }, [article, initialName, initialType]);

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
            counterpartyId: counterpartyId || undefined,
          },
        }).unwrap();
      } else {
        const result = await create({
          name,
          type,
          activity,
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
        onChange={(e) => setType(e.target.value)}
        options={[
          { value: 'income', label: 'Поступления' },
          { value: 'expense', label: 'Списания' },
        ]}
        required
      />
      <Select
        label="Деятельность"
        value={activity}
        onChange={(e) => setActivity(e.target.value)}
        options={[
          { value: 'operating', label: 'Операционная' },
          { value: 'investing', label: 'Инвестиционная' },
          { value: 'financing', label: 'Финансовая' },
        ]}
        required
      />
      <Select
        label="Контрагент"
        value={counterpartyId}
        onChange={(e) => setCounterpartyId(e.target.value)}
        options={[
          { value: '', label: 'Не выбран' },
          ...counterparties.map((c) => ({ value: c.id, label: c.name })),
        ]}
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