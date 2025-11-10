import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  useGetCounterpartiesQuery,
  useGetArticlesQuery,
  useGetAccountsQuery,
  useGetDealsQuery,
  useGetDepartmentsQuery,
} from '../../store/api/catalogsApi';
import {
  useUpdateImportedOperationMutation,
} from '../../store/api/importsApi';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import { useNotification } from '../../shared/hooks/useNotification';
import type { ImportedOperation } from '@shared/types/imports';

interface ImportMappingRowProps {
  operation: ImportedOperation;
  field: 'counterparty' | 'article' | 'account' | 'deal' | 'department' | 'currency' | 'repeat';
  sessionId: string;
  onOpenCreateModal: (field: 'counterparty' | 'article', operation: ImportedOperation) => void;
}

export const ImportMappingRow = ({
  operation,
  field,
  sessionId,
  onOpenCreateModal,
}: ImportMappingRowProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: articles = [] } = useGetArticlesQuery({ isActive: true });
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
      default:
        return '-';
    }
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
    switch (field) {
      case 'counterparty':
        return [
          { value: '', label: 'Не выбрано' },
          ...counterparties.map((c) => ({ value: c.id, label: c.name })),
        ];
      case 'article':
        return [
          { value: '', label: 'Не выбрано' },
          ...articles.map((a) => ({ value: a.id, label: a.name })),
        ];
      case 'account':
        return [
          { value: '', label: 'Не выбрано' },
          ...accounts
            .filter((a) => a.isActive)
            .map((a) => ({ value: a.id, label: a.name })),
        ];
      case 'deal':
        return [
          { value: '', label: 'Не выбрано' },
          ...deals.map((d) => ({ value: d.id, label: d.name })),
        ];
      case 'department':
        return [
          { value: '', label: 'Не выбрано' },
          ...departments.map((d) => ({ value: d.id, label: d.name })),
        ];
      case 'currency':
        return [
          { value: 'RUB', label: 'RUB' },
          { value: 'USD', label: 'USD' },
          { value: 'EUR', label: 'EUR' },
        ];
      case 'repeat':
        return [
          { value: 'none', label: 'Нет' },
          { value: 'daily', label: 'Ежедневно' },
          { value: 'weekly', label: 'Еженедельно' },
          { value: 'monthly', label: 'Ежемесячно' },
          { value: 'quarterly', label: 'Ежеквартально' },
          { value: 'semiannual', label: 'Раз в полгода' },
          { value: 'annual', label: 'Ежегодно' },
        ];
      default:
        return [];
    }
  };

  const handleChange = async (value: string) => {
    try {
      const updateData: any = {};
      
      if (field === 'counterparty') {
        updateData.matchedCounterpartyId = value || null;
      } else if (field === 'article') {
        updateData.matchedArticleId = value || null;
        if (value) {
          const selectedArticle = articles.find((a) => a.id === value);
          if (selectedArticle && selectedArticle.type) {
            updateData.direction = selectedArticle.type as 'income' | 'expense' | 'transfer';
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

  const handleCreateClick = () => {
    if (field === 'counterparty' || field === 'article') {
      onOpenCreateModal(field, operation);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    const showCreateButton = ['counterparty', 'article'].includes(field);

    return (
      <div className="flex items-center gap-2 min-w-0">
        <Select
          value={getCurrentValue()}
          onChange={(e) => handleChange(e.target.value)}
          options={getOptions()}
          className="w-full max-w-[200px]"
        />
        {showCreateButton && (
          <Button
            onClick={handleCreateClick}
            className="btn-secondary p-1"
            title="Создать новый"
          >
            <Plus size={16} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1 rounded truncate"
      onClick={() => setIsEditing(true)}
      title="Нажмите для редактирования"
    >
      {getDisplayValue()}
    </div>
  );
};