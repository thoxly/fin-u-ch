import {
  useCreateOperationMutation,
  useUpdateOperationMutation,
} from '../../store/api/operationsApi';
import { useNotification } from '../../shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '../../constants/notificationMessages';
import { parseAmountInputToNumber } from '../../shared/lib/numberInput';
import type { Operation, CreateOperationDTO } from '@fin-u-ch/shared';
import { handleApiError } from './useOperationErrorHandler';
import type { OperationFormData } from './useOperationValidation';

interface UseOperationSubmitProps {
  operation: Operation | null;
  isCopy: boolean;
  onClose: () => void;
  validateOperation: (formData: OperationFormData) => {
    isValid: boolean;
    errors: Record<string, string>;
  };
}

interface FormValues {
  type: 'income' | 'expense' | 'transfer';
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
  repeat:
    | 'none'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'semiannual'
    | 'annual';
  recurrenceEndDate: string;
  updateScope?: 'current' | 'all';
}

// Вспомогательная функция для создания DTO операции
function buildOperationDTO(formValues: FormValues): CreateOperationDTO {
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
  } = formValues;

  const amountNumber = parseAmountInputToNumber(amount);

  return {
    type,
    operationDate: new Date(operationDate).toISOString(),
    amount: amountNumber,
    currency,
    articleId: articleId || undefined,
    accountId: type !== 'transfer' ? accountId || undefined : undefined,
    sourceAccountId:
      type === 'transfer' ? sourceAccountId || undefined : undefined,
    targetAccountId:
      type === 'transfer' ? targetAccountId || undefined : undefined,
    counterpartyId: counterpartyId || undefined,
    dealId: dealId || undefined,
    departmentId: departmentId || undefined,
    description: description || undefined,
    repeat,
    recurrenceEndDate: recurrenceEndDate
      ? new Date(recurrenceEndDate).toISOString()
      : undefined,
  };
}

// Вспомогательная функция для создания частичного DTO шаблона
function buildTemplateUpdateDTO(
  formValues: FormValues
): Partial<CreateOperationDTO> {
  const {
    type,
    currency,
    articleId,
    accountId,
    sourceAccountId,
    targetAccountId,
    counterpartyId,
    dealId,
    departmentId,
    description,
  } = formValues;

  return {
    articleId: articleId || undefined,
    accountId: type !== 'transfer' ? accountId || undefined : undefined,
    sourceAccountId:
      type === 'transfer' ? sourceAccountId || undefined : undefined,
    targetAccountId:
      type === 'transfer' ? targetAccountId || undefined : undefined,
    counterpartyId: counterpartyId || undefined,
    dealId: dealId || undefined,
    departmentId: departmentId || undefined,
    description: description || undefined,
    currency,
  };
}

export const useOperationSubmit = ({
  operation,
  isCopy,
  onClose,
  validateOperation,
}: UseOperationSubmitProps) => {
  const [createOperation, { isLoading: isCreating }] =
    useCreateOperationMutation();
  const [updateOperation, { isLoading: isUpdating }] =
    useUpdateOperationMutation();

  const { showSuccess, showError } = useNotification();

  // Определяем, является ли операция дочерней (с родителем и не шаблон)
  const isChildOperation =
    operation && operation.recurrenceParentId && !operation.isTemplate;

  // Определяем, является ли операция шаблоном
  const isTemplate = operation && operation.isTemplate === true;

  const submitOperation = async (formValues: FormValues) => {
    const {
      type,
      operationDate,
      amount,
      currency,
      articleId,
      accountId,
      sourceAccountId,
      targetAccountId,
      updateScope,
    } = formValues;

    // Валидация формы
    const validation = validateOperation({
      operationDate,
      amount,
      currency,
      type,
      articleId,
      accountId,
      sourceAccountId,
      targetAccountId,
    });

    // Если есть ошибки валидации, показываем их
    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors).join(', ');
      showError(`Не заполнены обязательные поля: ${errorMessages}`);
      return { success: false };
    }

    const operationData = buildOperationDTO(formValues);

    try {
      // Создание новой операции или копирование
      if (!operation?.id || isCopy) {
        await createOperation(operationData).unwrap();
        showSuccess(NOTIFICATION_MESSAGES.OPERATION.CREATE_SUCCESS);
      }
      // Обновление шаблона
      else if (isTemplate) {
        await updateOperation({
          id: operation.id,
          data: operationData,
        }).unwrap();
        showSuccess(NOTIFICATION_MESSAGES.OPERATION.UPDATE_SUCCESS);
      }
      // Обновление дочерней операции и всех последующих
      else if (
        isChildOperation &&
        updateScope === 'all' &&
        operation.recurrenceParentId
      ) {
        const templateData = buildTemplateUpdateDTO(formValues);

        await updateOperation({
          id: operation.recurrenceParentId,
          data: templateData,
        }).unwrap();

        await updateOperation({
          id: operation.id,
          data: operationData,
        }).unwrap();

        showSuccess('Операция и все последующие обновлены');
      }
      // Обновление только текущей операции
      else {
        await updateOperation({
          id: operation.id,
          data: operationData,
        }).unwrap();
        showSuccess(NOTIFICATION_MESSAGES.OPERATION.UPDATE_SUCCESS);
      }

      onClose();
      return { success: true };
    } catch (error: unknown) {
      handleApiError({
        error,
        operation,
        isCopy,
        formData: {
          operationDate,
          amount,
          currency,
          type: type as string,
          articleId,
          accountId,
          sourceAccountId,
          targetAccountId,
        },
        validateOperation,
        showError,
      });
      return { success: false };
    }
  };

  return {
    submitOperation,
    isCreating,
    isUpdating,
    isChildOperation,
    isTemplate,
  };
};
