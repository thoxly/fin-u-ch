import { FormEvent, useEffect } from 'react';
import { OperationFormFields } from './OperationFormFields';
import { OperationFormActions } from './OperationFormActions';
import {
  useGetArticlesQuery,
  useGetAccountsQuery,
  useGetCounterpartiesQuery,
  useGetDealsQuery,
  useGetDepartmentsQuery,
} from '../../store/api/catalogsApi';
import type { Operation } from '@fin-u-ch/shared';
import { OperationType, Periodicity } from '@fin-u-ch/shared';
import { formatAmountInput } from '../../shared/lib/numberInput';
import { useOperationValidation } from './useOperationValidation';
import { useFilteredDeals } from './useFilteredDeals';
import { useOperationSubmit } from './useOperationSubmit';
import { useOperationFormState } from './useOperationFormState';

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
  // Управление состоянием формы
  const { formState, formSetters } = useOperationFormState(operation);
  const {
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
  } = formState;

  const {
    setType,
    setOperationDate,
    setAmount,
    setCurrency,
    setArticleId,
    setAccountId,
    setSourceAccountId,
    setTargetAccountId,
    setCounterpartyId,
    setDealId,
    setDepartmentId,
    setDescription,
    setRepeat,
    setRecurrenceEndDate,
    setUpdateScope,
  } = formSetters;

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

  const filteredDeals = useFilteredDeals(counterpartyId, deals);

  // Сброс сделки при изменении контрагента
  useEffect(() => {
    if (counterpartyId && dealId) {
      const currentDeal = deals.find((d) => d.id === dealId);
      if (currentDeal && currentDeal.counterpartyId !== counterpartyId) {
        setDealId('');
      }
    }
  }, [counterpartyId, dealId, deals, setDealId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearAllValidationErrors();
    await submitOperation(formState);
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
