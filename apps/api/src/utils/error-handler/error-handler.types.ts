/**
 * Типы для обработки ошибок
 */

export interface ErrorContext {
  /**
   * Дополнительные данные для логирования
   */
  [key: string]: unknown;
}

export interface BatchErrorInfo {
  /**
   * Индекс элемента в батче
   */
  index: number;
  /**
   * Сообщение об ошибке
   */
  message: string;
  /**
   * Оригинальная ошибка
   */
  error: Error;
  /**
   * Дополнительный контекст
   */
  context?: ErrorContext;
}
