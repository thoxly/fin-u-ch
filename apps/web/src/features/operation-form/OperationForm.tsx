import { useState, FormEvent, useMemo, useEffect } from 'react';
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
import { ChevronDown, ChevronUp } from 'lucide-react';
import { InfoHint } from '../../shared/ui/InfoHint';

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
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const { data: articles = [] } = useGetArticlesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: counterparties = [] } = useGetCounterpartiesQuery();
  const { data: deals = [] } = useGetDealsQuery();
  const { data: departments = [] } = useGetDepartmentsQuery();

  // Фильтрация сделок по выбранному контрагенту
  const filteredDeals = useMemo(() => {
    if (!counterpartyId) return deals;
    return deals.filter((deal) => deal.counterpartyId === counterpartyId);
  }, [deals, counterpartyId]);

  // Сброс сделки при изменении контрагента
  useEffect(() => {
    if (counterpartyId && dealId) {
      const currentDeal = deals.find((d) => d.id === dealId);
      if (currentDeal && currentDeal.counterpartyId !== counterpartyId) {
        setDealId('');
      }
    }
  }, [counterpartyId, dealId, deals]);

  const [createOperation, { isLoading: isCreating }] =
    useCreateOperationMutation();
  const [updateOperation, { isLoading: isUpdating }] =
    useUpdateOperationMutation();

  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Очищаем предыдущие ошибки
    setValidationErrors({});

    const errors: Record<string, string> = {};

    // Валидация обязательных полей
    if (!operationDate) {
      errors.operationDate = 'Поле "Дата" обязательно для заполнения';
    }

    if (!amount || amount.trim() === '') {
      errors.amount = 'Поле "Сумма" обязательно для заполнения';
    } else {
      const amountNumber = parseAmountInputToNumber(amount);
      if (isNaN(amountNumber) || amountNumber <= 0) {
        errors.amount = 'Сумма должна быть положительным числом';
      }
    }

    if (!currency) {
      errors.currency = 'Поле "Валюта" обязательно для заполнения';
    }

    // Валидация в зависимости от типа операции
    if (type === OperationType.TRANSFER) {
      if (!sourceAccountId) {
        errors.sourceAccountId =
          'Поле "Счет списания" обязательно для заполнения';
      }
      if (!targetAccountId) {
        errors.targetAccountId =
          'Поле "Счет зачисления" обязательно для заполнения';
      }
    } else {
      if (!articleId) {
        errors.articleId = 'Поле "Статья" обязательно для заполнения';
      }
      if (!accountId) {
        errors.accountId = 'Поле "Счет" обязательно для заполнения';
      }
    }

    // Если есть ошибки валидации, показываем их
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const errorMessages = Object.values(errors).join(', ');
      showError(`Не заполнены обязательные поля: ${errorMessages}`);
      return;
    }

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
    } catch (error: unknown) {
      console.error('Failed to save operation:', error);

      // Обработка ошибок валидации от API
      if (
        error &&
        typeof error === 'object' &&
        'data' in error &&
        error.data &&
        typeof error.data === 'object' &&
        'message' in error.data
      ) {
        const apiError = String(error.data.message);

        // Переводим известные ошибки на русский
        if (apiError.includes('accountId and articleId are required')) {
          const apiErrors: Record<string, string> = {};
          if (!articleId)
            apiErrors.articleId = 'Поле "Статья" обязательно для заполнения';
          if (!accountId)
            apiErrors.accountId = 'Поле "Счет" обязательно для заполнения';
          setValidationErrors(apiErrors);
          showError('Не заполнены обязательные поля: Статья, Счет');
          return;
        }

        if (
          apiError.includes('sourceAccountId and targetAccountId are required')
        ) {
          const apiErrors: Record<string, string> = {};
          if (!sourceAccountId)
            apiErrors.sourceAccountId =
              'Поле "Счет списания" обязательно для заполнения';
          if (!targetAccountId)
            apiErrors.targetAccountId =
              'Поле "Счет зачисления" обязательно для заполнения';
          setValidationErrors(apiErrors);
          showError(
            'Не заполнены обязательные поля: Счет списания, Счет зачисления'
          );
          return;
        }

        // Общая ошибка
        showError(
          apiError ||
            (operation?.id && !isCopy
              ? NOTIFICATION_MESSAGES.OPERATION.UPDATE_ERROR
              : NOTIFICATION_MESSAGES.OPERATION.CREATE_ERROR)
        );
      } else {
        showError(
          operation?.id && !isCopy
            ? NOTIFICATION_MESSAGES.OPERATION.UPDATE_ERROR
            : NOTIFICATION_MESSAGES.OPERATION.CREATE_ERROR
        );
      }
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
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col h-full min-h-0 px-6 py-4"
    >
      <div className="flex-1 min-h-0 overflow-y-auto pb-4">
        {/* Блок A: Основное */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Основное
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Тип операции"
              value={type}
              onChange={(value) => {
                setType(value as OperationType);
                // Очищаем ошибки при изменении типа операции
                setValidationErrors({});
              }}
              options={typeOptions}
              required
            />
            <Input
              label="Дата"
              type="date"
              value={operationDate}
              onChange={(e) => {
                setOperationDate(e.target.value);
                if (validationErrors.operationDate) {
                  setValidationErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.operationDate;
                    return newErrors;
                  });
                }
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
                setAmount(formatAmountInput(e.target.value));
                if (validationErrors.amount) {
                  setValidationErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.amount;
                    return newErrors;
                  });
                }
              }}
              placeholder="0"
              error={validationErrors.amount}
              required
            />
            <Select
              label="Валюта"
              value={currency}
              onChange={(value) => {
                setCurrency(value);
                if (validationErrors.currency) {
                  setValidationErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.currency;
                    return newErrors;
                  });
                }
              }}
              options={currencyOptions}
              error={validationErrors.currency}
              required
            />
          </div>
        </div>

        {/* Блок B: Финансовые параметры */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Финансовые параметры
          </h3>
          {type === OperationType.TRANSFER ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Счет списания"
                value={sourceAccountId}
                onChange={(value) => {
                  setSourceAccountId(value);
                  if (validationErrors.sourceAccountId) {
                    setValidationErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.sourceAccountId;
                      return newErrors;
                    });
                  }
                }}
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                placeholder="Выберите счет"
                error={validationErrors.sourceAccountId}
                required
              />
              <Select
                label="Счет зачисления"
                value={targetAccountId}
                onChange={(value) => {
                  setTargetAccountId(value);
                  if (validationErrors.targetAccountId) {
                    setValidationErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.targetAccountId;
                      return newErrors;
                    });
                  }
                }}
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
                  setArticleId(value);
                  if (validationErrors.articleId) {
                    setValidationErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.articleId;
                      return newErrors;
                    });
                  }
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
                  setAccountId(value);
                  if (validationErrors.accountId) {
                    setValidationErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.accountId;
                      return newErrors;
                    });
                  }
                }}
                options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                placeholder="Выберите счет"
                error={validationErrors.accountId}
                required
              />
              <Select
                label="Контрагент"
                value={counterpartyId}
                onChange={(value) => setCounterpartyId(value)}
                options={counterparties.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                placeholder="Не выбран"
              />
              <Select
                label="Сделка"
                value={dealId}
                onChange={(value) => setDealId(value)}
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
                disabled={filteredDeals.length === 0}
              />
              <Select
                label="Подразделение"
                value={departmentId}
                onChange={(value) => setDepartmentId(value)}
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
                placeholder="Не выбрано"
              />
            </div>
          )}
        </div>

        {/* Блок C: Дополнительно (сворачиваемый) */}
        <div className="space-y-4 mb-6">
          <button
            type="button"
            onClick={() => setShowAdditionalFields(!showAdditionalFields)}
            className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <span>Дополнительно</span>
            {showAdditionalFields ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showAdditionalFields && (
            <div className="space-y-4 pt-2">
              <Input
                label="Описание"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Дополнительная информация"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Периодичность
                    </label>
                    <InfoHint
                      content={
                        <div className="space-y-3 text-xs leading-relaxed">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white mb-1">
                              Зачем это нужно?
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              Периодичность позволяет автоматически создавать
                              повторяющиеся операции (например, зарплата каждый
                              месяц, аренда каждый квартал).
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white mb-1">
                              Как использовать?
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              Выберите частоту повтора (ежедневно, еженедельно,
                              ежемесячно и т.д.). Опционально укажите дату
                              окончания — если не указать, операции будут
                              создаваться бесконечно.
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white mb-1">
                              Что будет после создания?
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              Система создаст шаблон операции и будет
                              автоматически генерировать операции по выбранному
                              расписанию. Каждая операция появится в списке в
                              день, указанный в шаблоне.
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white mb-1">
                              Обновление операций
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              При редактировании повторяющейся операции вы
                              можете обновить только текущую или все последующие
                              операции (это изменит шаблон).
                            </p>
                          </div>
                        </div>
                      }
                      className="ml-1"
                    />
                  </div>
                  <Select
                    label=""
                    value={repeat}
                    onChange={(value) => setRepeat(value as Periodicity)}
                    options={repeatOptions}
                  />
                </div>
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
            </div>
          )}
        </div>

        {/* Выбор области обновления для дочерних операций */}
        {isChildOperation && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
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
      </div>

      {/* Sticky Footer с кнопками */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            type="submit"
            disabled={isCreating || isUpdating}
            className="flex-1 sm:flex-none"
          >
            {operation?.id && !isCopy ? 'Сохранить' : 'Создать'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1 sm:flex-none"
          >
            Отмена
          </Button>
        </div>
      </div>
    </form>
  );
};
