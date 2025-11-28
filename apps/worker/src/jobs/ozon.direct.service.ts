// apps/worker/src/jobs/ozon.direct.service.ts
// Прямой режим работы с БД и Ozon API (без использования API сервера)
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { decrypt } from '../utils/encryption';
import {
  getOzonQueryPeriod,
  calculateOzonPaymentDates,
  calculateOzonPaymentAmount,
  type OzonCashFlowResponse,
} from '@fin-u-ch/shared';

export class OzonDirectService {
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
   * Получает данные о денежных потоках из Ozon API
   */
  async getCashFlowStatement(
    clientKey: string,
    apiKey: string,
    dateFrom: string,
    dateTo: string
  ): Promise<OzonCashFlowResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Обрезаем пробелы в ключах (как в валидации)
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
        // Получаем тело ответа для диагностики
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

        throw new Error(
          `Ozon API error: ${response.status} ${response.statusText}${errorBody?.message ? ` - ${errorBody.message}` : ''}${typeof errorBody === 'string' ? ` - ${errorBody}` : ''}`
        );
      }

      return (await response.json()) as OzonCashFlowResponse;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Рассчитывает сумму выплаты (использует общую функцию из shared)
   */
  calculatePaymentAmount(cashFlowData: OzonCashFlowResponse): number {
    return calculateOzonPaymentAmount(cashFlowData);
  }

  /**
   * Получает период для запроса данных (использует общую функцию из shared)
   */
  getQueryPeriod(paymentSchedule: 'next_week' | 'week_after'): {
    from: Date;
    to: Date;
  } {
    return getOzonQueryPeriod(paymentSchedule);
  }

  /**
   * Рассчитывает даты для графика выплат (использует общую функцию из shared)
   */
  calculatePaymentDates(
    periodEndDate: Date,
    paymentSchedule: 'next_week' | 'week_after'
  ): { calculationDate: Date; paymentDate: Date } {
    return calculateOzonPaymentDates(periodEndDate, paymentSchedule);
  }

  /**
   * Создает операции для всех активных интеграций Ozon (прямой режим)
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

    logger.info(` Найдено активных интеграций Ozon: ${integrations.length}`);

    if (integrations.length === 0) {
      logger.info('ℹ  Активных интеграций не найдено, операций не создано');
      return results;
    }

    logger.info(' Начинаем обработку интеграций (прямой режим)...');
    logger.info(
      ` Время начала обработки: ${new Date().toLocaleString('ru-RU')}`
    );
    logger.info('');

    for (let i = 0; i < integrations.length; i++) {
      const integration = integrations[i];
      const integrationStartTime = Date.now();

      logger.info(` ИНТЕГРАЦИЯ [${i + 1}/${integrations.length}]`);
      logger.info(`   ID интеграции: ${integration.id}`);
      logger.info(`   Компания: ${integration.company.name}`);
      logger.info(`   График выплат: ${integration.paymentSchedule}`);
      logger.info(
        `    Время начала обработки: ${new Date().toLocaleString('ru-RU')}`
      );
      logger.info('');

      try {
        const period = this.getQueryPeriod(
          integration.paymentSchedule as 'next_week' | 'week_after'
        );
        const created = await this.createOperationForIntegration(
          integration,
          period
        );

        const integrationDuration = (
          (Date.now() - integrationStartTime) /
          1000
        ).toFixed(2);

        if (created) {
          results.created++;
          logger.info('');
          logger.info(
            `    ИТОГ: Операция успешно создана для интеграции ${integration.id}`
          );
          logger.info(
            `     Время обработки интеграции: ${integrationDuration} сек`
          );
        } else {
          logger.info('');
          logger.info(
            `     ИТОГ: Операция не создана (сумма 0, payment >= 0 или дубликат)`
          );
          logger.info(
            `     Время обработки интеграции: ${integrationDuration} сек`
          );
        }
      } catch (error: any) {
        const integrationDuration = (
          (Date.now() - integrationStartTime) /
          1000
        ).toFixed(2);
        const errorMsg = `Integration ${integration.id}: ${error.message}`;
        logger.error('');
        logger.error(`    ИТОГ: Ошибка при обработке интеграции: ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    logger.info(` Успешно создано операций: ${results.created}`);
    logger.info(` Ошибок: ${results.errors.length}`);

    return results;
  }

  /**
   * Создает операцию для конкретной интеграции
   */
  async createOperationForIntegration(
    integration: any,
    period: { from: Date; to: Date }
  ): Promise<boolean> {
    const startTime = Date.now();

    logger.info(
      `    Период запроса: ${period.from.toLocaleDateString('ru-RU')} - ${period.to.toLocaleDateString('ru-RU')}`
    );
    logger.info(`    Статья ID: ${integration.articleId || 'ОТСУТСТВУЕТ!'}`);
    logger.info(
      `    Контрагент ID: ${integration.article?.counterpartyId || 'НЕ УКАЗАН'}`
    );
    logger.info(`    Счет ID: ${integration.accountId || 'ОТСУТСТВУЕТ!'}`);

    try {
      logger.info(`    Шаг 1/7: Проверка обязательных полей...`);
      if (!integration.articleId) {
        throw new Error('Article ID is missing in integration');
      }
      if (!integration.accountId) {
        throw new Error('Account ID is missing in integration');
      }
      logger.info(`    Обязательные поля присутствуют`);

      logger.info(`    Шаг 2/7: Форматирование дат для Ozon API...`);
      const fromISO = period.from.toISOString();
      const toISO = period.to.toISOString();
      logger.info(`    Даты отформатированы: ${fromISO} → ${toISO}`);

      logger.info(`    Шаг 3/7: Запрос данных из Ozon API...`);
      logger.info(`    Отправляем запрос к Ozon API...`);
      const apiStartTime = Date.now();
      // Расшифровываем apiKey перед использованием
      let decryptedApiKey: string;
      try {
        // Логируем исходное значение для диагностики (первые символы)
        const originalApiKeyPreview = integration.apiKey
          ? `${integration.apiKey.substring(0, 20)}...`
          : 'missing';
        logger.info(
          `    Исходный apiKey (первые 20 символов): ${originalApiKeyPreview}`
        );
        logger.info(
          `    Длина исходного apiKey: ${integration.apiKey?.length || 0}`
        );

        decryptedApiKey = decrypt(integration.apiKey);

        // КРИТИЧЕСКАЯ ПРОВЕРКА: расшифрованное значение не должно быть равно исходному
        if (decryptedApiKey === integration.apiKey) {
          logger.error(
            `    КРИТИЧЕСКОЕ: Расшифрованное значение равно исходному!`
          );
          logger.error(`    Это означает, что расшифровка не удалась`);
          logger.error(`    apiKey был зашифрован другим ENCRYPTION_KEY`);
          logger.error(
            `    Пересоздайте интеграцию через форму, введя apiKey заново`
          );
          throw new Error(
            'Не удалось расшифровать apiKey (расшифрованное значение равно исходному). Пересоздайте интеграцию через форму.'
          );
        }

        // Проверяем, что расшифрованное значение выглядит как валидный API ключ
        // Зашифрованное значение имеет формат "iv:salt:tag:encrypted" (4 части через :)
        // Реальный API ключ не содержит двоеточий и имеет другую длину
        const isEncryptedFormat = decryptedApiKey.split(':').length === 4;
        if (isEncryptedFormat) {
          logger.error(
            `    Не удалось расшифровать apiKey (вернуто зашифрованное значение)`
          );
          logger.error(
            `    Расшифрованное значение имеет формат зашифрованного: ${decryptedApiKey.substring(0, 50)}...`
          );
          logger.error(`    apiKey был зашифрован другим ENCRYPTION_KEY`);
          logger.error(
            `    Пересоздайте интеграцию через форму, введя apiKey заново`
          );
          throw new Error(
            'Не удалось расшифровать apiKey (вернуто зашифрованное значение). Пересоздайте интеграцию через форму.'
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
            `    Расшифрованный apiKey выглядит некорректно (длина: ${decryptedApiKey.length})`
          );
          logger.error(
            `    Пересоздайте интеграцию через форму, введя apiKey заново`
          );
          throw new Error(
            'Расшифрованный apiKey выглядит некорректно. Пересоздайте интеграцию через форму.'
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
            `     Предупреждение: apiKey выглядит как base64 строка, возможно это зашифрованное значение`
          );
        }

        logger.info(
          `    apiKey успешно расшифрован (длина: ${decryptedApiKey.length})`
        );
        logger.info(
          `    Первые 8 символов расшифрованного apiKey: ${decryptedApiKey.substring(0, 8)}...`
        );
      } catch (error: any) {
        logger.error(`    Ошибка при расшифровке apiKey: ${error.message}`);
        logger.error(`    apiKey был зашифрован другим ENCRYPTION_KEY`);
        logger.error(
          `    Пересоздайте интеграцию через форму, введя apiKey заново`
        );
        throw new Error(
          `Ошибка расшифровки apiKey: ${error.message}. Пересоздайте интеграцию через форму.`
        );
      }

      // Обрезаем пробелы в ключах перед отправкой (как в валидации)
      const trimmedClientKey = integration.clientKey.trim();
      const trimmedApiKey = decryptedApiKey.trim();

      logger.info(`    Параметры запроса:`, {
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
      const apiDuration = ((Date.now() - apiStartTime) / 1000).toFixed(2);
      logger.info(
        `    Данные получены из Ozon API (время: ${apiDuration} сек)`
      );
      logger.info(
        `    Получено записей cash_flows: ${cashFlowData.result.cash_flows?.length || 0}`
      );
      logger.info(
        `    Получено записей details: ${cashFlowData.result.details?.length || 0}`
      );

      logger.info(`    Шаг 4/7: Расчет суммы выплаты...`);
      const calculatedAmount = this.calculatePaymentAmount(cashFlowData);
      logger.info(
        `    Рассчитанная сумма выплаты: ${calculatedAmount.toLocaleString('ru-RU')} RUB`
      );

      if (calculatedAmount === 0) {
        logger.info(`     Сумма 0, пропускаем создание операции`);
        logger.info(`   │   СОЗДАНИЕ ОПЕРАЦИИ ПРЕРВАНО (сумма = 0)`);
        return false;
      }

      if (calculatedAmount >= 0) {
        logger.info(
          `     Payment ${calculatedAmount.toLocaleString('ru-RU')} >= 0, пропускаем создание операции`
        );
        logger.info(`    Создаем операции только при payment < 0`);

        logger.info(`   │   СОЗДАНИЕ ОПЕРАЦИИ ПРЕРВАНО (payment >= 0)`);

        return false;
      }

      logger.info(`    Шаг 5/7: Подготовка данных операции...`);
      const operationAmount = Math.abs(calculatedAmount);
      const operationType = 'expense';
      logger.info(`    Тип операции: ${operationType}`);
      logger.info(
        `    Сумма операции: ${operationAmount.toLocaleString('ru-RU')} RUB`
      );

      logger.info(`   🔍 Шаг 6/7: Проверка на дубликаты...`);
      const duplicateCheckStartTime = Date.now();

      // Генерируем описание для проверки дубликатов
      const formatDate = (date: Date) => date.toLocaleDateString('ru-RU');
      const scheduleText =
        integration.paymentSchedule === 'next_week'
          ? 'выплата на следующей неделе'
          : 'выплата через неделю';
      const operationDescription = `Ozon расход (${scheduleText}) за период ${formatDate(period.from)} - ${formatDate(period.to)}. Сумма: ${operationAmount.toLocaleString('ru-RU')} RUB`;

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
            // Проверяем по дате операции (может быть вне периода запроса)
            {
              operationDate: {
                gte: new Date(period.from.getTime() - 7 * 24 * 60 * 60 * 1000), // За неделю до периода
                lte: new Date(period.to.getTime() + 14 * 24 * 60 * 60 * 1000), // До 2 недель после периода
              },
            },
          ],
        },
      });
      const duplicateCheckDuration = (
        (Date.now() - duplicateCheckStartTime) /
        1000
      ).toFixed(2);

      if (existingOperation) {
        logger.info(
          `     Похожая операция уже существует: ${existingOperation.id}`
        );

        logger.info(`   │   СОЗДАНИЕ ОПЕРАЦИИ ПРЕРВАНО (дубликат найден)`);

        return false;
      }
      logger.info(
        `    Дубликатов не найдено (проверка заняла ${duplicateCheckDuration} сек)`
      );

      logger.info(`   🔍 Шаг 7/7: Расчет дат и создание операции...`);
      const paymentDates = this.calculatePaymentDates(
        period.to,
        integration.paymentSchedule as 'next_week' | 'week_after'
      );
      logger.info(
        `    Дата выплаты: ${paymentDates.paymentDate.toLocaleDateString('ru-RU')}`
      );

      const currency =
        cashFlowData.result.details?.[0]?.payments?.[0]?.currency_code ||
        cashFlowData.result.cash_flows[0]?.currency_code ||
        'RUB';
      logger.info(`    Валюта: ${currency}`);

      // Используем уже сгенерированное описание
      logger.info(`    Описание: ${operationDescription}`);

      // Получаем counterpartyId из статьи, если он есть
      const counterpartyId = integration.article?.counterpartyId || null;

      const operationData = {
        type: operationType,
        operationDate: paymentDates.paymentDate,
        amount: operationAmount,
        currency,
        articleId: integration.articleId,
        accountId: integration.accountId,
        counterpartyId: counterpartyId, // Передаем counterpartyId из статьи
        description: operationDescription,
        isConfirmed: true,
        companyId: integration.companyId,
      };
      logger.info(`    Сохраняем операцию в базу данных...`);
      logger.info(`    Данные операции:`);
      logger.info(`      - type: ${operationData.type}`);
      logger.info(
        `      - amount: ${operationData.amount} ${operationData.currency}`
      );
      logger.info(
        `      - operationDate: ${operationData.operationDate.toLocaleDateString('ru-RU')}`
      );
      logger.info(`      - articleId: ${operationData.articleId}`);
      logger.info(
        `      - counterpartyId: ${operationData.counterpartyId || 'НЕ УКАЗАН'}`
      );
      logger.info(`      - accountId: ${operationData.accountId}`);
      logger.info(`      - companyId: ${operationData.companyId}`);

      const dbStartTime = Date.now();
      const createdOperation = await prisma.operation.create({
        data: operationData,
        include: {
          article: true,
          account: true,
          counterparty: true, // Включаем контрагента для проверки
        },
      });
      const dbDuration = ((Date.now() - dbStartTime) / 1000).toFixed(2);
      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.info(
        `    Операция сохранена в БД (время сохранения: ${dbDuration} сек)`
      );

      logger.info(`   │  ОПЕРАЦИЯ УСПЕШНО СОЗДАНА`);

      logger.info(`    Детали созданной операции:`);

      logger.info(`      │ ID операции: ${createdOperation.id}`);
      logger.info(`      │ Тип: ${createdOperation.type}`);
      logger.info(
        `      │ Сумма: ${createdOperation.amount.toLocaleString('ru-RU')} ${createdOperation.currency}`
      );
      logger.info(
        `      │ Дата операции: ${createdOperation.operationDate.toLocaleDateString('ru-RU')}`
      );

      logger.info(
        `      │ Статья ID: ${createdOperation.articleId || ' ОТСУТСТВУЕТ!'}`
      );
      logger.info(`      │ Статья: ${createdOperation.article?.name || 'N/A'}`);

      logger.info(
        `      │ Контрагент ID: ${createdOperation.counterpartyId || 'НЕ УКАЗАН'}`
      );
      logger.info(
        `      │ Контрагент: ${createdOperation.counterparty?.name || 'N/A'}`
      );
      logger.info(
        `      │ ───────────────────────────────────────────────────`
      );
      logger.info(
        `      │ Счет ID: ${createdOperation.accountId || ' ОТСУТСТВУЕТ!'}`
      );
      logger.info(`      │ Счет: ${createdOperation.account?.name || 'N/A'}`);
      logger.info(
        `      │ ───────────────────────────────────────────────────`
      );
      logger.info(`      │ Компания ID: ${createdOperation.companyId}`);
      logger.info(`      │ Описание: ${createdOperation.description}`);

      logger.info(`     Общее время создания: ${totalDuration} сек`);

      logger.info(`   │  ПРОЦЕСС СОЗДАНИЯ ОПЕРАЦИИ ЗАВЕРШЕН`);

      if (!createdOperation.articleId) {
        logger.error(
          `    КРИТИЧЕСКАЯ ОШИБКА: articleId не сохранился в операции!`
        );
      } else if (!createdOperation.accountId) {
        logger.error(
          `    КРИТИЧЕСКАЯ ОШИБКА: accountId не сохранился в операции!`
        );
      } else {
        logger.info(`    Все поля операции сохранены корректно`);
      }

      return true;
    } catch (error: any) {
      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.error(`   │  ОШИБКА ПРИ СОЗДАНИИ ОПЕРАЦИИ`);

      logger.error(`     Время до ошибки: ${totalDuration} сек`);
      logger.error(`    Сообщение: ${error.message}`);
      logger.error(`    Интеграция ID: ${integration.id}`);
      if (error.stack) {
        logger.error(`    Stack trace:`, error.stack);
      }
      throw error;
    }
  }
}

export const ozonDirectService = new OzonDirectService();
