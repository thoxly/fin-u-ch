import { FormEvent, useEffect, useState } from 'react';
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
import { useNotification } from '../../shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '../../constants/notificationMessages';
import {
  formatAmountInput,
  parseAmountInputToNumber,
} from '../../shared/lib/numberInput';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useOperationValidation } from './useOperationValidation';
import { useFilteredDeals } from './useFilteredDeals';
import { useOperationSubmit } from './useOperationSubmit';
import { useOperationFormState } from './useOperationFormState';
import { OffCanvas } from '../../shared/ui/OffCanvas';
import { AccountForm } from '../catalog-forms/AccountForm/AccountForm';
import { DealForm } from '../catalog-forms/DealForm/DealForm';
import { DepartmentForm } from '../catalog-forms/DepartmentForm/DepartmentForm';
import { ArticleForm } from '../catalog-forms/ArticleForm/ArticleForm';
import { CounterpartyForm } from '../catalog-forms/CounterpartyForm/CounterpartyForm';

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

  const { showSuccess, showError } = useNotification();
  const { canCreate, canUpdate } = usePermissions();

  // Определяем, можем ли редактировать форму
  const isEditing = operation?.id && !isCopy;
  const canEdit = isEditing ? canUpdate('operations') : canCreate('operations');
  // Состояние для модалок создания
  const [createModal, setCreateModal] = useState<{
    isOpen: boolean;
    field:
      | 'article'
      | 'account'
      | 'deal'
      | 'department'
      | 'counterparty'
      | 'currency'
      | null;
    accountType?: 'source' | 'target' | 'default';
  }>({
    isOpen: false,
    field: null,
  });

  // Сброс сделки при изменении контрагента
  useEffect(() => {
    if (counterpartyId && dealId) {
      const currentDeal = deals.find((d) => d.id === dealId);
      if (currentDeal && currentDeal.counterpartyId !== counterpartyId) {
        setDealId('');
      }
    }
  }, [counterpartyId, dealId, deals, setDealId]);

  // Обработчики для открытия модалок создания
  const handleOpenCreateModal = (
    field:
      | 'article'
      | 'account'
      | 'deal'
      | 'department'
      | 'counterparty'
      | 'currency',
    accountType?: 'source' | 'target' | 'default'
  ) => {
    setCreateModal({
      isOpen: true,
      field,
      accountType: accountType || 'default',
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
    if (createModal.field === 'article') {
      setArticleId(createdId);
      clearValidationError('articleId');
    } else if (createModal.field === 'account') {
      if (createModal.accountType === 'source') {
        setSourceAccountId(createdId);
        clearValidationError('sourceAccountId');
      } else if (createModal.accountType === 'target') {
        setTargetAccountId(createdId);
        clearValidationError('targetAccountId');
      } else {
        setAccountId(createdId);
        clearValidationError('accountId');
      }
    } else if (createModal.field === 'deal') {
      setDealId(createdId);
    } else if (createModal.field === 'department') {
      setDepartmentId(createdId);
    } else if (createModal.field === 'counterparty') {
      setCounterpartyId(createdId);
    }
    handleCloseModal();
  };

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
          onRepeatChange={setRepeat}
          onEndDateChange={setRecurrenceEndDate}
          onValidationErrorClear={clearValidationError}
          onOpenCreateModal={handleOpenCreateModal}
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

      {/* OffCanvas для создания статей, счетов, контрагентов, сделок, подразделений и валют */}
      <OffCanvas
        isOpen={createModal.isOpen && !!createModal.field}
        title={
          createModal.field === 'article'
            ? 'Создание статьи'
            : createModal.field === 'account'
              ? 'Создание счета'
              : createModal.field === 'deal'
                ? 'Создание сделки'
                : createModal.field === 'department'
                  ? 'Создание подразделения'
                  : createModal.field === 'counterparty'
                    ? 'Создание контрагента'
                    : createModal.field === 'currency'
                      ? 'Создание валюты'
                      : ''
        }
        onClose={handleCloseModal}
      >
        {createModal.field === 'article' ? (
          <ArticleForm
            article={null}
            onClose={handleCloseModal}
            onSuccess={handleCreateSuccess}
            initialType={type as 'income' | 'expense'}
          />
        ) : createModal.field === 'account' ? (
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
        ) : createModal.field === 'department' ? (
          <DepartmentForm
            department={null}
            onClose={handleCloseModal}
            onSuccess={handleCreateSuccess}
          />
        ) : createModal.field === 'counterparty' ? (
          <CounterpartyForm
            counterparty={null}
            onClose={handleCloseModal}
            onSuccess={handleCreateSuccess}
          />
        ) : createModal.field === 'currency' ? (
          <div className="p-4">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Валюты выбираются из предопределенного списка. Для добавления
              новой валюты обратитесь к администратору.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Текущая валюта: {currency || 'RUB'}
            </p>
          </div>
        ) : null}
      </OffCanvas>
    </form>
  );
};
