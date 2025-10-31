import { useState, FormEvent, useEffect } from 'react';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import {
  useCreatePlanMutation,
  useUpdatePlanMutation,
} from '../../store/api/plansApi';
import {
  useGetArticlesQuery,
  useGetAccountsQuery,
} from '../../store/api/catalogsApi';
import { toISODate } from '../../shared/lib/date';
import type { PlanItem } from '@shared/types/operations';
import {
  OperationType,
  Periodicity,
  PlanStatus,
} from '@shared/constants/enums';

// API возвращает даты как строки, не как Date объекты
type PlanItemFromAPI = Omit<
  PlanItem,
  'startDate' | 'endDate' | 'createdAt' | 'updatedAt' | 'deletedAt'
> & {
  startDate: string;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

interface PlanFormProps {
  plan: PlanItemFromAPI | null;
  budgetId?: string;
  onClose: () => void;
}

export const PlanForm = ({ plan, budgetId, onClose }: PlanFormProps) => {
  console.log('PlanForm - plan prop:', plan);
  console.log('PlanForm - budgetId prop:', budgetId);

  const [type, setType] = useState(plan?.type || 'expense');
  const [startDate, setStartDate] = useState(
    plan?.startDate.split('T')[0] || toISODate(new Date())
  );
  const [endDate, setEndDate] = useState(
    plan?.endDate ? plan.endDate.split('T')[0] : ''
  );
  const [amount, setAmount] = useState(plan?.amount.toString() || '');
  const [currency, setCurrency] = useState(plan?.currency || 'RUB');
  const [articleId, setArticleId] = useState(plan?.articleId || '');
  const [accountId, setAccountId] = useState(plan?.accountId || '');
  const [repeat, setRepeat] = useState(plan?.repeat || 'monthly');
  const [status, setStatus] = useState(plan?.status || 'active');

  const { data: articles = [] } = useGetArticlesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();

  const [createPlan, { isLoading: isCreating }] = useCreatePlanMutation();
  const [updatePlan, { isLoading: isUpdating }] = useUpdatePlanMutation();

  // Отслеживаем изменения в пропе plan
  useEffect(() => {
    console.log('PlanForm - plan prop changed:', plan);
    if (plan) {
      console.log('PlanForm - setting form values from plan:', {
        type: plan.type,
        startDate: plan.startDate,
        endDate: plan.endDate,
        amount: plan.amount,
        currency: plan.currency,
        articleId: plan.articleId,
        accountId: plan.accountId,
        repeat: plan.repeat,
        status: plan.status,
      });
      setType(plan.type || 'expense');
      setStartDate(plan.startDate.split('T')[0] || toISODate(new Date()));
      setEndDate(plan.endDate ? plan.endDate.split('T')[0] : '');
      setAmount(plan.amount.toString() || '');
      setCurrency(plan.currency || 'RUB');
      setArticleId(plan.articleId || '');
      setAccountId(plan.accountId || '');
      setRepeat(plan.repeat || 'monthly');
      setStatus(plan.status || 'active');
    } else {
      console.log('PlanForm - resetting form for new plan');
      setType('expense');
      setStartDate(toISODate(new Date()));
      setEndDate('');
      setAmount('');
      setCurrency('RUB');
      setArticleId('');
      setAccountId('');
      setRepeat('monthly');
      setStatus('active');
    }
  }, [plan]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const planData = {
      type: type as OperationType,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      amount: parseFloat(amount),
      currency,
      articleId: articleId || undefined,
      accountId: accountId || undefined,
      budgetId: budgetId || plan?.budgetId || undefined,
      repeat: repeat as Periodicity,
      status: status as PlanStatus,
    };

    try {
      if (plan) {
        await updatePlan({ id: plan.id, data: planData }).unwrap();
      } else {
        await createPlan(planData).unwrap();
      }
      onClose();
    } catch (error) {
      console.error('Failed to save plan:', error);
    }
  };

  const typeOptions = [
    { value: 'income', label: 'Доход' },
    { value: 'expense', label: 'Расход' },
  ];

  const currencyOptions = [
    { value: 'RUB', label: 'RUB' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
  ];

  const repeatOptions = [
    { value: 'none', label: 'Не повторяется' },
    { value: 'daily', label: 'Ежедневно' },
    { value: 'weekly', label: 'Еженедельно' },
    { value: 'monthly', label: 'Ежемесячно' },
    { value: 'quarterly', label: 'Ежеквартально' },
    { value: 'semiannual', label: 'Раз в полгода' },
    { value: 'annual', label: 'Ежегодно' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Активен' },
    { value: 'paused', label: 'Приостановлен' },
    { value: 'archived', label: 'Архивирован' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Тип"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={typeOptions}
          required
        />

        <Select
          label="Статус"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={statusOptions}
          required
        />

        <Input
          label="Дата начала"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />

        <Input
          label="Дата окончания (необязательно)"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
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

        <Select
          label="Повторение"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          options={repeatOptions}
          required
        />
      </div>

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

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isCreating || isUpdating}>
          {plan ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </form>
  );
};
