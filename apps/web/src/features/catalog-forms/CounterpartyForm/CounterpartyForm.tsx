import { Input, Select, Button } from '@/shared/ui';
import {
  useCreateCounterpartyMutation,
  useUpdateCounterpartyMutation,
} from '@/store/api/catalogsApi';
import { Counterparty } from '@shared/types/catalogs';
import { useState, useEffect } from 'react';

interface CounterpartyFormProps {
  counterparty: Counterparty | null;
  onClose: () => void;
  onSuccess?: (createdId: string) => void;
  initialName?: string;
  initialInn?: string;
}

export const CounterpartyForm = ({
  counterparty,
  onClose,
  onSuccess,
  initialName = '',
  initialInn = '',
}: CounterpartyFormProps) => {
  const [name, setName] = useState(counterparty?.name || initialName);
  const [inn, setInn] = useState(counterparty?.inn || initialInn);
  const [category, setCategory] = useState(counterparty?.category || 'other');
  const [create, { isLoading: isCreating }] = useCreateCounterpartyMutation();
  const [update, { isLoading: isUpdating }] = useUpdateCounterpartyMutation();

  useEffect(() => {
    setName(counterparty?.name || initialName);
    setInn(counterparty?.inn || initialInn);
    setCategory(counterparty?.category || 'other');
  }, [counterparty, initialName, initialInn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (counterparty) {
        await update({
          id: counterparty.id,
          data: { name, inn, category },
        }).unwrap();
      } else {
        const result = await create({ name, inn, category }).unwrap();
        if (onSuccess && result.id) {
          onSuccess(result.id);
        } else {
          onClose();
        }
      }
      if (counterparty) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save counterparty:', error);
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
      <Input label="ИНН" value={inn} onChange={(e) => setInn(e.target.value)} />
      <Select
        label="Категория"
        value={category}
        onChange={(value) => setCategory(value)}
        options={[
          { value: 'supplier', label: 'Поставщик' },
          { value: 'customer', label: 'Клиент' },
          { value: 'gov', label: 'Гос. орган' },
          { value: 'employee', label: 'Сотрудник' },
          { value: 'other', label: 'Другое' },
        ]}
        required
      />
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isCreating || isUpdating}>
          {counterparty ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </form>
  );
};
