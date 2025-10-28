import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import {
  useGetDealsQuery,
  useDeleteDealMutation,
} from '../../store/api/catalogsApi';
import { formatMoney } from '../../shared/lib/money';
import type { Deal } from '@shared/types/catalogs';
import { OffCanvas } from '@/shared/ui/OffCanvas';
import { DealForm } from '@/features/catalog-forms/index';

export const DealsPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const { data: deals = [], isLoading } = useGetDealsQuery();
  const [deleteDeal] = useDeleteDealMutation();

  const columns = [
    { key: 'name', header: 'Название' },
    {
      key: 'amount',
      header: 'Сумма',
      render: (d: Deal) => formatMoney(d.amount || 0),
    },
    { key: 'counterpartyName', header: 'Контрагент' },
    { key: 'departmentName', header: 'Подразделение' },
    {
      key: 'actions',
      header: 'Действия',
      render: (d: Deal) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(d);
              setIsFormOpen(true);
            }}
            className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
            title="Изменить"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => window.confirm('Удалить?') && deleteDeal(d.id)}
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
            Сделки
          </h1>
          <Button
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            Создать сделку
          </Button>
        </div>
        <Card>
          <Table
            columns={columns}
            data={deals}
            keyExtractor={(d) => d.id}
            loading={isLoading}
          />
        </Card>
      </div>
      <OffCanvas
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Редактировать' : 'Создать'}
      >
        <DealForm deal={editing} onClose={() => setIsFormOpen(false)} />
      </OffCanvas>
    </Layout>
  );
};
