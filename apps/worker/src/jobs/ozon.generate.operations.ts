// apps/worker/src/jobs/ozon.generate.operations.ts
import { logger } from '../config/logger';
import { env } from '../config/env';
import { getOzonQueryPeriod } from '@fin-u-ch/shared';

interface OzonOperationsGenerationParams {
  testIntegrationId?: string;
}

interface ApiResponse {
  success: boolean;
  created?: number;
  operationCreated?: boolean;
  errors?: string[];
  error?: string;
  data?: any;
}

export class OzonOperationService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = env.API_URL;
    logger.info(
      `OzonOperationService initialized with API_URL: ${this.apiUrl}`
    );
  }

  /**
   * Вызывает API для генерации операций
   */
  private async callApi(
    endpoint: string,
    method: string = 'POST',
    body?: any
  ): Promise<ApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      // Простой объект для headers без использования HeadersInit типа
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Если есть API ключ для worker, используем его
      if (env.WORKER_API_KEY) {
        headers['Authorization'] = `Bearer ${env.WORKER_API_KEY}`;
      } else {
        logger.warn(
          'No WORKER_API_KEY configured, making unauthenticated request'
        );
      }

      const url = `${this.apiUrl}/api/integrations${endpoint}`;
      logger.debug(` Making API call to: ${url}`);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`API error ${response.status}: ${errorText}`);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as ApiResponse;
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Таймаут подключения к API');
      }

      throw new Error(`Ошибка подключения к API: ${error.message}`);
    }
  }

  /**
   * Создает операции для всех активных интеграций
   */
  async createOperationsForAllIntegrations(): Promise<{
    created: number;
    errors: string[];
  }> {
    logger.info('Calling API to generate Ozon operations for all integrations');

    try {
      const result = await this.callApi('/ozon/generate-operations');

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate operations');
      }

      logger.info(
        `API completed: ${result.created} operations created, ${result.errors?.length || 0} errors`
      );
      return {
        created: result.created || 0,
        errors: result.errors || [],
      };
    } catch (error: any) {
      logger.error(
        'Failed to generate operations for all integrations:',
        error
      );
      throw error;
    }
  }

  /**
   * Создает операцию для конкретной интеграции
   */

  /**
   * Получает статус операций (только для direct mode)
   */
  async getOperationsStatus() {
    logger.info('Getting Ozon operations status (direct mode)');

    try {
      // Используем direct mode для получения статуса
      const { ozonDirectService } = await import('./ozon.direct.service');
      const integrations = await ozonDirectService.getActiveIntegrations();

      return {
        activeIntegrations: integrations.length,
        integrations: integrations.map((i) => ({
          id: i.id,
          companyId: i.companyId,
          paymentSchedule: i.paymentSchedule,
        })),
      };
    } catch (error: any) {
      logger.error('Failed to get operations status:', error);
      throw error;
    }
  }

  /**
   * Проверяет доступность API
   */
  async healthCheck(): Promise<boolean> {
    // Если WORKER_API_KEY не настроен, пропускаем проверку
    if (!env.WORKER_API_KEY) {
      logger.warn('WORKER_API_KEY не настроен, пропускаем health check');
      return false;
    }

    try {
      logger.info('Performing API health check');

      const result = await this.callApi('/ozon', 'GET');

      if (result.success !== undefined) {
        logger.info('API health check passed');
        return true;
      }

      logger.warn('API health check returned unexpected response');
      return false;
    } catch (error: any) {
      logger.error('API health check failed:', error);
      return false;
    }
  }
}

export const ozonOperationService = new OzonOperationService();

// Задача генерации операций из Ozon
export async function generateOzonOperations(
  params: OzonOperationsGenerationParams = {}
): Promise<{ created: number; errors: string[] }> {
  logger.info(' Запуск генерации операций Ozon...');

  try {
    logger.info('🏥 Проверка доступности API...');
    let useApiMode = false;

    try {
      const isHealthy = await ozonOperationService.healthCheck();
      if (isHealthy) {
        useApiMode = true;
        logger.info(' API доступен, используем API режим');
      } else {
        logger.warn('  API недоступен, переключаемся на прямой режим (direct)');
      }
    } catch (apiError: any) {
      logger.warn(`  Ошибка проверки API: ${apiError.message}`);
      logger.warn(
        '💡 Переключаемся на прямой режим (direct) - работа напрямую с БД и Ozon API'
      );
    }

    let result: { created: number; errors: string[] };

    if (params.testIntegrationId) {
      logger.info(
        ` Тестовый режим для интеграции: ${params.testIntegrationId}`
      );
      logger.warn(
        '  Тестовый режим работает только в direct mode (напрямую с БД и Ozon API)'
      );

      // Используем direct mode для тестирования
      const { ozonDirectService } = await import('./ozon.direct.service');
      const integration = await ozonDirectService.getActiveIntegrations();
      const testIntegration = integration.find(
        (i) => i.id === params.testIntegrationId
      );

      if (!testIntegration) {
        throw new Error(
          `Integration ${params.testIntegrationId} not found or not active`
        );
      }

      const period = getOzonQueryPeriod(
        testIntegration.paymentSchedule as 'next_week' | 'week_after'
      );
      const created = await ozonDirectService.createOperationForIntegration(
        testIntegration,
        period
      );

      result = {
        created: created ? 1 : 0,
        errors: [],
      };
      logger.info(
        ` Тестовая операция ${result.created > 0 ? 'создана' : 'не создана'}`
      );
    } else {
      if (useApiMode) {
        logger.info(
          ' Продукционный режим - обработка всех активных интеграций через API'
        );
        result =
          await ozonOperationService.createOperationsForAllIntegrations();
      } else {
        logger.info(
          ' Продукционный режим - обработка всех активных интеграций (прямой режим)'
        );
        const { ozonDirectService } = await import('./ozon.direct.service');
        result = await ozonDirectService.createOperationsForAllIntegrations();
      }
      logger.info(
        ` Обработка завершена: ${result.created} создано, ${result.errors.length} ошибок`
      );
    }

    return result;
  } catch (error) {
    logger.error(' Ошибка при генерации операций Ozon:', error);
    throw error;
  }
}

// Получает текущий день недели
export function getCurrentWeekday(): number {
  return new Date().getDay();
}

/**
 * Проверяет, нужно ли запускать задачу сегодня
 */
export function shouldRunOzonTaskToday(): boolean {
  const today = getCurrentWeekday();
  const shouldRun = today === 3;
  const weekdayNames = [
    'воскресенье',
    'понедельник',
    'вторник',
    'среда',
    'четверг',
    'пятница',
    'суббота',
  ];
  logger.info(
    ` Сегодня ${weekdayNames[today]} (день недели: ${today}), запускать задачу: ${shouldRun ? 'ДА' : 'НЕТ'}`
  );
  return shouldRun;
}

/**
 * Получает информацию о следующем запуске
 */
export function getNextRunInfo() {
  const today = getCurrentWeekday();
  const now = new Date();

  let daysUntilNextRun = 0;
  const nextRunDay = 'Wednesday';

  if (today === 3) {
    if (now.getHours() < 0 || (now.getHours() === 0 && now.getMinutes() < 1)) {
      daysUntilNextRun = 0;
    } else {
      daysUntilNextRun = 7;
    }
  } else if (today < 3) {
    daysUntilNextRun = 3 - today;
  } else {
    daysUntilNextRun = 7 - today + 3;
  }

  const nextRunDate = new Date(now);
  if (
    daysUntilNextRun === 0 &&
    (now.getHours() < 0 || (now.getHours() === 0 && now.getMinutes() < 1))
  ) {
    nextRunDate.setHours(0, 1, 0, 0);
  } else {
    nextRunDate.setDate(now.getDate() + daysUntilNextRun);
    nextRunDate.setHours(0, 1, 0, 0);
  }

  return {
    nextRunDay,
    nextRunDate: nextRunDate.toISOString(),
    daysUntilNextRun,
  };
}
