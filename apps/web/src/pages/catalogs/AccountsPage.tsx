import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Table } from '../../shared/ui/Table';
import { Modal } from '../../shared/ui/Modal';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
} from '../../store/api/catalogsApi';
import { formatMoney } from '../../shared/lib/money';
import type { Account } from '@shared/types/catalogs';
import { OffCanvas } from '@/shared/ui/OffCanvas';

export const AccountsPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const { data: accounts = [], isLoading } = useGetAccountsQuery();
  const [deleteAccount] = useDeleteAccountMutation();

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
            onClick={() => window.confirm('Удалить?') && deleteAccount(a.id)}
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
          <h1 className="text-3xl font-bold text-gray-900">Счета</h1>
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
    </Layout>
  );
};

const AccountForm = ({
  account,
  onClose,
}: {
  account: Account | null;
  onClose: () => void;
}) => {
  const [name, setName] = useState(account?.name || '');
  const [number, setNumber] = useState(account?.number || '');
  const [currency, setCurrency] = useState(account?.currency || 'RUB');
  const [openingBalance, setOpeningBalance] = useState(
    account?.openingBalance?.toString() || '0'
  );
  const [isActive, setIsActive] = useState(account?.isActive ?? true);

  const [create, { isLoading: isCreating }] = useCreateAccountMutation();
  const [update, { isLoading: isUpdating }] = useUpdateAccountMutation();

  // 🔁 Синхронизация состояния с account при изменении
  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setNumber(account.number || '');
      setCurrency(account.currency || 'RUB');
      setOpeningBalance(account.openingBalance?.toString() || '0');
      setIsActive(account.isActive ?? true);
    } else {
      // Сброс при создании нового счета
      setName('');
      setNumber('');
      setCurrency('RUB');
      setOpeningBalance('0');
      setIsActive(true);
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      number,
      currency,
      openingBalance: parseFloat(openingBalance),
      isActive,
    };
    try {
      if (account) {
        await update({ id: account.id, data }).unwrap();
      } else {
        await create(data).unwrap();
      }
      onClose();
    } catch (error) {
      console.error('Failed to save account:', error);
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
        label="Номер счета"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
      />
      <Select
        label="Валюта"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        options={[
          { value: 'RUB', label: 'RUB' },
          { value: 'USD', label: 'USD' },
          { value: 'EUR', label: 'EUR' },
        ]}
        required
      />
      <Input
        label="Начальный остаток"
        type="number"
        step="0.01"
        value={openingBalance}
        onChange={(e) => setOpeningBalance(e.target.value)}
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <span className="text-sm">Активен</span>
      </label>
      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isCreating || isUpdating}>
          {account ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </form>
  );
};
