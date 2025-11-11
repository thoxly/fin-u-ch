import { ErrorBoundary } from '../../shared/ui/ErrorBoundary';
import { OperationBasicInfo } from './OperationBasicInfo';
import { OperationFinancialParams } from './OperationFinancialParams';
import { OperationRecurrenceSection } from './OperationRecurrenceSection';
import { OperationType, Periodicity } from '@fin-u-ch/shared';

interface Article {
  id: string;
  name: string;
  type: OperationType;
}

interface Account {
  id: string;
  name: string;
}

interface Counterparty {
  id: string;
  name: string;
}

interface Deal {
  id: string;
  name: string;
  counterpartyId: string;
}

interface Department {
  id: string;
  name: string;
}

interface OperationFormFieldsProps {
  type: OperationType;
  operationDate: string;
  amount: string;
  currency: string;
  articleId: string;
  accountId: string;
  sourceAccountId: string;
  targetAccountId: string;
  counterpartyId: string;
  dealId: string;
  departmentId: string;
  description: string;
  repeat: Periodicity;
  recurrenceEndDate: string;
  validationErrors: Record<string, string>;
  articles: Article[];
  accounts: Account[];
  counterparties: Counterparty[];
  deals: Deal[];
  filteredDeals: Deal[];
  departments: Department[];
  onTypeChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onArticleChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onSourceAccountChange: (value: string) => void;
  onTargetAccountChange: (value: string) => void;
  onCounterpartyChange: (value: string) => void;
  onDealChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onRepeatChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onValidationErrorClear: (field: string) => void;
}

export const OperationFormFields = ({
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
  validationErrors,
  articles,
  accounts,
  counterparties,
  deals,
  filteredDeals,
  departments,
  onTypeChange,
  onDateChange,
  onAmountChange,
  onCurrencyChange,
  onArticleChange,
  onAccountChange,
  onSourceAccountChange,
  onTargetAccountChange,
  onCounterpartyChange,
  onDealChange,
  onDepartmentChange,
  onDescriptionChange,
  onRepeatChange,
  onEndDateChange,
  onValidationErrorClear,
}: OperationFormFieldsProps) => {
  return (
    <>
      <ErrorBoundary>
        <OperationBasicInfo
          type={type}
          operationDate={operationDate}
          amount={amount}
          currency={currency}
          validationErrors={validationErrors}
          onTypeChange={onTypeChange}
          onDateChange={onDateChange}
          onAmountChange={onAmountChange}
          onCurrencyChange={onCurrencyChange}
          onValidationErrorClear={onValidationErrorClear}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <OperationFinancialParams
          type={type}
          articleId={articleId}
          accountId={accountId}
          sourceAccountId={sourceAccountId}
          targetAccountId={targetAccountId}
          counterpartyId={counterpartyId}
          dealId={dealId}
          departmentId={departmentId}
          validationErrors={validationErrors}
          articles={articles}
          accounts={accounts}
          counterparties={counterparties}
          deals={deals}
          filteredDeals={filteredDeals}
          departments={departments}
          onArticleChange={onArticleChange}
          onAccountChange={onAccountChange}
          onSourceAccountChange={onSourceAccountChange}
          onTargetAccountChange={onTargetAccountChange}
          onCounterpartyChange={onCounterpartyChange}
          onDealChange={onDealChange}
          onDepartmentChange={onDepartmentChange}
          onValidationErrorClear={onValidationErrorClear}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <OperationRecurrenceSection
          description={description}
          repeat={repeat}
          recurrenceEndDate={recurrenceEndDate}
          onDescriptionChange={onDescriptionChange}
          onRepeatChange={onRepeatChange}
          onEndDateChange={onEndDateChange}
        />
      </ErrorBoundary>
    </>
  );
};
