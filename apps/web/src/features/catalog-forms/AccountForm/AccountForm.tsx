import { Input } from '../../../shared/ui/Input';
import { Button, Select } from '../../../shared/ui';
import {
  useCreateAccountMutation,
  useUpdateAccountMutation,
} from '@/store/api/catalogsApi';
import { Account } from '@shared/types/catalogs';
import { useEffect, useState } from 'react';

export const AccountForm = ({
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
        onChange={(value) => setCurrency(value)}
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
