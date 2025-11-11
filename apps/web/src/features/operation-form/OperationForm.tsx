import { useState, FormEvent, useEffect } from 'react';
import { OperationFormFields } from './OperationFormFields';
import { OperationFormActions } from './OperationFormActions';
import {
  useGetArticlesQuery,
  useGetAccountsQuery,
  useGetCounterpartiesQuery,
  useGetDealsQuery,
  useGetDepartmentsQuery,
} from '../../store/api/catalogsApi';
import { toISODate } from '../../shared/lib/date';
import type { Operation } from '@fin-u-ch/shared';
import { OperationType, Periodicity } from '@fin-u-ch/shared';
import { formatAmountInput } from '../../shared/lib/numberInput';
import { useOperationValidation } from './useOperationValidation';
import { useFilteredDeals } from './useFilteredDeals';
import { useOperationSubmit } from './useOperationSubmit';

interface OperationFormProps {
  operation: Operation | null;
  isCopy?: boolean;
  onClose: () => void;
}

export const OperationForm = ({
  operation,
  isCopy = false,
  onClose,
}: OperationFormProps) => {
  // Выбор: только текущую или все последующие (только для дочерних операций)
  const [updateScope, setUpdateScope] = useState<'current' | 'all'>('current');

  const [type, setType] = useState<OperationType>(
    operation?.type || OperationType.EXPENSE
  );

  // Обрабатываем дату: может быть Date или строка (приходит с API как строка)
  const getInitialDate = (): string => {
    if (!operation?.operationDate) return toISODate(new Date());
    const date = operation.operationDate;
    // RTK Query возвращает даты как строки, но тип определен как Date
    // Проверяем оба варианта
    if (date instanceof Date) {
      return toISODate(date);
    }
    // Если это строка (что обычно происходит при десериализации JSON)
    const dateStr = date as unknown as string;
    if (typeof dateStr === 'string') {
      return dateStr.split('T')[0];
    }
    return toISODate(new Date());
  };

  const getInitialEndDate = (): string => {
    if (!operation?.recurrenceEndDate) return '';
    const date = operation.recurrenceEndDate;
    if (date instanceof Date) {
      return toISODate(date);
    }
    const dateStr = date as unknown as string;
    if (typeof dateStr === 'string') {
      return dateStr.split('T')[0];
    }
    return '';
  };

  const [operationDate, setOperationDate] = useState(getInitialDate());
  const [amount, setAmount] = useState(
    operation?.amount != null ? formatAmountInput(String(operation.amount)) : ''
  );
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
  const [departmentId, setDepartmentId] = useState(
    operation?.departmentId || ''
  );
  const [description, setDescription] = useState(operation?.description || '');
  const [repeat, setRepeat] = useState<Periodicity>(
    operation?.repeat || Periodicity.NONE
  );
  const [recurrenceEndDate, setRecurrenceEndDate] =
    useState(getInitialEndDate());
  const {
    validationErrors,
    validateOperation,
    clearValidationError,
    clearAllValidationErrors,
  } = useOperationValidation();

  const { submitOperation, isCreating, isUpdating, isChildOperation } =
    useOperationSubmit({
      operation,
      isCopy,
      onClose,
      validateOperation,
    });

  const { data: articles = [] } = useGetArticlesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();

  // Фильтрация сделок по выбранному контрагенту
  const filteredDeals = useFilteredDeals(counterpartyId, deals);

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

    // Очищаем предыдущие ошибки
    clearAllValidationErrors();

    // Передаем все значения формы в хук для обработки
    await submitOperation({
      type,
      operationDate,
      amount,
      currency,
      articleId,
      accountId,
      sourceAccountId,
      targetAccountId,
      counterpartyId,
      dealId,
      departmentId,
      description,
      repeat,
      recurrenceEndDate,
      updateScope,
    });
  };

  const handleTypeChange = (value: string) => {
    setType(value as OperationType);
    clearAllValidationErrors();
  };

  const handleDateChange = (value: string) => {
    setOperationDate(value);
    clearValidationError('operationDate');
  };

  const handleAmountChange = (value: string) => {
    setAmount(formatAmountInput(value));
    clearValidationError('amount');
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    clearValidationError('currency');
  };

  const handleArticleChange = (value: string) => {
    setArticleId(value);
    clearValidationError('articleId');
  };

  const handleAccountChange = (value: string) => {
    setAccountId(value);
    clearValidationError('accountId');
  };

  const handleSourceAccountChange = (value: string) => {
    setSourceAccountId(value);
    clearValidationError('sourceAccountId');
  };

  const handleTargetAccountChange = (value: string) => {
    setTargetAccountId(value);
    clearValidationError('targetAccountId');
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col h-full min-h-0 px-6 py-4"
    >
      <div className="flex-1 min-h-0 overflow-y-auto pb-4">
        <OperationFormFields
          type={type}
          operationDate={operationDate}
          amount={amount}
          currency={currency}
          articleId={articleId}
          accountId={accountId}
          sourceAccountId={sourceAccountId}
          targetAccountId={targetAccountId}
          counterpartyId={counterpartyId}
          dealId={dealId}
          departmentId={departmentId}
          description={description}
          repeat={repeat}
          recurrenceEndDate={recurrenceEndDate}
          validationErrors={validationErrors}
          articles={articles}
          accounts={accounts}
          counterparties={counterparties}
          deals={deals}
          filteredDeals={filteredDeals}
          departments={departments}
          onTypeChange={handleTypeChange}
          onDateChange={handleDateChange}
          onAmountChange={handleAmountChange}
          onCurrencyChange={handleCurrencyChange}
          onArticleChange={handleArticleChange}
          onAccountChange={handleAccountChange}
          onSourceAccountChange={handleSourceAccountChange}
          onTargetAccountChange={handleTargetAccountChange}
          onCounterpartyChange={setCounterpartyId}
          onDealChange={setDealId}
          onDepartmentChange={setDepartmentId}
          onDescriptionChange={setDescription}
          onRepeatChange={(value) => setRepeat(value as Periodicity)}
          onEndDateChange={setRecurrenceEndDate}
          onValidationErrorClear={clearValidationError}
        />
      </div>

      <OperationFormActions
        operation={operation}
        isCopy={isCopy}
        isChildOperation={isChildOperation}
        updateScope={updateScope}
        isCreating={isCreating}
        isUpdating={isUpdating}
        onUpdateScopeChange={setUpdateScope}
        onClose={onClose}
      />
    </form>
  );
};
