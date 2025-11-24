import { useState, memo } from 'react';
import {
  useGetCounterpartiesQuery,
  useGetArticlesQuery,
  useGetAccountsQuery,
  useGetDealsQuery,
  useGetDepartmentsQuery,
} from '../../store/api/catalogsApi';
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
  onFieldUpdate?: (
    operation: ImportedOperation,
    field:
      | 'counterparty'
      | 'article'
      | 'account'
      | 'deal'
      | 'department'
      | 'currency'
      | 'direction',
    value: string,
    updateData: Record<string, unknown>,
    event: React.MouseEvent
  ) => Promise<boolean>; // Возвращает true если показан popover, false если нет
  onRegisterChange?: (
    operationId: string,
    previousState: Record<string, unknown>,
    description: string,
    anchorPosition?: { top: number; left: number }
  ) => void;
  disabled?: boolean;
}

// Проверяем, является ли поле обязательным
const isRequiredField = (field: string): boolean => {
  return ['direction', 'article', 'account', 'currency'].includes(field);
};

// Проверяем, заполнено ли обязательное поле
const isFieldFilled = (
  operation: ImportedOperation,
  field: string
): boolean => {
  switch (field) {
    case 'direction':
      return !!operation.direction;
    case 'article':
      return !!operation.matchedArticleId;
    case 'account':
      return !!operation.matchedAccountId;
    case 'currency':
      return !!operation.currency;
    default:
      return true;
  }
};

const ImportMappingRowComponent = ({
  operation,
  field,
  sessionId: _sessionId,
  onOpenCreateModal,
  disabled = false,
}: ImportMappingRowProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: articles = [] } = useGetArticlesQuery({ isActive: true });
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();

  const [updateOperation] = useUpdateImportedOperationMutation();
  const { showError } = useNotification();

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

      setIsEditing(false);

      // Регистрируем изменение для возможности отмены (если есть callback)
      if (onRegisterChange) {
        // Сохраняем предыдущее состояние
        const previousState: Record<string, unknown> = {};
        if (field === 'counterparty') {
          previousState.matchedCounterpartyId = operation.matchedCounterpartyId;
        } else if (field === 'article') {
          previousState.matchedArticleId = operation.matchedArticleId;
          previousState.direction = operation.direction;
        } else if (field === 'account') {
          previousState.matchedAccountId = operation.matchedAccountId;
        } else if (field === 'deal') {
          previousState.matchedDealId = operation.matchedDealId;
        } else if (field === 'department') {
          previousState.matchedDepartmentId = operation.matchedDepartmentId;
        } else if (field === 'currency') {
          previousState.currency = operation.currency;
        } else if (field === 'repeat') {
          previousState.repeat = operation.repeat;
        } else if (field === 'direction') {
          previousState.direction = operation.direction;
        }

        // Формируем описание изменения
        const fieldNames: Record<string, string> = {
          counterparty: 'Контрагент',
          article: 'Статья',
          account: 'Счет',
          deal: 'Сделка',
          department: 'Подразделение',
          currency: 'Валюта',
          repeat: 'Повтор',
          direction: 'Тип операции',
        };
        const description = `Изменено: ${fieldNames[field] || field}`;

        onRegisterChange(
          operation.id,
          previousState,
          description,
          lastClickPosition || undefined
        );
      }

      // СНАЧАЛА обновляем текущую операцию
      await updateOperation({
        id: operation.id,
        data: updateData,
      }).unwrap();

      // ЗАТЕМ проверяем похожие операции и показываем popover (только для значимых полей)
      if (
        field !== 'repeat' &&
        onFieldUpdate &&
        lastClickPosition &&
        (field === 'counterparty' ||
          field === 'article' ||
          field === 'account' ||
          field === 'deal' ||
          field === 'department' ||
          field === 'currency' ||
          field === 'direction')
      ) {
        // Создаем синтетическое событие с сохраненной позицией
        const syntheticEvent = {
          currentTarget: {
            getBoundingClientRect: () => ({
              top: lastClickPosition.top - 40, // Примерная высота элемента
              bottom: lastClickPosition.top,
              left: lastClickPosition.left,
              right: lastClickPosition.right,
            }),
          },
        } as React.MouseEvent;

        // Проверяем наличие похожих операций
        // Результат игнорируем, так как операция уже обновлена
        await onFieldUpdate(
          operation,
          field,
          value,
          updateData,
          syntheticEvent
        );
      }
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

  // Для account показываем номер счета серым текстом (только если счет выбран)
  if (field === 'account') {
    // Показываем номер только выбранного счета из справочника
    const selectedAccountNumber = operation.matchedAccount?.number;

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
        {selectedAccountNumber && (
          <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
            {selectedAccountNumber}
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

// Мемоизируем компонент для избежания лишних ререндеров
// Компонент обновляется только если изменились его пропсы
export const ImportMappingRow = memo(
  ImportMappingRowComponent,
  (prevProps, nextProps) => {
    // Возвращаем true если props НЕ изменились (пропускаем ререндер)
    return (
      prevProps.operation.id === nextProps.operation.id &&
      prevProps.field === nextProps.field &&
      prevProps.disabled === nextProps.disabled &&
      // Сравниваем только те поля операции которые используются в компоненте
      JSON.stringify(
        getRelevantOperationFields(prevProps.operation, prevProps.field)
      ) ===
        JSON.stringify(
          getRelevantOperationFields(nextProps.operation, nextProps.field)
        )
    );
  }
);

// Вспомогательная функция для получения релевантных полей операции для данного field
function getRelevantOperationFields(
  operation: ImportedOperation,
  field: string
) {
  const base = {
    id: operation.id,
    processed: operation.processed,
  };

  switch (field) {
    case 'counterparty':
      return {
        ...base,
        matchedCounterpartyId: operation.matchedCounterpartyId,
        matchedCounterparty: operation.matchedCounterparty,
      };
    case 'article':
      return {
        ...base,
        matchedArticleId: operation.matchedArticleId,
        matchedArticle: operation.matchedArticle,
        direction: operation.direction,
      };
    case 'account':
      return {
        ...base,
        matchedAccountId: operation.matchedAccountId,
        matchedAccount: operation.matchedAccount,
      };
    case 'deal':
      return {
        ...base,
        matchedDealId: operation.matchedDealId,
        matchedDeal: operation.matchedDeal,
      };
    case 'department':
      return {
        ...base,
        matchedDepartmentId: operation.matchedDepartmentId,
        matchedDepartment: operation.matchedDepartment,
      };
    case 'currency':
      return { ...base, currency: operation.currency };
    case 'direction':
      return { ...base, direction: operation.direction };
    case 'repeat':
      return { ...base, repeat: operation.repeat };
    default:
      return base;
  }
}
