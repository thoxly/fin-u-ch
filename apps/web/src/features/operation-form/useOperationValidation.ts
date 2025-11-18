import { useState } from 'react';
import { CreateOperationSchema } from '@fin-u-ch/shared';
import { parseAmountInputToNumber } from '../../shared/lib/numberInput';

export interface ValidationErrors {
  [key: string]: string;
}

export interface OperationFormData {
  operationDate: string;
  amount: string;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  articleId: string;
  accountId: string;
  sourceAccountId: string;
  targetAccountId: string;
}

// Map Zod error messages to Russian
const translateError = (message: string): string => {
  const translations: Record<string, string> = {
    Required: 'обязательно для заполнения',
    'Account is required for income/expense operations':
      'Счет обязателен для операций доход/расход',
    'Article is required for income/expense operations':
      'Статья обязательна для операций доход/расход',
    'Source account is required for transfer operations':
      'Счет списания обязателен для переводов',
    'Target account is required for transfer operations':
      'Счет зачисления обязателен для переводов',
    'Source and target accounts must be different':
      'Счета списания и зачисления должны отличаться',
    'Amount must be a positive number':
      'Сумма должна быть положительным числом',
    'Currency is required': 'Валюта обязательна',
  };

  for (const [key, value] of Object.entries(translations)) {
    if (message.includes(key)) {
      return value;
    }
  }

  return message;
};

export const useOperationValidation = () => {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  const validateOperation = (
    formData: OperationFormData
  ): { isValid: boolean; errors: ValidationErrors } => {
    const errors: ValidationErrors = {};

    // Convert form data to format expected by Zod schema
    const amountNumber = parseAmountInputToNumber(formData.amount);

    // Prepare data for validation
    const validationData: Record<string, unknown> = {
      type: formData.type,
      operationDate: formData.operationDate,
      amount: isNaN(amountNumber) ? 0 : amountNumber,
      currency: formData.currency,
    };

    // Add type-specific fields
    if (formData.type === 'transfer') {
      validationData.sourceAccountId = formData.sourceAccountId || '';
      validationData.targetAccountId = formData.targetAccountId || '';
    } else {
      validationData.accountId = formData.accountId || '';
      validationData.articleId = formData.articleId || '';
    }

    // Validate using Zod schema
    const result = CreateOperationSchema.safeParse(validationData);

    if (!result.success) {
      // Convert Zod errors to our format
      result.error.errors.forEach((error) => {
        const field = error.path.join('.');
        const message = translateError(error.message);
        errors[field] = message;
      });
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
