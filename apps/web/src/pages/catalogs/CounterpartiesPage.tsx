import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { ProtectedAction } from '../../shared/components/ProtectedAction';
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
  const { canRead } = usePermissions();
  const { data: counterparties = [], isLoading } = useGetCounterpartiesQuery(
    undefined,
    {
      skip: !canRead('counterparties'),
    }
  );
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
          <ProtectedAction
            entity="counterparties"
            action="update"
            fallback={
              <button
                disabled
                className="text-gray-400 p-1 rounded cursor-not-allowed"
                title="Нет прав на редактирование"
              >
                <Pencil size={16} />
              </button>
            }
          >
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
          </ProtectedAction>
          <ProtectedAction
            entity="counterparties"
            action="delete"
            fallback={
              <button
                disabled
                className="text-gray-400 p-1 rounded cursor-not-allowed"
                title="Нет прав на удаление"
              >
                <Trash2 size={16} />
              </button>
            }
          >
            <button
              onClick={() =>
                window.confirm('Удалить?') && deleteCounterparty(c.id)
              }
              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
              title="Удалить"
            >
              <Trash2 size={16} />
            </button>
          </ProtectedAction>
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
          <ProtectedAction entity="counterparties" action="create">
            <Button
              onClick={() => {
                setEditing(null);
                setIsFormOpen(true);
              }}
            >
              Создать контрагента
            </Button>
          </ProtectedAction>
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
