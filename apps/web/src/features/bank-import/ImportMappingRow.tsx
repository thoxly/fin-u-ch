import { useState } from 'react';
import {
  useGetCounterpartiesQuery,
  useGetAccountsQuery,
  useGetDealsQuery,
  useGetDepartmentsQuery,
} from '../../store/api/catalogsApi';
import { useLeafArticles } from '../../shared/hooks/useArticleTree';
import { useUpdateImportedOperationMutation } from '../../store/api/importsApi';
import { Select } from '../../shared/ui/Select';
import { useNotification } from '../../shared/hooks/useNotification';
import type { ImportedOperation } from '@shared/types/imports';

interface ImportMappingRowProps {
  operation: ImportedOperation;
  field:
    | 'counterparty'
    | 'article'
    | 'account'
    | 'deal'
    | 'department'
    | 'currency'
    | 'repeat'
    | 'direction';
  sessionId: string;
  onOpenCreateModal: (
    field:
      | 'counterparty'
      | 'article'
      | 'account'
      | 'deal'
      | 'department'
      | 'currency',
    operation: ImportedOperation
  ) => void;
  disabled?: boolean;
}

export const ImportMappingRow = ({
  operation,
  field,
  sessionId: _sessionId,
  onOpenCreateModal,
  disabled = false,
}: ImportMappingRowProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  // Используем только листья (статьи без дочерних) для операций
  const { leafArticles: articles = [] } = useLeafArticles({ isActive: true });
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();

  const [updateOperation] = useUpdateImportedOperationMutation();
  const { showSuccess, showError } = useNotification();

  const getCurrentValue = () => {
    switch (field) {
      case 'counterparty':
        return operation.matchedCounterpartyId || '';
      case 'article':
        return operation.matchedArticleId || '';
      case 'account':
        return operation.matchedAccountId || '';
      case 'deal':
        return operation.matchedDealId || '';
      case 'department':
        return operation.matchedDepartmentId || '';
      case 'currency':
        return operation.currency || 'RUB';
      case 'repeat':
        return operation.repeat || 'none';
      case 'direction':
        return operation.direction || '';
      default:
        return '';
    }
  };

  const getDisplayValue = () => {
    switch (field) {
      case 'counterparty':
        return operation.matchedCounterparty?.name || '-';
      case 'article':
        return operation.matchedArticle?.name || '-';
      case 'account':
        return operation.matchedAccount?.name || '-';
      case 'deal':
        return operation.matchedDeal?.name || '-';
      case 'department':
        return operation.matchedDepartment?.name || '-';
      case 'currency':
        return operation.currency || 'RUB';
      case 'repeat':
        return getPeriodicityLabel(operation.repeat || 'none');
      case 'direction':
        return getDirectionLabel(operation.direction);
      default:
        return '-';
    }
  };

  const getDirectionLabel = (direction: string | null | undefined) => {
    const labels: Record<string, string> = {
      income: 'Поступление',
      expense: 'Расход',
      transfer: 'Перевод',
    };
    return direction ? labels[direction] || direction : 'Не определено';
  };

  const getPeriodicityLabel = (repeat: string) => {
    const labels: Record<string, string> = {
      none: 'Нет',
      daily: 'Ежедневно',
      weekly: 'Еженедельно',
      monthly: 'Ежемесячно',
      quarterly: 'Ежеквартально',
      semiannual: 'Раз в полгода',
      annual: 'Ежегодно',
    };
    return labels[repeat] || repeat;
  };

  const getOptions = () => {
    const baseOptions = [];
    switch (field) {
      case 'counterparty':
        baseOptions.push(
          { value: '__create__', label: '+ Добавить новый' },
          { value: '', label: 'Не выбрано' },
          ...counterparties.map((c) => ({ value: c.id, label: c.name }))
        );
        break;
      case 'article':
        baseOptions.push(
          { value: '__create__', label: '+ Добавить новый' },
          { value: '', label: 'Не выбрано' },
          ...articles.map((a) => ({ value: a.id, label: a.name }))
        );
        break;
      case 'account':
        baseOptions.push(
          { value: '__create__', label: '+ Добавить новый' },
          { value: '', label: 'Не выбрано' },
          ...accounts
            .filter((a) => a.isActive)
            .map((a) => ({ value: a.id, label: a.name }))
        );
        break;
      case 'deal':
        baseOptions.push(
          { value: '__create__', label: '+ Добавить новый' },
          { value: '', label: 'Не выбрано' },
          ...deals.map((d) => ({ value: d.id, label: d.name }))
        );
        break;
      case 'department':
        baseOptions.push(
          { value: '__create__', label: '+ Добавить новый' },
          { value: '', label: 'Не выбрано' },
          ...departments.map((d) => ({ value: d.id, label: d.name }))
        );
        break;
      case 'currency':
        baseOptions.push(
          { value: '__create__', label: '+ Добавить новый' },
          { value: 'RUB', label: 'RUB' },
          { value: 'USD', label: 'USD' },
          { value: 'EUR', label: 'EUR' }
        );
        break;
      case 'repeat':
        baseOptions.push(
          { value: 'none', label: 'Нет' },
          { value: 'daily', label: 'Ежедневно' },
          { value: 'weekly', label: 'Еженедельно' },
          { value: 'monthly', label: 'Ежемесячно' },
          { value: 'quarterly', label: 'Ежеквартально' },
          { value: 'semiannual', label: 'Раз в полгода' },
          { value: 'annual', label: 'Ежегодно' }
        );
        break;
      case 'direction':
        baseOptions.push(
          { value: '', label: 'Не определено' },
          { value: 'income', label: 'Поступление' },
          { value: 'expense', label: 'Расход' },
          { value: 'transfer', label: 'Перевод' }
        );
        break;
    }
    return baseOptions;
  };

  const handleChange = async (value: string) => {
    // Если выбрана опция создания, открываем offcanvas
    if (value === '__create__') {
      if (
        field === 'counterparty' ||
        field === 'article' ||
        field === 'account' ||
        field === 'deal' ||
        field === 'department' ||
        field === 'currency'
      ) {
        onOpenCreateModal(field, operation);
        setIsEditing(false);
      }
      return;
    }

    try {
      const updateData: {
        matchedCounterpartyId?: string | null;
        matchedArticleId?: string | null;
        matchedAccountId?: string | null;
        matchedDealId?: string | null;
        matchedDepartmentId?: string | null;
        currency?: string;
        repeat?: string;
        direction?: string | null;
      } = {};

      if (field === 'counterparty') {
        updateData.matchedCounterpartyId = value || null;
      } else if (field === 'article') {
        updateData.matchedArticleId = value || null;
        if (value) {
          const selectedArticle = articles.find((a) => a.id === value);
          if (selectedArticle && selectedArticle.type) {
            updateData.direction = selectedArticle.type as
              | 'income'
              | 'expense'
              | 'transfer';
          }
        }
      } else if (field === 'account') {
        updateData.matchedAccountId = value || null;
      } else if (field === 'deal') {
        updateData.matchedDealId = value || null;
      } else if (field === 'department') {
        updateData.matchedDepartmentId = value || null;
      } else if (field === 'currency') {
        updateData.currency = value;
      } else if (field === 'repeat') {
        updateData.repeat = value;
      } else if (field === 'direction') {
        updateData.direction = value || null;
      }

      await updateOperation({
        id: operation.id,
        data: updateData,
      }).unwrap();

      setIsEditing(false);
      showSuccess('Обновлено');
    } catch (error) {
      showError('Ошибка при обновлении');
    }
  };

  if (isEditing && !disabled) {
    return (
      <div className="relative w-full">
        <Select
          value={getCurrentValue()}
          onChange={handleChange}
          options={getOptions()}
          className="w-full"
        />
      </div>
    );
  }

  // Для direction показываем badge, для остальных полей - обычный текст
  if (field === 'direction') {
    const direction = operation.direction;
    const badgeColor =
      direction === 'income'
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        : direction === 'expense'
          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          : direction === 'transfer'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';

    return (
      <div
        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${badgeColor} ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'cursor-pointer hover:opacity-80'
        }`}
        onClick={() => !disabled && setIsEditing(true)}
        title={
          disabled ? 'Операция распределена' : 'Нажмите для редактирования'
        }
      >
        {getDisplayValue()}
      </div>
    );
  }

  // Для account показываем номер счета серым текстом
  if (field === 'account') {
    const accountNumber =
      operation.direction === 'expense'
        ? operation.payerAccount
        : operation.receiverAccount;

    return (
      <div
        className={`px-2 py-1 rounded ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onClick={() => !disabled && setIsEditing(true)}
        title={
          disabled ? 'Операция распределена' : 'Нажмите для редактирования'
        }
      >
        <div className="truncate">{getDisplayValue()}</div>
        {accountNumber && (
          <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
            {accountNumber}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`px-2 py-1 rounded truncate ${
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
      onClick={() => !disabled && setIsEditing(true)}
      title={disabled ? 'Операция распределена' : 'Нажмите для редактирования'}
    >
      {getDisplayValue()}
    </div>
  );
};
