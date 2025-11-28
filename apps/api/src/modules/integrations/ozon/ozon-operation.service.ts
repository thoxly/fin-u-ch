// apps/api/src/modules/integrations/ozon/ozon-operation.service.ts
import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';
import { retryWithBackoff } from '../../../utils/retry';
import { hashObject } from '../../../utils/hash';
import { decrypt } from '../../../utils/encryption';
import logger from '../../../config/logger';
import {
  getOzonQueryPeriod,
  calculateOzonPaymentDates,
  calculateOzonPaymentAmount,
  type OzonCashFlowResponse,
} from '@fin-u-ch/shared';

// Расширенный интерфейс для внутреннего использования (с дополнительными полями для логирования)
// Используем базовый интерфейс из shared, но добавляем дополнительные поля, которые могут быть в ответе Ozon API
interface OzonCashFlowResponseExtended extends OzonCashFlowResponse {
  page_count?: number;
}

export class OzonOperationService {
  /**
   * Получает интеграцию по ID
   */
  async getIntegrationById(integrationId: string) {
    return prisma.integration.findFirst({
      where: {
        id: integrationId,
        type: 'ozon',
        isActive: true,
      },
      include: {
        company: true,
        article: true,
        account: true,
      },
    });
  }

  /**
   * Получает все активные интеграции Ozon
   */
  async getActiveIntegrations() {
    return prisma.integration.findMany({
      where: {
        type: 'ozon',
        isActive: true,
      },
      include: {
        company: true,
        article: {
          include: {
            counterparty: true, // Включаем контрагента из статьи
          },
        },
        account: true,
      },
    });
  }

  /**
   * Получает данные о денежных потоках из Ozon API с retry и backoff
   */
  async getCashFlowStatement(
    clientKey: string,
    apiKey: string,
    dateFrom: string,
    dateTo: string
  ): Promise<OzonCashFlowResponseExtended> {
    return retryWithBackoff(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          // Обрезаем пробелы в ключах (как в валидации и как должно быть)
          const trimmedClientKey = clientKey.trim();
          const trimmedApiKey = apiKey.trim();

          const response = await fetch(
            'https://api-seller.ozon.ru/v1/finance/cash-flow-statement/list',
            {
              method: 'POST',
              headers: {
                'Client-Id': trimmedClientKey,
                'Api-Key': trimmedApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                date: {
                  from: dateFrom,
                  to: dateTo,
                },
                with_details: true,
                page: 1,
                page_size: 100,
              }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            // Получаем тело ответа для диагностики (как в worker)
            const errorText = await response.text();
            let errorBody: any;
            try {
              errorBody = JSON.parse(errorText);
            } catch {
              errorBody = errorText;
            }

            logger.error(
              ` Ozon API error ${response.status} ${response.statusText}:`,
              errorBody
            );
            logger.error(` Request details:`, {
              url: 'https://api-seller.ozon.ru/v1/finance/cash-flow-statement/list',
              clientKey: trimmedClientKey
                ? `${trimmedClientKey.substring(0, 8)}...`
                : 'missing',
              apiKey: trimmedApiKey
                ? `${trimmedApiKey.substring(0, 8)}...`
                : 'missing',
              apiKeyLength: trimmedApiKey?.length || 0,
              dateFrom,
              dateTo,
            });

            // Сохраняем статус код для retry логики
            const errorMessage = `Ozon API error: ${response.status} ${response.statusText}${errorBody?.message ? ` - ${errorBody.message}` : ''}${typeof errorBody === 'string' ? ` - ${errorBody}` : ''}`;
            const error: any = new AppError(errorMessage, response.status);
            error.status = response.status;
            error.statusCode = response.status;
            throw error;
          }

          const data = (await response.json()) as OzonCashFlowResponseExtended;
          return data;
        } catch (error: any) {
          clearTimeout(timeoutId);

          if (error.name === 'AbortError') {
            const timeoutError: any = new AppError(
              'Таймаут подключения к Ozon API',
              408
            );
            timeoutError.status = 408;
            timeoutError.statusCode = 408;
            throw timeoutError;
          } else if (error instanceof AppError) {
            throw error;
          }

          const networkError: any = new AppError(
            `Ошибка подключения к Ozon API: ${error.message}`,
            500
          );
          networkError.status = 500;
          networkError.statusCode = 500;
          throw networkError;
        }
      },
      {
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        retryableStatusCodes: [429, 500, 502, 503, 504],
      }
    );
  }

  /**
   * Рассчитывает сумму выплаты (использует общую функцию из shared)
   */
  calculatePaymentAmount(cashFlowData: OzonCashFlowResponseExtended): number {
    if (!cashFlowData.result.cash_flows.length) {
      logger.warn(' Нет данных cash_flows в ответе Ozon API');
      return 0;
    }

    const calculatedAmount = calculateOzonPaymentAmount(cashFlowData);

    // Логируем источник суммы для диагностики
    const details = cashFlowData.result.details;
    if (details && details.length > 0) {
      const payments = details[0]?.payments;
      if (payments && payments.length > 0) {
        const payment = payments[0];
        logger.info(
          ` Прямая сумма выплаты из Ozon: ${payment.payment} ${payment.currency_code}`
        );
      } else {
        logger.warn(`  Поле payment не найдено, используем расчетную сумму`);
        logger.info(` Расчетная сумма: ${calculatedAmount}`);
      }
    } else {
      logger.warn(`  Поле payment не найдено, используем расчетную сумму`);
      logger.info(` Расчетная сумма: ${calculatedAmount}`);
    }

    return calculatedAmount;
  }

  /**
   * Преобразует сумму в положительное значение для операции
   */
  private getOperationAmount(calculatedAmount: number): number {
    return calculatedAmount < 0 ? Math.abs(calculatedAmount) : calculatedAmount;
  }

  /**
   * Определяет тип операции
   */
  private getOperationType(calculatedAmount: number): 'income' | 'expense' {
    return calculatedAmount < 0 ? 'expense' : 'income';
  }

  /**
   * Получает период для запроса данных
   */
  getQueryPeriod(paymentSchedule: 'next_week' | 'week_after'): {
    from: Date;
    to: Date;
  } {
    return getOzonQueryPeriod(paymentSchedule);
  }

  /**
   * Рассчитывает даты для графика выплат
   */
  calculatePaymentDates(
    periodEndDate: Date,
    paymentSchedule: 'next_week' | 'week_after'
  ): { calculationDate: Date; paymentDate: Date } {
    return calculateOzonPaymentDates(periodEndDate, paymentSchedule);
  }

  /**
   * Создает операции для всех активных интеграций Ozon
   */
  async createOperationsForAllIntegrations(): Promise<{
    created: number;
    errors: string[];
  }> {
    const integrations = await this.getActiveIntegrations();

    const results = {
      created: 0,
      errors: [] as string[],
    };

    if (integrations.length === 0) {
      logger.info('  Активных интеграций не найдено, операций не создано');
      return results;
    }

    for (let i = 0; i < integrations.length; i++) {
      const integration = integrations[i];
      logger.info(
        `\n[${i + 1}/${integrations.length}] Обработка интеграции: ${integration.id}`
      );
      logger.info(`   Компания: ${integration.company.name}`);
      logger.info(`   График выплат: ${integration.paymentSchedule}`);

      const period = this.getQueryPeriod(
        integration.paymentSchedule as 'next_week' | 'week_after'
      );

      // Создаем сессию импорта для отслеживания
      let importSession = null;
      const startTime = Date.now();

      try {
        // Создаем сессию импорта
        importSession = await prisma.importSession.create({
          data: {
            companyId: integration.companyId,
            type: 'ozon',
            integrationId: integration.id,
            status: 'draft',
            periodFrom: period.from,
            periodTo: period.to,
            importedCount: 0,
            processedCount: 0,
            skippedCount: 0,
            retryCount: 0,
          },
        });

        logger.info(`Создана сессия импорта: ${importSession.id}`);

        const created = await this.createOperationForIntegration(
          integration,
          period,
          importSession.id
        );

        const duration = Date.now() - startTime;

        if (created) {
          results.created++;
          logger.info(
            `   Операция успешно создана для интеграции ${integration.id}`
          );

          // Обновляем сессию как успешную
          await prisma.importSession.update({
            where: { id: importSession.id },
            data: {
              status: 'success',
              processedCount: 1,
              importedCount: 1,
              duration,
            },
          });
        } else {
          logger.info(
            `    Операция не создана (сумма 0, payment >= 0 или дубликат)`
          );

          // Обновляем сессию - операция пропущена
          await prisma.importSession.update({
            where: { id: importSession.id },
            data: {
              status: 'success',
              skippedCount: 1,
              importedCount: 1,
              duration,
            },
          });
        }
      } catch (error: any) {
        const errorMsg = `Integration ${integration.id}: ${error.message}`;
        logger.error(`   Ошибка: ${errorMsg}`);
        results.errors.push(errorMsg);

        const duration = Date.now() - startTime;

        // Обновляем сессию с ошибкой
        if (importSession) {
          await prisma.importSession.update({
            where: { id: importSession.id },
            data: {
              status: 'error',
              lastError: errorMsg,
              retryCount: error.retryCount || 0,
              duration,
            },
          });
        }
      }
    }
    logger.info(`Успешно создано операций: ${results.created}`);
    logger.info(`Ошибок: ${results.errors.length}`);

    return results;
  }

  /**
   * Создает операцию для конкретной интеграции
   */
  async createOperationForIntegration(
    integration: any,
    period: { from: Date; to: Date },
    importSessionId?: string
  ): Promise<boolean> {
    try {
      logger.info(
        `Период запроса: ${period.from.toLocaleDateString('ru-RU')} - ${period.to.toLocaleDateString('ru-RU')}`
      );

      // Проверяем данные интеграции
      logger.info(`Данные интеграции:`, {
        articleId: integration.articleId,
        articleName: integration.article?.name || 'N/A',
        articleCounterpartyId: integration.article?.counterpartyId || 'N/A',
        accountId: integration.accountId,
        accountName: integration.account?.name || 'N/A',
        companyId: integration.companyId,
      });

      // Форматируем даты для Ozon API
      const fromISO = period.from.toISOString();
      const toISO = period.to.toISOString();

      // Получаем данные из Ozon
      // Расшифровываем apiKey перед использованием
      let decryptedApiKey: string;
      try {
        // Логируем исходное значение для диагностики (первые символы)
        const originalApiKeyPreview = integration.apiKey
          ? `${integration.apiKey.substring(0, 20)}...`
          : 'missing';
        logger.debug(
          `   Исходный apiKey (первые 20 символов): ${originalApiKeyPreview}`
        );
        logger.debug(
          `   Длина исходного apiKey: ${integration.apiKey?.length || 0}`
        );

        decryptedApiKey = decrypt(integration.apiKey);

        // КРИТИЧЕСКАЯ ПРОВЕРКА: расшифрованное значение не должно быть равно исходному
        if (decryptedApiKey === integration.apiKey) {
          logger.error(
            `   КРИТИЧЕСКОЕ: Расшифрованное значение равно исходному!`
          );
          logger.error(`   Это означает, что расшифровка не удалась`);
          logger.error(`   apiKey был зашифрован другим ENCRYPTION_KEY`);
          logger.error(
            `   Пересоздайте интеграцию через форму, введя apiKey заново`
          );
          throw new AppError(
            'Не удалось расшифровать apiKey (расшифрованное значение равно исходному). Пересоздайте интеграцию через форму.',
            400
          );
        }

        // Проверяем, что расшифрованное значение выглядит как валидный API ключ
        // Зашифрованное значение имеет формат "iv:salt:tag:encrypted" (4 части через :)
        // Реальный API ключ не содержит двоеточий и имеет другую длину
        const isEncryptedFormat = decryptedApiKey.split(':').length === 4;
        if (isEncryptedFormat) {
          logger.error(
            `   Не удалось расшифровать apiKey (вернуто зашифрованное значение)`
          );
          logger.error(
            `   Расшифрованное значение имеет формат зашифрованного: ${decryptedApiKey.substring(0, 50)}...`
          );
          logger.error(`   apiKey был зашифрован другим ENCRYPTION_KEY`);
          logger.error(
            `   Пересоздайте интеграцию через форму, введя apiKey заново`
          );
          throw new AppError(
            'Не удалось расшифровать apiKey (вернуто зашифрованное значение). Пересоздайте интеграцию через форму.',
            400
          );
        }

        // Проверяем, что расшифрованное значение выглядит как валидный API ключ
        // Ozon API ключи обычно имеют длину 32-64 символа и содержат буквы и цифры
        if (
          !decryptedApiKey ||
          decryptedApiKey.length < 10 ||
          decryptedApiKey.length > 200
        ) {
          logger.error(
            `   Расшифрованный apiKey выглядит некорректно (длина: ${decryptedApiKey.length})`
          );
          logger.error(
            `   Пересоздайте интеграцию через форму, введя apiKey заново`
          );
          throw new AppError(
            'Расшифрованный apiKey выглядит некорректно. Пересоздайте интеграцию через форму.',
            400
          );
        }

        // Дополнительная проверка: apiKey не должен содержать base64-подобные паттерны
        // (зашифрованные значения содержат base64 строки)
        const base64Pattern = /^[A-Za-z0-9+/=]+$/;
        if (
          decryptedApiKey.length > 50 &&
          base64Pattern.test(decryptedApiKey) &&
          decryptedApiKey.includes('=')
        ) {
          logger.warn(
            `   Предупреждение: apiKey выглядит как base64 строка, возможно это зашифрованное значение`
          );
        }

        logger.info(
          `apiKey успешно расшифрован (длина: ${decryptedApiKey.length})`
        );
        logger.debug(
          `   Первые 8 символов расшифрованного apiKey: ${decryptedApiKey.substring(0, 8)}...`
        );
      } catch (error: any) {
        if (error instanceof AppError) {
          throw error;
        }
        // Если это ошибка от decrypt, оборачиваем её в AppError
        throw new AppError(
          `Ошибка расшифровки apiKey: ${error.message}. Пересоздайте интеграцию через форму.`,
          400
        );
      }

      // Обрезаем пробелы в ключах перед отправкой (как в валидации)
      const trimmedClientKey = integration.clientKey.trim();
      const trimmedApiKey = decryptedApiKey.trim();

      logger.debug(`   Параметры запроса:`, {
        clientKey: `${trimmedClientKey.substring(0, 8)}...`,
        apiKeyLength: trimmedApiKey.length,
        dateFrom: fromISO,
        dateTo: toISO,
      });

      const cashFlowData = await this.getCashFlowStatement(
        trimmedClientKey,
        trimmedApiKey,
        fromISO,
        toISO
      );

      logger.info(` Получено данных от Ozon API:`, {
        cash_flows_count: cashFlowData.result.cash_flows?.length || 0,
        details_count: cashFlowData.result.details?.length || 0,
      });

      // Вычисляем хэш данных для идемпотентности
      const dataHash = hashObject({
        integrationId: integration.id,
        periodFrom: fromISO,
        periodTo: toISO,
        cashFlows: cashFlowData.result.cash_flows,
        details: cashFlowData.result.details,
      });
      logger.debug(` Хэш данных: ${dataHash.substring(0, 16)}...`);

      // Проверяем, не был ли уже импортирован этот набор данных (по хэшу)
      if (importSessionId) {
        const existingSession = await prisma.importSession.findFirst({
          where: {
            integrationId: integration.id,
            dataHash,
            status: { in: ['success', 'processed'] },
            id: { not: importSessionId },
          },
        });

        if (existingSession) {
          logger.info(
            `Данные с таким же хэшем уже были импортированы в сессии ${existingSession.id}, пропускаем`
          );
          return false;
        }

        // Обновляем сессию с хэшем
        await prisma.importSession.update({
          where: { id: importSessionId },
          data: { dataHash },
        });
      }

      // Получаем сумму выплаты
      const calculatedAmount = this.calculatePaymentAmount(cashFlowData);
      logger.info(
        `Рассчитанная сумма выплаты: ${calculatedAmount.toLocaleString('ru-RU')} RUB`
      );

      // Логируем детали расчета для диагностики
      if (
        cashFlowData.result.details &&
        cashFlowData.result.details.length > 0
      ) {
        const payment = cashFlowData.result.details[0]?.payments?.[0]?.payment;
        logger.debug(
          `   Payment из details: ${payment ? payment.toLocaleString('ru-RU') + ' RUB' : 'не найден'}`
        );
      }
      if (
        cashFlowData.result.cash_flows &&
        cashFlowData.result.cash_flows.length > 0
      ) {
        const cf = cashFlowData.result.cash_flows[0];
        logger.debug(`   Cash flow данные:`, {
          orders_amount: cf.orders_amount?.toLocaleString('ru-RU') || 0,
          services_amount: cf.services_amount?.toLocaleString('ru-RU') || 0,
          commission_amount: cf.commission_amount?.toLocaleString('ru-RU') || 0,
          returns_amount: cf.returns_amount?.toLocaleString('ru-RU') || 0,
        });
      }

      // Если сумма 0, нет необходимости создавать операцию
      if (calculatedAmount === 0) {
        logger.info(`Сумма 0, пропускаем создание операции`);
        return false;
      }

      // Проверяем, что payment < 0 для создания операции
      if (calculatedAmount >= 0) {
        logger.info(
          `Payment ${calculatedAmount.toLocaleString('ru-RU')} >= 0, пропускаем создание операции (создаем только при payment < 0)`
        );
        return false;
      }

      // Преобразуем сумму для операции и определяем тип
      const operationAmount = this.getOperationAmount(calculatedAmount);
      const operationType = this.getOperationType(calculatedAmount);

      logger.info(
        `Создаем операцию: ${operationType} на сумму ${operationAmount}`
      );

      // Генерируем описание для проверки дубликатов
      const formatDate = (date: Date) => date.toLocaleDateString('ru-RU');
      const operationDescription = this.generateOperationDescription(
        period.from,
        period.to,
        operationAmount,
        operationType,
        integration.paymentSchedule as 'next_week' | 'week_after'
      );

      // Улучшенная проверка дубликатов:
      // 1. По описанию (содержит "Ozon" и период)
      // 2. По параметрам операции (companyId, articleId, accountId)
      // 3. По дате операции (расширенный диапазон для учета даты выплаты)

      const existingOperation = await prisma.operation.findFirst({
        where: {
          companyId: integration.companyId,
          articleId: integration.articleId,
          accountId: integration.accountId,
          description: {
            contains: `Ozon`,
          },
          // Проверяем операции с похожим описанием (содержит период)
          OR: [
            {
              description: {
                contains: formatDate(period.from),
              },
            },
            {
              description: {
                contains: formatDate(period.to),
              },
            },
            // Также проверяем по дате операции (может быть вне периода запроса)
            {
              operationDate: {
                gte: new Date(period.from.getTime() - 7 * 24 * 60 * 60 * 1000), // За неделю до периода
                lte: new Date(period.to.getTime() + 14 * 24 * 60 * 60 * 1000), // До 2 недель после периода
              },
            },
          ],
        },
      });

      if (existingOperation) {
        logger.info(`Похожая операция уже существует: ${existingOperation.id}`);
        logger.debug(`   Детали существующей операции:`, {
          id: existingOperation.id,
          date: existingOperation.operationDate,
          amount: existingOperation.amount,
          description: existingOperation.description?.substring(0, 100),
        });
        return false;
      }

      logger.debug(`Дубликатов не найдено, продолжаем создание операции`);

      // Рассчитываем даты выплаты
      const paymentDates = this.calculatePaymentDates(
        period.to,
        integration.paymentSchedule as 'next_week' | 'week_after'
      );

      // Получаем валюту
      const currency =
        cashFlowData.result.details?.[0]?.payments?.[0]?.currency_code ||
        cashFlowData.result.cash_flows[0]?.currency_code ||
        'RUB';

      // Проверяем наличие обязательных полей
      if (!integration.articleId) {
        throw new AppError('Article ID is missing in integration', 400);
      }
      if (!integration.accountId) {
        throw new AppError('Account ID is missing in integration', 400);
      }

      // Получаем counterpartyId из статьи, если он есть
      const counterpartyId = integration.article?.counterpartyId || null;

      // Создаем операцию - явно указываем все поля
      const operationData = {
        type: operationType,
        operationDate: paymentDates.paymentDate,
        amount: operationAmount,
        currency,
        articleId: integration.articleId, // Явно указываем articleId
        accountId: integration.accountId, // Явно указываем accountId
        counterpartyId: counterpartyId, // Передаем counterpartyId из статьи
        description: operationDescription, // Используем уже сгенерированное описание
        isConfirmed: true,
      };

      logger.info(`Создаем операцию:`, {
        type: operationData.type,
        amount: operationData.amount,
        currency: operationData.currency,
        date: operationData.operationDate.toLocaleDateString('ru-RU'),
        articleId: operationData.articleId,
        article: integration.article?.name || 'N/A',
        counterpartyId: operationData.counterpartyId,
        counterparty: integration.article?.counterparty?.name || 'N/A',
        accountId: operationData.accountId,
        account: integration.account?.name || 'N/A',
      });

      // Явно указываем все поля при создании, не используем spread
      const createdOperation = await prisma.operation.create({
        data: {
          type: operationData.type,
          operationDate: operationData.operationDate,
          amount: operationData.amount,
          currency: operationData.currency,
          articleId: operationData.articleId, // Явно указываем articleId
          accountId: operationData.accountId, // Явно указываем accountId
          counterpartyId: operationData.counterpartyId, // Передаем counterpartyId из статьи
          description: operationData.description,
          isConfirmed: operationData.isConfirmed,
          companyId: integration.companyId,
        },
        include: {
          article: true,
          account: true,
          counterparty: true, // Включаем контрагента для проверки
        },
      });

      logger.info(`Операция успешно создана: ${createdOperation.id}`);

      if (!createdOperation.articleId) {
        logger.error(`   ВНИМАНИЕ: articleId не сохранился в операции!`);
      } else {
        logger.debug(`   Операция создана корректно со всеми полями`);
      }

      return true;
    } catch (error: any) {
      logger.error(
        ` Ошибка при создании операции для интеграции ${integration.id}:`,
        error
      );
      throw new AppError(
        `Failed to create Ozon operation: ${error.message}`,
        500
      );
    }
  }

  /**
   * Генерирует описание для операции
   */
  private generateOperationDescription(
    periodFrom: Date,
    periodTo: Date,
    amount: number,
    operationType: 'income' | 'expense',
    paymentSchedule: 'next_week' | 'week_after'
  ): string {
    const formatDate = (date: Date) => date.toLocaleDateString('ru-RU');
    const scheduleText =
      paymentSchedule === 'next_week'
        ? 'выплата на следующей неделе'
        : 'выплата через неделю';

    const typeText = operationType === 'income' ? 'доход' : 'расход';

    return `Ozon ${typeText} (${scheduleText}) за период ${formatDate(periodFrom)} - ${formatDate(periodTo)}. Сумма: ${amount.toLocaleString('ru-RU')} RUB`;
  }
}

export default new OzonOperationService();
