import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { ConfirmDeleteModal } from '../../shared/ui/ConfirmDeleteModal';
import {
  useGetCounterpartiesQuery,
  useDeleteCounterpartyMutation,
} from '../../store/api/catalogsApi';
import type { Counterparty } from '@shared/types/catalogs';
import { OffCanvas } from '@/shared/ui/OffCanvas';
import { CounterpartyForm } from '@/features/catalog-forms/index';

export const CounterpartiesPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Counterparty | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });
  const { data: counterparties = [], isLoading } = useGetCounterpartiesQuery();
  const [deleteCounterparty] = useDeleteCounterpartyMutation();

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    await deleteCounterparty(deleteModal.id);
    setDeleteModal({ isOpen: false, id: null });
  };

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
            onClick={() => handleDelete(c.id)}
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

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        message="Вы уверены, что хотите удалить этого контрагента?"
        confirmText="Удалить"
      />
    </Layout>
  );
};
