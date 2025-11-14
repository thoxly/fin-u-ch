import { Input, Select, Button } from '@/shared/ui';
import {
  useGetCounterpartiesQuery,
  useGetDepartmentsQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
} from '@/store/api/catalogsApi';
import { Deal } from '@shared/types/catalogs';
import { useState, useEffect } from 'react';

export const DealForm = ({
  deal,
  onClose,
  onSuccess,
}: {
  deal: Deal | null;
  onClose: () => void;
  onSuccess?: (createdId: string) => void;
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

  // Синхронизация локального состояния с пропсом deal
  useEffect(() => {
    setName(deal?.name || '');
    setAmount(deal?.amount?.toString() || '');
    setCounterpartyId(deal?.counterpartyId || '');
    setDepartmentId(deal?.departmentId || '');
  }, [deal]); // Зависимость от deal

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      amount: parseFloat(amount),
      counterpartyId: counterpartyId || undefined,
      departmentId: departmentId || undefined,
    };
    try {
      if (deal) {
        await update({ id: deal.id, data }).unwrap();
        onClose();
      } else {
        const result = await create(data).unwrap();
        if (onSuccess && result.id) {
          onSuccess(result.id);
        } else {
          onClose();
        }
      }
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
        onChange={(value) => setCounterpartyId(value)}
        options={counterparties.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Не выбран"
      />
      <Select
        label="Подразделение"
        value={departmentId}
        onChange={(value) => setDepartmentId(value)}
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
