import { useState, FormEvent, useEffect } from 'react';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';
import {
  useCreatePlanMutation,
  useUpdatePlanMutation,
} from '../../store/api/plansApi';
import {
  useGetArticlesQuery,
  useGetAccountsQuery,
  useGetCounterpartiesQuery,
  useGetDealsQuery,
} from '../../store/api/catalogsApi';
import { useFilteredDeals } from '../operation-form/useFilteredDeals';
import { AccountForm } from '../catalog-forms/AccountForm/AccountForm';
import { DealForm } from '../catalog-forms/DealForm/DealForm';
import { CounterpartyForm } from '../catalog-forms/CounterpartyForm/CounterpartyForm';
import { ArticleForm } from '../catalog-forms/ArticleForm/ArticleForm';
import { toISODate } from '../../shared/lib/date';
import type { PlanItem } from '@shared/types/operations';
import { OperationType, Periodicity } from '@fin-u-ch/shared';
import { useNotification } from '../../shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '../../constants/notificationMessages';
import {
  formatAmountInput,
  parseAmountInputToNumber,
} from '../../shared/lib/numberInput';

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
  const [type, setType] = useState(plan?.type || 'expense');
  const [startDate, setStartDate] = useState(
    plan?.startDate.split('T')[0] || toISODate(new Date())
  );
  const [endDate, setEndDate] = useState(
    plan?.endDate ? plan.endDate.split('T')[0] : ''
  );
  const [amount, setAmount] = useState(
    plan?.amount != null ? formatAmountInput(String(plan.amount)) : ''
  );
  const [currency, setCurrency] = useState(plan?.currency || 'RUB');
  const [articleId, setArticleId] = useState(plan?.articleId || '');
  const [accountId, setAccountId] = useState(plan?.accountId || '');
  const [counterpartyId, setCounterpartyId] = useState(
    plan?.counterpartyId || ''
  );
  const [dealId, setDealId] = useState(plan?.dealId || '');
  const [repeat, setRepeat] = useState(plan?.repeat || 'monthly');

  const { data: articles = [] } = useGetArticlesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const filteredDeals = useFilteredDeals(counterpartyId, deals);

  const [createPlan, { isLoading: isCreating }] = useCreatePlanMutation();
  const [updatePlan, { isLoading: isUpdating }] = useUpdatePlanMutation();

  const { showSuccess, showError } = useNotification();

  // Состояние для модалок создания
  const [createModal, setCreateModal] = useState<{
    isOpen: boolean;
    field: 'account' | 'deal' | 'counterparty' | 'article' | null;
  }>({
    isOpen: false,
    field: null,
  });

  // Обработчики для открытия модалок создания
  const handleOpenCreateModal = (
    field: 'account' | 'deal' | 'counterparty' | 'article'
  ) => {
    setCreateModal({
      isOpen: true,
      field,
    });
  };

  const handleCloseModal = () => {
    setCreateModal({
      isOpen: false,
      field: null,
    });
  };

  // Обработчик успешного создания элемента
  const handleCreateSuccess = (createdId: string) => {
    if (createModal.field === 'account') {
      setAccountId(createdId);
    } else if (createModal.field === 'deal') {
      setDealId(createdId);
    } else if (createModal.field === 'counterparty') {
      setCounterpartyId(createdId);
    } else if (createModal.field === 'article') {
      setArticleId(createdId);
    }
    handleCloseModal();
  };

  // Отслеживаем изменения в пропе plan
  useEffect(() => {
    if (plan) {
      setType(plan.type || 'expense');
      setStartDate(plan.startDate.split('T')[0] || toISODate(new Date()));
      setEndDate(plan.endDate ? plan.endDate.split('T')[0] : '');
      setAmount(plan.amount.toString() || '');
      setCurrency(plan.currency || 'RUB');
      setArticleId(plan.articleId || '');
      setAccountId(plan.accountId || '');
      setCounterpartyId(plan.counterpartyId || '');
      setDealId(plan.dealId || '');
      setRepeat(plan.repeat || 'monthly');
    } else {
      setType('expense');
      setStartDate(toISODate(new Date()));
      setEndDate('');
      setAmount('');
      setCurrency('RUB');
      setArticleId('');
      setAccountId('');
      setCounterpartyId('');
      setDealId('');
      setRepeat('monthly');
    }
  }, [plan]);

  // Сброс сделки при изменении контрагента
  useEffect(() => {
    if (counterpartyId && dealId) {
      const currentDeal = deals.find((d) => d.id === dealId);
      if (currentDeal && currentDeal.counterpartyId !== counterpartyId) {
        setDealId('');
      }
    }
  }, [counterpartyId, dealId, deals]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const planData = {
      type: type as OperationType,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      amount: parseAmountInputToNumber(amount),
      currency,
      articleId: articleId || undefined,
      accountId: accountId || undefined,
      counterpartyId: counterpartyId || undefined,
      dealId: dealId || undefined,
      budgetId: budgetId || plan?.budgetId || undefined,
      repeat: repeat as Periodicity,
      status: 'active' as const,
    };

    try {
      if (plan) {
        await updatePlan({ id: plan.id, data: planData }).unwrap();
        showSuccess(NOTIFICATION_MESSAGES.PLAN.UPDATE_SUCCESS);
      } else {
        await createPlan(planData).unwrap();
        showSuccess(NOTIFICATION_MESSAGES.PLAN.CREATE_SUCCESS);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save plan:', error);
      showError(
        plan
          ? NOTIFICATION_MESSAGES.PLAN.UPDATE_ERROR
          : NOTIFICATION_MESSAGES.PLAN.CREATE_ERROR
      );
    }
  };

  const typeOptions = [
    { value: 'income', label: 'Поступления' },
    { value: 'expense', label: 'Списания' },
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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col h-full min-h-0 px-6 py-4"
    >
      <div className="flex-1 min-h-0 overflow-y-auto pb-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Тип"
            value={type}
            onChange={(value) => setType(value)}
            options={typeOptions}
            required
          />

          <div></div>

          <Input
            label="Дата начала"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          <Input
            label="Дата окончания"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <Input
            label="Сумма"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(formatAmountInput(e.target.value))}
            placeholder="0"
            required
          />

          <Select
            label="Валюта"
            value={currency}
            onChange={(value) => setCurrency(value)}
            options={currencyOptions}
            required
          />

          <Select
            label="Повторение"
            value={repeat}
            onChange={(value) => setRepeat(value)}
            options={repeatOptions}
            required
          />
        </div>

        <Select
          label="Статья"
          value={articleId}
          onChange={(value) => setArticleId(value)}
          options={articles
            .filter((a) => a.type === type)
            .map((a) => ({ value: a.id, label: a.name }))}
          placeholder="Выберите статью"
          onCreateNew={() => handleOpenCreateModal('article')}
        />

        <Select
          label="Счет"
          value={accountId}
          onChange={(value) => setAccountId(value)}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          placeholder="Выберите счет"
          onCreateNew={() => handleOpenCreateModal('account')}
        />

        <Select
          label="Контрагент"
          value={counterpartyId}
          onChange={(value) => setCounterpartyId(value)}
          options={counterparties.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
          placeholder="Не выбран"
          onCreateNew={() => handleOpenCreateModal('counterparty')}
        />

        <Select
          label="Сделка"
          value={dealId}
          onChange={(value) => setDealId(value)}
          options={filteredDeals.map((d) => ({
            value: d.id,
            label: d.name,
          }))}
          placeholder={
            counterpartyId
              ? 'Не выбрана'
              : filteredDeals.length === 0
                ? 'Нет доступных сделок'
                : 'Выберите сделку'
          }
          disabled={filteredDeals.length === 0}
          onCreateNew={() => handleOpenCreateModal('deal')}
        />
      </div>

      {/* Sticky Footer with buttons */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            type="submit"
            disabled={isCreating || isUpdating}
            className="flex-1 sm:flex-none"
          >
            {plan ? 'Сохранить' : 'Создать'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 sm:flex-none"
          >
            Отмена
          </Button>
        </div>
      </div>

      {/* Modal для создания элементов */}
      <Modal
        isOpen={createModal.isOpen && !!createModal.field}
        title={
          createModal.field === 'account'
            ? 'Создание счета'
            : createModal.field === 'deal'
              ? 'Создание сделки'
              : createModal.field === 'counterparty'
                ? 'Создание контрагента'
                : createModal.field === 'article'
                  ? 'Создание статьи'
                  : ''
        }
        onClose={handleCloseModal}
        size="md"
      >
        <div className="p-6">
          {createModal.field === 'account' ? (
            <AccountForm
              account={null}
              onClose={handleCloseModal}
              onSuccess={handleCreateSuccess}
            />
          ) : createModal.field === 'deal' ? (
            <DealForm
              deal={null}
              onClose={handleCloseModal}
              onSuccess={handleCreateSuccess}
            />
          ) : createModal.field === 'counterparty' ? (
            <CounterpartyForm
              counterparty={null}
              onClose={handleCloseModal}
              onSuccess={handleCreateSuccess}
            />
          ) : createModal.field === 'article' ? (
            <ArticleForm
              article={null}
              onClose={handleCloseModal}
              onSuccess={handleCreateSuccess}
              initialType={type as 'income' | 'expense' | 'transfer'}
            />
          ) : null}
        </div>
      </Modal>
    </form>
  );
};
