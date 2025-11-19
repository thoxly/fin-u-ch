import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { ConfirmDeleteModal } from '../../shared/ui/ConfirmDeleteModal';
import {
  useGetSalariesQuery,
  useDeleteSalaryMutation,
} from '../../store/api/catalogsApi';
import { formatMoney } from '../../shared/lib/money';
import { formatDate } from '../../shared/lib/date';
import type { Salary } from '@shared/types/catalogs';
import { OffCanvas } from '@/shared/ui/OffCanvas';
import { SalaryForm } from '@/features/catalog-forms/index';

export const SalariesPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Salary | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });
  const { data: salaries = [], isLoading } = useGetSalariesQuery();
  const [deleteSalary] = useDeleteSalaryMutation();

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    await deleteSalary(deleteModal.id);
    setDeleteModal({ isOpen: false, id: null });
  };

  const columns = [
    { key: 'employeeName', header: 'Сотрудник' },
    {
      key: 'baseWage',
      header: 'Оклад',
      render: (s: Salary) => formatMoney(s.baseWage),
    },
    {
      key: 'contributionsPct',
      header: 'Взносы %',
      render: (s: Salary) => `${s.contributionsPct}%`,
    },
    {
      key: 'incomeTaxPct',
      header: 'НДФЛ %',
      render: (s: Salary) => `${s.incomeTaxPct}%`,
    },
    { key: 'periodicity', header: 'Периодичность' },
    {
      key: 'effectiveFrom',
      header: 'Действует с',
      render: (s: Salary) => formatDate(s.effectiveFrom),
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (s: Salary) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(s);
              setIsFormOpen(true);
            }}
            className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
            title="Изменить"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDelete(s.id)}
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
            Зарплаты
          </h1>
          <button
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
            className="relative px-4 py-2 border border-primary-500 dark:border-primary-400 rounded-lg bg-primary-500 dark:bg-primary-600 text-white hover:bg-primary-600 dark:hover:bg-primary-500 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Создать запись
          </button>
        </div>
        <Card>
          <Table
            columns={columns}
            data={salaries}
            keyExtractor={(s) => s.id}
            loading={isLoading}
          />
        </Card>
      </div>
      <OffCanvas
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Редактировать' : 'Создать'}
      >
        <SalaryForm salary={editing} onClose={() => setIsFormOpen(false)} />
      </OffCanvas>

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        message="Вы уверены, что хотите удалить эту запись о зарплате?"
        confirmText="Удалить"
      />
    </Layout>
  );
};
