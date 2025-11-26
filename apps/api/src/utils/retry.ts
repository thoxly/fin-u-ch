import logger from '../config/logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number; // в миллисекундах
  maxDelay?: number; // максимальная задержка в миллисекундах
  backoffMultiplier?: number; // множитель для exponential backoff
  retryableStatusCodes?: number[]; // коды статусов, при которых нужно ретраить
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 5,
  initialDelay: 1000, // 1 секунда
  maxDelay: 30000, // 30 секунд
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

/**
 * Выполняет функцию с retry и exponential backoff
 * @param fn - функция для выполнения
 * @param options - опции retry
 * @returns результат выполнения функции
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Проверяем, нужно ли ретраить
      const shouldRetry = shouldRetryError(error, opts.retryableStatusCodes);

      if (!shouldRetry || attempt === opts.maxRetries) {
        // Не ретраим или достигли максимума попыток
        if (attempt === opts.maxRetries) {
          logger.error(`Retry failed after ${opts.maxRetries} attempts`, {
            error: error.message,
            attempts: attempt + 1,
          });
        }
        throw error;
      }

      // Логируем попытку ретрая
      const statusCode = error.status || error.statusCode || 'unknown';
      logger.warn(
        `Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`,
        {
          error: error.message,
          statusCode,
          delay,
        }
      );

      // Ждем перед следующей попыткой
      await sleep(delay);

      // Увеличиваем задержку для следующей попытки (exponential backoff)
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  // Этот код не должен выполниться, но TypeScript требует возврат
  throw lastError || new Error('Retry failed');
}

/**
 * Проверяет, нужно ли ретраить ошибку
 */
function shouldRetryError(error: any, retryableStatusCodes: number[]): boolean {
  // Проверяем статус код HTTP ошибки
  const statusCode = error.status || error.statusCode;
  if (statusCode && retryableStatusCodes.includes(statusCode)) {
    return true;
  }

  // Проверяем тип ошибки
  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return true;
  }

  // Проверяем сообщение об ошибке
  const errorMessage = error.message?.toLowerCase() || '';
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('econnreset')
  ) {
    return true;
  }

  return false;
}

/**
 * Задержка на указанное количество миллисекунд
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
