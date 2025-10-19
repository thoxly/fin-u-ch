import { Input, Select, Button } from '@/shared/ui';
import {
  useCreateCounterpartyMutation,
  useUpdateCounterpartyMutation,
} from '@/store/api/catalogsApi';
import { Counterparty } from '@shared/types/catalogs';
import { useState, useEffect } from 'react';

export const CounterpartyForm = ({
  counterparty,
  onClose,
}: {
  counterparty: Counterparty | null;
  onClose: () => void;
}) => {
  const [name, setName] = useState(counterparty?.name || '');
  const [inn, setInn] = useState(counterparty?.inn || '');
  const [category, setCategory] = useState(counterparty?.category || 'other');
  const [create, { isLoading: isCreating }] = useCreateCounterpartyMutation();
  const [update, { isLoading: isUpdating }] = useUpdateCounterpartyMutation();

  // Синхронизация локального состояния с пропсом counterparty
  useEffect(() => {
    setName(counterparty?.name || '');
    setInn(counterparty?.inn || '');
    setCategory(counterparty?.category || 'other');
  }, [counterparty]); // Зависимость от counterparty

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (counterparty)
        await update({
          id: counterparty.id,
          data: { name, inn, category },
        }).unwrap();
      else await create({ name, inn, category }).unwrap();
      onClose();
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
        onChange={(e) => setCategory(e.target.value)}
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
