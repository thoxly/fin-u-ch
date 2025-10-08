import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Modal } from '../../shared/ui/Modal';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import {
  useGetDealsQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useDeleteDealMutation,
  useGetCounterpartiesQuery,
  useGetDepartmentsQuery,
} from '../../store/api/catalogsApi';
import { formatMoney } from '../../shared/lib/money';
import type { Deal } from '@shared/types/catalogs';

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
          <h1 className="text-3xl font-bold text-gray-900">Сделки</h1>
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
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={editing ? 'Редактировать' : 'Создать'}
        >
          <DealForm deal={editing} onClose={() => setIsFormOpen(false)} />
        </Modal>
      </div>
    </Layout>
  );
};

const DealForm = ({
  deal,
  onClose,
}: {
  deal: Deal | null;
  onClose: () => void;
}) => {
  const [name, setName] = useState(deal?.name || '');
  const [amount, setAmount] = useState(deal?.amount?.toString() || '');
  const [counterpartyId, setCounterpartyId] = useState(
    deal?.counterpartyId || ''
  );
  const [departmentId, setDepartmentId] = useState(deal?.departmentId || '');
  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();
  const [create, { isLoading: isCreating }] = useCreateDealMutation();
  const [update, { isLoading: isUpdating }] = useUpdateDealMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      amount: parseFloat(amount),
      counterpartyId: counterpartyId || undefined,
      departmentId: departmentId || undefined,
    };
    try {
      if (deal) await update({ id: deal.id, data }).unwrap();
      else await create(data).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to save deal:', error);
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
      <Input
        label="Сумма"
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Select
        label="Контрагент"
        value={counterpartyId}
        onChange={(e) => setCounterpartyId(e.target.value)}
        options={counterparties.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Не выбран"
      />
      <Select
        label="Подразделение"
        value={departmentId}
        onChange={(e) => setDepartmentId(e.target.value)}
        options={departments.map((d) => ({ value: d.id, label: d.name }))}
        placeholder="Не выбрано"
      />
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isCreating || isUpdating}>
          {deal ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </form>
  );
};
