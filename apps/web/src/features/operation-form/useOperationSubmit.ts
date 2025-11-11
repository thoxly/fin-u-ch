import {
  useCreateOperationMutation,
  useUpdateOperationMutation,
} from '../../store/api/operationsApi';
import { useNotification } from '../../shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '../../constants/notificationMessages';
import { parseAmountInputToNumber } from '../../shared/lib/numberInput';
import type { Operation, CreateOperationDTO } from '@fin-u-ch/shared';
import { OperationType, Periodicity } from '@fin-u-ch/shared';
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
  updateScope?: 'current' | 'all';
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
      counterpartyId,
      dealId,
      departmentId,
      description,
      repeat,
      recurrenceEndDate,
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
