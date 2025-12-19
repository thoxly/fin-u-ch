import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { CurrencySelect } from '../../shared/ui/CurrencySelect';
import { OperationType } from '@fin-u-ch/shared';

interface OperationBasicInfoProps {
  type: OperationType;
  operationDate: string;
  amount: string;
  currency: string;
  validationErrors: Record<string, string>;
  onTypeChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onValidationErrorClear: (field: string) => void;
  onOpenCreateModal?: (
    field: 'account' | 'deal' | 'department' | 'currency',
    accountType?: 'source' | 'target' | 'default'
  ) => void;
}

const typeOptions = [
  { value: 'income', label: 'Поступление' },
  { value: 'expense', label: 'Списание' },
  { value: 'transfer', label: 'Перевод' },
];

export const OperationBasicInfo = ({
  type,
  operationDate,
  amount,
  currency,
  validationErrors,
  onTypeChange,
  onDateChange,
  onAmountChange,
  onCurrencyChange,
  onValidationErrorClear,
  onOpenCreateModal,
}: OperationBasicInfoProps) => {
  return (
    <div className="space-y-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Основное
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Тип операции"
          value={type}
          onChange={(value) => {
            onTypeChange(value);
            onValidationErrorClear('type');
          }}
          options={typeOptions}
          required
        />
        <Input
          label="Дата"
          type="date"
          value={operationDate}
          onChange={(e) => {
            onDateChange(e.target.value);
            onValidationErrorClear('operationDate');
          }}
          error={validationErrors.operationDate}
          required
        />
        <Input
          label="Сумма"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            onAmountChange(e.target.value);
            onValidationErrorClear('amount');
          }}
          placeholder="0"
          error={validationErrors.amount}
          required
        />
        <CurrencySelect
          label="Валюта"
          value={currency}
          onChange={(value) => {
            onCurrencyChange(value);
            onValidationErrorClear('currency');
          }}
          error={validationErrors.currency}
          required
        />
      </div>
    </div>
  );
};
