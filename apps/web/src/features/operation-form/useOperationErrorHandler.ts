import type { Operation } from '@fin-u-ch/shared';
import { NOTIFICATION_MESSAGES } from '../../constants/notificationMessages';

interface OperationFormData {
  operationDate: string;
  amount: string;
  currency: string;
  type: string;
  articleId: string;
  accountId: string;
  sourceAccountId: string;
  targetAccountId: string;
}

interface HandleApiErrorParams {
  error: unknown;
  operation: Operation | null;
  isCopy: boolean;
  formData: OperationFormData;
  validateOperation: (data: OperationFormData) => {
    isValid: boolean;
    errors: Record<string, string>;
  };
  showError: (message: string) => void;
}

export const handleApiError = ({
  error,
  operation,
  isCopy,
  formData,
  validateOperation,
  showError,
}: HandleApiErrorParams): void => {
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
      validateOperation(formData);
      showError('Не заполнены обязательные поля: Статья, Счет');
      return;
    }

    if (apiError.includes('sourceAccountId and targetAccountId are required')) {
      validateOperation(formData);
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
};
