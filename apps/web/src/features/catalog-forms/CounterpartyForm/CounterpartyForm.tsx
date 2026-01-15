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
  _initialAccountId?: string; // Unused but kept for interface compatibility
}

interface MutationResult {
  id?: string | number;
  _id?: string | number;
  data?: { id?: string | number };
}

export const CounterpartyForm = ({
  counterparty,
  onClose,
  onSuccess,
  initialName = '',
  initialInn = '',
  _initialAccountId,
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
        const result = (await create({ name, inn, category }).unwrap()) as
          | MutationResult
          | string
          | number;

        let createdId: string | undefined;

        if (typeof result === 'string' || typeof result === 'number') {
          createdId = String(result);
        } else if (typeof result === 'object' && result !== null) {
          createdId = String(
            result.id || result._id || result.data?.id || ''
          ).replace(/^undefined$/, '');
        }

        if (onSuccess && createdId) {
          onSuccess(createdId);
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
        onChange={(value) =>
          setCategory(
            value as 'supplier' | 'customer' | 'gov' | 'employee' | 'other'
          )
        }
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
