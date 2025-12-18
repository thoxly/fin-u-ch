import { AppError } from '../middlewares/error';

/**
 * Translates Zod error messages to Russian
 */
const translateZodError = (message: string): string => {
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
    'Invalid enum value': 'Недопустимое значение',
    'Expected number, received': 'Ожидается число, получено',
    'Expected string, received': 'Ожидается строка, получено',
    'Expected date, received': 'Ожидается дата, получено',
    'String must contain at least': 'Строка должна содержать минимум',
    'Invalid date': 'Некорректная дата',
  };

  // Try exact match first
  if (translations[message]) {
    return translations[message];
  }

  // Try partial match for common patterns
  for (const [key, value] of Object.entries(translations)) {
    if (message.includes(key)) {
      return value;
    }
  }

  // Return original message if no translation found
  return message;
};

/**
 * Translates field names to Russian
 */
const translateFieldName = (field: string | number): string => {
  const fieldStr = String(field);
  const translations: Record<string, string> = {
    type: 'Тип операции',
    operationDate: 'Дата операции',
    amount: 'Сумма',
    currency: 'Валюта',
    accountId: 'Счет',
    sourceAccountId: 'Счет списания',
    targetAccountId: 'Счет зачисления',
    articleId: 'Статья',
    counterpartyId: 'Контрагент',
    dealId: 'Сделка',
    departmentId: 'Подразделение',
    description: 'Описание',
    repeat: 'Периодичность',
    recurrenceEndDate: 'Дата окончания повторов',
  };

  return translations[fieldStr] || fieldStr;
};

/**
 * Formats Zod validation errors into a user-friendly Russian message
 * @param error - The error object from Zod's safeParse result
 */
export const formatZodErrors = (error: {
  errors: Array<{ path: (string | number)[]; message: string }>;
}): string => {
  const errors = error.errors.map((err) => {
    const path = err.path.map(translateFieldName).join('.');
    const translatedMessage = translateZodError(err.message);
    return `${path}: ${translatedMessage}`;
  });

  return errors.join(', ');
};

export const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400);
  }
};

export const validatePassword = (password: string): void => {
  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters long', 400);
  }
};

export const validateRequired = (fields: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') {
      throw new AppError(`Field '${key}' is required`, 400);
    }
  }
};
