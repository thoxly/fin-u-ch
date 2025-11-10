import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { ConfirmDeleteModal } from '../../shared/ui/ConfirmDeleteModal';
import {
  useGetAccountsQuery,
  useDeleteAccountMutation,
} from '../../store/api/catalogsApi';
import { formatMoney } from '../../shared/lib/money';
import type { Account } from '@shared/types/catalogs';
import { OffCanvas } from '@/shared/ui/OffCanvas';
import { AccountForm } from '@/features/catalog-forms/index';

export const AccountsPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });

  const { data: accounts = [], isLoading } = useGetAccountsQuery();
  const [deleteAccount] = useDeleteAccountMutation();

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    await deleteAccount(deleteModal.id);
    setDeleteModal({ isOpen: false, id: null });
  };

  const columns = [
    { key: 'name', header: 'Название' },
    { key: 'number', header: 'Номер' },
    { key: 'currency', header: 'Валюта' },
    {
      key: 'openingBalance',
      header: 'Начальный остаток',
      render: (a: Account) => formatMoney(a.openingBalance || 0, a.currency),
    },
    {
      key: 'isActive',
      header: 'Активен',
      render: (a: Account) => (a.isActive ? 'Да' : 'Нет'),
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (a: Account) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(a);
              setIsFormOpen(true);
            }}
            className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
            title="Изменить"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => handleDelete(a.id)}
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
            Счета
          </h1>
          <Button
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            Создать счет
          </Button>
        </div>
        <Card>
          <Table
            columns={columns}
            data={accounts}
            keyExtractor={(a) => a.id}
            loading={isLoading}
          />
        </Card>
      </div>
      <OffCanvas
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Редактировать счет' : 'Создать счет'}
      >
        <AccountForm account={editing} onClose={() => setIsFormOpen(false)} />
      </OffCanvas>

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        message="Вы уверены, что хотите удалить этот счет?"
        confirmText="Удалить"
      />
    </Layout>
  );
};
