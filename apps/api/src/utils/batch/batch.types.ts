/**
 * Типы для работы с батчами
 */

export interface BatchProcessorOptions<T> {
  /**
   * Размер батча
   */
  batchSize?: number;
  /**
   * Максимальное время ожидания начала транзакции (мс)
   */
  maxWait?: number;
  /**
   * Максимальное время выполнения транзакции (мс)
   */
  timeout?: number;
  /**
   * Обработчик ошибок для отдельных элементов
   */
  onItemError?: (item: T, error: Error, index: number) => void;
  /**
   * Обработчик ошибок для батчей
   */
  onBatchError?: (batch: T[], error: Error, batchIndex: number) => void;
}

export interface BatchResult<TResult> {
  /**
   * Количество успешно обработанных элементов
   */
  success: number;
  /**
   * Количество ошибок
   */
  errors: number;
  /**
   * Результаты обработки
   */
  results: TResult[];
  /**
   * Сообщения об ошибках
   */
  errorMessages?: string[];
}
