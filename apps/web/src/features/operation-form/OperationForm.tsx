import { useState, FormEvent } from 'react';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import {
  useCreateOperationMutation,
  useUpdateOperationMutation,
} from '../../store/api/operationsApi';
import {
  useGetArticlesQuery,
  useGetAccountsQuery,
  useGetCounterpartiesQuery,
  useGetDealsQuery,
  useGetDepartmentsQuery,
} from '../../store/api/catalogsApi';
import { toISODate } from '../../shared/lib/date';
import type { Operation } from '@shared/types/operations';

interface OperationFormProps {
  operation: Operation | null;
  onClose: () => void;
}

export const OperationForm = ({ operation, onClose }: OperationFormProps) => {
  const [type, setType] = useState(operation?.type || 'expense');
  const [operationDate, setOperationDate] = useState(
    operation?.operationDate.split('T')[0] || toISODate(new Date())
  );
  const [amount, setAmount] = useState(operation?.amount.toString() || '');
  const [currency, setCurrency] = useState(operation?.currency || 'RUB');
  const [articleId, setArticleId] = useState(operation?.articleId || '');
  const [accountId, setAccountId] = useState(operation?.accountId || '');
  const [sourceAccountId, setSourceAccountId] = useState(
    operation?.sourceAccountId || ''
  );
  const [targetAccountId, setTargetAccountId] = useState(
    operation?.targetAccountId || ''
  );
  const [counterpartyId, setCounterpartyId] = useState(
    operation?.counterpartyId || ''
  );
  const [dealId, setDealId] = useState(operation?.dealId || '');
  const [departmentId, setDepartmentId] = useState(operation?.departmentId || '');
  const [description, setDescription] = useState(operation?.description || '');

  const { data: articles = [] } = useGetArticlesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();

  const [createOperation, { isLoading: isCreating }] =
    useCreateOperationMutation();
  const [updateOperation, { isLoading: isUpdating }] =
    useUpdateOperationMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const operationData = {
      type,
      operationDate: new Date(operationDate).toISOString(),
      amount: parseFloat(amount),
      currency,
      articleId: articleId || undefined,
      accountId: type !== 'transfer' ? accountId || undefined : undefined,
      sourceAccountId: type === 'transfer' ? sourceAccountId || undefined : undefined,
      targetAccountId: type === 'transfer' ? targetAccountId || undefined : undefined,
      counterpartyId: counterpartyId || undefined,
      dealId: dealId || undefined,
      departmentId: departmentId || undefined,
      description: description || undefined,
    };

    try {
      if (operation) {
        await updateOperation({ id: operation.id, data: operationData }).unwrap();
      } else {
        await createOperation(operationData).unwrap();
      }
      onClose();
    } catch (error) {
      console.error('Failed to save operation:', error);
    }
  };

  const typeOptions = [
    { value: 'income', label: 'Доход' },
    { value: 'expense', label: 'Расход' },
    { value: 'transfer', label: 'Перевод' },
  ];

  const currencyOptions = [
    { value: 'RUB', label: 'RUB' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Тип операции"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={typeOptions}
          required
        />

        <Input
          label="Дата"
          type="date"
          value={operationDate}
          onChange={(e) => setOperationDate(e.target.value)}
          required
        />

        <Input
          label="Сумма"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <Select
          label="Валюта"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          options={currencyOptions}
          required
        />
      </div>

      {type === 'transfer' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Счет списания"
            value={sourceAccountId}
            onChange={(e) => setSourceAccountId(e.target.value)}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите счет"
            required
          />
          <Select
            label="Счет зачисления"
            value={targetAccountId}
            onChange={(e) => setTargetAccountId(e.target.value)}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите счет"
            required
          />
        </div>
      ) : (
        <>
          <Select
            label="Статья"
            value={articleId}
            onChange={(e) => setArticleId(e.target.value)}
            options={articles
              .filter((a) => a.type === type)
              .map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите статью"
          />

          <Select
            label="Счет"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите счет"
          />
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Контрагент"
          value={counterpartyId}
          onChange={(e) => setCounterpartyId(e.target.value)}
          options={counterparties.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Не выбран"
        />

        <Select
          label="Сделка"
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          options={deals.map((d) => ({ value: d.id, label: d.name }))}
          placeholder="Не выбрана"
        />

        <Select
          label="Подразделение"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          placeholder="Не выбрано"
        />
      </div>

      <Input
        label="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Дополнительная информация"
      />

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isCreating || isUpdating}>
          {operation ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </form>
  );
};

