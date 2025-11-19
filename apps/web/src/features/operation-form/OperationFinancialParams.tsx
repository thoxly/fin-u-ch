import { Select } from '../../shared/ui/Select';
import type {
  Article,
  Account,
  Counterparty,
  Deal,
  Department,
} from '@fin-u-ch/shared';

interface OperationFinancialParamsProps {
  type: 'income' | 'expense' | 'transfer';
  articleId: string;
  accountId: string;
  sourceAccountId: string;
  targetAccountId: string;
  counterpartyId: string;
  dealId: string;
  departmentId: string;
  validationErrors: Record<string, string>;
  articles: Article[];
  accounts: Account[];
  counterparties: Counterparty[];
  deals: Deal[];
  filteredDeals: Deal[];
  departments: Department[];
  onArticleChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onSourceAccountChange: (value: string) => void;
  onTargetAccountChange: (value: string) => void;
  onCounterpartyChange: (value: string) => void;
  onDealChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onValidationErrorClear: (field: string) => void;
  onOpenCreateModal?: (
    field: 'account' | 'deal' | 'department' | 'currency',
    accountType?: 'source' | 'target' | 'default'
  ) => void;
}

export const OperationFinancialParams = ({
  type,
  articleId,
  accountId,
  sourceAccountId,
  targetAccountId,
  counterpartyId,
  dealId,
  departmentId,
  validationErrors,
  articles,
  accounts,
  counterparties,
  deals,
  filteredDeals,
  departments,
  onArticleChange,
  onAccountChange,
  onSourceAccountChange,
  onTargetAccountChange,
  onCounterpartyChange,
  onDealChange,
  onDepartmentChange,
  onValidationErrorClear,
  onOpenCreateModal,
}: OperationFinancialParamsProps) => {
  return (
    <div className="space-y-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Финансовые параметры
      </h3>
      {type === 'transfer' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Счет списания"
            value={sourceAccountId}
            onChange={(value) => {
              onSourceAccountChange(value);
              onValidationErrorClear('sourceAccountId');
            }}
            onCreateNew={
              onOpenCreateModal
                ? () => onOpenCreateModal('account', 'source')
                : undefined
            }
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите счет"
            error={validationErrors.sourceAccountId}
            required
          />
          <Select
            label="Счет зачисления"
            value={targetAccountId}
            onChange={(value) => {
              onTargetAccountChange(value);
              onValidationErrorClear('targetAccountId');
            }}
            onCreateNew={
              onOpenCreateModal
                ? () => onOpenCreateModal('account', 'target')
                : undefined
            }
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите счет"
            error={validationErrors.targetAccountId}
            required
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Статья"
            value={articleId}
            onChange={(value) => {
              onArticleChange(value);
              onValidationErrorClear('articleId');
            }}
            options={articles
              .filter((a) => a.type === type)
              .map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите статью"
            error={validationErrors.articleId}
            required
          />
          <Select
            label="Счет"
            value={accountId}
            onChange={(value) => {
              onAccountChange(value);
              onValidationErrorClear('accountId');
            }}
            onCreateNew={
              onOpenCreateModal ? () => onOpenCreateModal('account') : undefined
            }
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите счет"
            error={validationErrors.accountId}
            required
          />
          <Select
            label="Контрагент"
            value={counterpartyId}
            onChange={(value) => onCounterpartyChange(value)}
            options={counterparties.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            placeholder="Не выбран"
          />
          <Select
            label="Сделка"
            value={dealId}
            onChange={(value) => onDealChange(value)}
            onCreateNew={
              onOpenCreateModal ? () => onOpenCreateModal('deal') : undefined
            }
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
            disabled={filteredDeals.length === 0 && !onOpenCreateModal}
          />
          <Select
            label="Подразделение"
            value={departmentId}
            onChange={(value) => onDepartmentChange(value)}
            onCreateNew={
              onOpenCreateModal
                ? () => onOpenCreateModal('department')
                : undefined
            }
            options={departments.map((d) => ({
              value: d.id,
              label: d.name,
            }))}
            placeholder="Не выбрано"
          />
        </div>
      )}
    </div>
  );
};
