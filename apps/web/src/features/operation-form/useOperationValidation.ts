import { useState } from 'react';
import { OperationType } from '@fin-u-ch/shared';
import { parseAmountInputToNumber } from '../../shared/lib/numberInput';

export interface ValidationErrors {
  [key: string]: string;
}

export interface OperationFormData {
  operationDate: string;
  amount: string;
  currency: string;
  type: OperationType;
  articleId: string;
  accountId: string;
  sourceAccountId: string;
  targetAccountId: string;
}

export const useOperationValidation = () => {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  const validateOperation = (
    formData: OperationFormData
  ): { isValid: boolean; errors: ValidationErrors } => {
    const errors: ValidationErrors = {};

    // Валидация обязательных полей
    if (!formData.operationDate) {
      errors.operationDate = 'Поле "Дата" обязательно для заполнения';
    }

    if (!formData.amount || formData.amount.trim() === '') {
      errors.amount = 'Поле "Сумма" обязательно для заполнения';
    } else {
      const amountNumber = parseAmountInputToNumber(formData.amount);
      if (isNaN(amountNumber) || amountNumber <= 0) {
        errors.amount = 'Сумма должна быть положительным числом';
      }
    }

    if (!formData.currency) {
      errors.currency = 'Поле "Валюта" обязательно для заполнения';
    }

    // Валидация в зависимости от типа операции
    if (formData.type === OperationType.TRANSFER) {
      if (!formData.sourceAccountId) {
        errors.sourceAccountId =
          'Поле "Счет списания" обязательно для заполнения';
      }
      if (!formData.targetAccountId) {
        errors.targetAccountId =
          'Поле "Счет зачисления" обязательно для заполнения';
      }
    } else {
      if (!formData.articleId) {
        errors.articleId = 'Поле "Статья" обязательно для заполнения';
      }
      if (!formData.accountId) {
        errors.accountId = 'Поле "Счет" обязательно для заполнения';
      }
    }

    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const clearValidationError = (field: string) => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const clearAllValidationErrors = () => {
    setValidationErrors({});
  };

  return {
    validationErrors,
    validateOperation,
    clearValidationError,
    clearAllValidationErrors,
    setValidationErrors,
  };
};
