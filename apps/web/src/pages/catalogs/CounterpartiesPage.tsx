import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import {
  useGetCounterpartiesQuery,
  useCreateCounterpartyMutation,
  useUpdateCounterpartyMutation,
  useDeleteCounterpartyMutation,
} from '../../store/api/catalogsApi';
import type { Counterparty } from '@shared/types/catalogs';
import { OffCanvas } from '@/shared/ui/OffCanvas';

export const CounterpartiesPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Counterparty | null>(null);
  const { data: counterparties = [], isLoading } = useGetCounterpartiesQuery();
  const [deleteCounterparty] = useDeleteCounterpartyMutation();

  const categoryLabels: Record<string, string> = {
    supplier: 'Поставщик',
    customer: 'Клиент',
    gov: 'Гос. орган',
    employee: 'Сотрудник',
    other: 'Другое',
  };

  const columns = [
    { key: 'name', header: 'Название' },
    { key: 'inn', header: 'ИНН' },
    {
      key: 'category',
      header: 'Категория',
      render: (c: Counterparty) => categoryLabels[c.category] || c.category,
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (c: Counterparty) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(c);
              setIsFormOpen(true);
            }}
            className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
            title="Изменить"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() =>
              window.confirm('Удалить?') && deleteCounterparty(c.id)
            }
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
            Контрагенты
          </h1>
          <Button
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            Создать контрагента
          </Button>
        </div>
        <Card>
          <Table
            columns={columns}
            data={counterparties}
            keyExtractor={(c) => c.id}
            loading={isLoading}
          />
        </Card>
      </div>
      <OffCanvas
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Редактировать' : 'Создать'}
      >
        <CounterpartyForm
          counterparty={editing}
          onClose={() => setIsFormOpen(false)}
        />
      </OffCanvas>
    </Layout>
  );
};

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
