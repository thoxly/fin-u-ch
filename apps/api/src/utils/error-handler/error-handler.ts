import logger from '../../config/logger';
import { ErrorContext, BatchErrorInfo } from './error-handler.types';

/**
 * Унифицированная обработка ошибок
 */

/**
 * Форматирует ошибку для логирования
 */
export function formatError(error: unknown, context?: ErrorContext): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Логирует ошибку с контекстом
 */
export function logError(
  error: unknown,
  message: string,
  context?: ErrorContext
): void {
  const errorMessage = formatError(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error(message, {
    error: errorMessage,
    stack: errorStack,
    ...context,
  });
}

/**
 * Обрабатывает ошибки в батчах
 */
export function handleBatchErrors(
  errors: BatchErrorInfo[],
  operationName: string
): string[] {
  const errorMessages: string[] = [];

  for (const errorInfo of errors) {
    const message = `[${operationName}] Item ${errorInfo.index}: ${errorInfo.message}`;
    errorMessages.push(message);

    logError(errorInfo.error, message, {
      index: errorInfo.index,
      ...errorInfo.context,
    });
  }

  return errorMessages;
}

/**
 * Создает объект BatchErrorInfo из ошибки
 */
export function createBatchErrorInfo(
  error: unknown,
  index: number,
  context?: ErrorContext
): BatchErrorInfo {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  return {
    index,
    message: errorObj.message,
    error: errorObj,
    context,
  };
}
