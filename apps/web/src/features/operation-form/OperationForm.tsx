import { useState, FormEvent } from 'react';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import {
  useCreateOperationMutation,
  useUpdateOperationMutation,
} from '../../store/api/operationsApi';
import {
  useGetArticlesQuery,
  useGetAccountsQuery,
  useGetCounterpartiesQuery,
  useGetDealsQuery,
  useGetDepartmentsQuery,
} from '../../store/api/catalogsApi';
import { toISODate } from '../../shared/lib/date';
import type { Operation, CreateOperationDTO } from '@fin-u-ch/shared';
import { OperationType, Periodicity } from '@fin-u-ch/shared';
import { useNotification } from '../../shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '../../constants/notificationMessages';
import {
  formatAmountInput,
  parseAmountInputToNumber,
} from '../../shared/lib/numberInput';

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
  // Определяем, является ли операция дочерней (с родителем и не шаблон)
  const isChildOperation =
    operation && operation.recurrenceParentId && !operation.isTemplate;

  // Определяем, является ли операция шаблоном
  const isTemplate = operation && operation.isTemplate === true;

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

  const { data: articles = [] } = useGetArticlesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();

  const [createOperation, { isLoading: isCreating }] =
    useCreateOperationMutation();
  const [updateOperation, { isLoading: isUpdating }] =
    useUpdateOperationMutation();

  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const amountNumber = parseAmountInputToNumber(amount);
    const operationData: CreateOperationDTO = {
      type: type as OperationType,
      operationDate: new Date(operationDate).toISOString(),
      amount: amountNumber,
      currency,
      articleId: articleId || undefined,
      accountId:
        type !== OperationType.TRANSFER ? accountId || undefined : undefined,
      sourceAccountId:
        type === OperationType.TRANSFER
          ? sourceAccountId || undefined
          : undefined,
      targetAccountId:
        type === OperationType.TRANSFER
          ? targetAccountId || undefined
          : undefined,
      counterpartyId: counterpartyId || undefined,
      dealId: dealId || undefined,
      departmentId: departmentId || undefined,
      description: description || undefined,
      repeat: repeat as Periodicity,
      recurrenceEndDate: recurrenceEndDate
        ? new Date(recurrenceEndDate).toISOString()
        : undefined,
    };

    try {
      // Если это копирование или нет operation.id, создаем новую операцию
      if (operation?.id && !isCopy) {
        // Если это шаблон, обновляем только шаблон
        if (isTemplate) {
          await updateOperation({
            id: operation.id,
            data: operationData,
          }).unwrap();
          showSuccess(NOTIFICATION_MESSAGES.OPERATION.UPDATE_SUCCESS);
        }
        // Если это дочерняя операция и выбран "все последующие"
        else if (
          isChildOperation &&
          updateScope === 'all' &&
          operation.recurrenceParentId
        ) {
          // Обновляем шаблон (родительскую операцию с isTemplate: true)
          const templateOperationData: Partial<CreateOperationDTO> = {
            articleId: articleId || undefined,
            accountId:
              type !== OperationType.TRANSFER
                ? accountId || undefined
                : undefined,
            sourceAccountId:
              type === OperationType.TRANSFER
                ? sourceAccountId || undefined
                : undefined,
            targetAccountId:
              type === OperationType.TRANSFER
                ? targetAccountId || undefined
                : undefined,
            counterpartyId: counterpartyId || undefined,
            dealId: dealId || undefined,
            departmentId: departmentId || undefined,
            description: description || undefined,
            currency,
            // Не передаем: operationDate, amount, repeat, recurrenceEndDate
            // Эти поля шаблона не меняем, чтобы не сломать логику генерации
          };

          // Обновляем шаблон
          await updateOperation({
            id: operation.recurrenceParentId,
            data: templateOperationData,
          }).unwrap();

          // Также обновляем текущую операцию
          await updateOperation({
            id: operation.id,
            data: operationData,
          }).unwrap();

          showSuccess('Операция и все последующие обновлены');
        } else {
          // Обновляем только текущую операцию
          await updateOperation({
            id: operation.id,
            data: operationData,
          }).unwrap();
          showSuccess(NOTIFICATION_MESSAGES.OPERATION.UPDATE_SUCCESS);
        }
      } else {
        // Создание новой операции
        // Если repeat !== 'none', сервис автоматически создаст шаблон и первую дочернюю операцию
        await createOperation(operationData).unwrap();
        showSuccess(NOTIFICATION_MESSAGES.OPERATION.CREATE_SUCCESS);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save operation:', error);
      showError(
        operation?.id && !isCopy
          ? NOTIFICATION_MESSAGES.OPERATION.UPDATE_ERROR
          : NOTIFICATION_MESSAGES.OPERATION.CREATE_ERROR
      );
    }
  };

  const typeOptions = [
    { value: 'income', label: 'Поступление' },
    { value: 'expense', label: 'Списание' },
    { value: 'transfer', label: 'Перевод' },
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Тип операции"
          value={type}
          onChange={(value) => setType(value as OperationType)}
          options={typeOptions}
          required
        />

        <Input
          label="Дата"
          type="date"
          value={operationDate}
          onChange={(e) => setOperationDate(e.target.value)}
          required
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
      </div>

      {type === OperationType.TRANSFER ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Счет списания"
            value={sourceAccountId}
            onChange={(value) => setSourceAccountId(value)}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите счет"
            required
          />
          <Select
            label="Счет зачисления"
            value={targetAccountId}
            onChange={(value) => setTargetAccountId(value)}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите счет"
            required
          />
        </div>
      ) : (
        <>
          <Select
            label="Статья"
            value={articleId}
            onChange={(value) => setArticleId(value)}
            options={articles
              .filter((a) => a.type === type)
              .map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите статью"
          />

          <Select
            label="Счет"
            value={accountId}
            onChange={(value) => setAccountId(value)}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Выберите счет"
          />
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Контрагент"
          value={counterpartyId}
          onChange={(value) => setCounterpartyId(value)}
          options={counterparties.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Не выбран"
        />

        <Select
          label="Сделка"
          value={dealId}
          onChange={(value) => setDealId(value)}
          options={deals.map((d) => ({ value: d.id, label: d.name }))}
          placeholder="Не выбрана"
        />

        <Select
          label="Подразделение"
          value={departmentId}
          onChange={(value) => setDepartmentId(value)}
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          placeholder="Не выбрано"
        />
      </div>

      <Input
        label="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Дополнительная информация"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Периодичность"
          value={repeat}
          onChange={(value) => setRepeat(value as Periodicity)}
          options={repeatOptions}
        />

        {repeat !== Periodicity.NONE && (
          <Input
            label="Дата окончания повторов"
            type="date"
            value={recurrenceEndDate}
            onChange={(e) => setRecurrenceEndDate(e.target.value)}
            placeholder="Не указана (бесконечно)"
          />
        )}
      </div>

      {/* Выбор области обновления для дочерних операций */}
      {isChildOperation && (
        <div className="border-t pt-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Обновить:
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="updateScope"
                value="current"
                checked={updateScope === 'current'}
                onChange={(e) =>
                  setUpdateScope(e.target.value as 'current' | 'all')
                }
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Только текущую операцию
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="updateScope"
                value="all"
                checked={updateScope === 'all'}
                onChange={(e) =>
                  setUpdateScope(e.target.value as 'current' | 'all')
                }
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Все последующие операции (изменит шаблон)
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isCreating || isUpdating}>
          {operation?.id && !isCopy ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </form>
  );
};
