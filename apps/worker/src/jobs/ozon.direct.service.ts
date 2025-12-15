// apps/worker/src/jobs/ozon.direct.service.ts
// Прямой режим работы с БД и Ozon API (без использования API сервера)
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

interface OzonCashFlowResponse {
  result: {
    cash_flows: Array<{
      commission_amount: number;
      currency_code: string;
      orders_amount: number;
      returns_amount: number;
      services_amount: number;
    }>;
    details?: Array<{
      payments: Array<{
        payment: number;
        currency_code: string;
      }>;
    }>;
  };
}

export class OzonDirectService {
  /**
   * Получает все активные интеграции Ozon
   */
  async getActiveIntegrations() {
    return (prisma as any).integration.findMany({
      where: {
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
      const response = await fetch(
        'https://api-seller.ozon.ru/v1/finance/cash-flow-statement/list',
        {
          method: 'POST',
          headers: {
            'Client-Id': clientKey,
            'Api-Key': apiKey,
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
        throw new Error(
          `Ozon API error: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as OzonCashFlowResponse;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Рассчитывает сумму выплаты
   */
  calculatePaymentAmount(cashFlowData: OzonCashFlowResponse): number {
    if (!cashFlowData.result.cash_flows.length) {
      return 0;
    }

    // Смотрим на поле payment в details
    const details = cashFlowData.result.details;
    if (details && details.length > 0) {
      const payments = details[0]?.payments;
      if (payments && payments.length > 0) {
        return payments[0].payment || 0;
      }
    }

    // Fallback расчет
    const cashFlow = cashFlowData.result.cash_flows[0];
    return (
      cashFlow.orders_amount +
      cashFlow.services_amount -
      cashFlow.commission_amount -
      Math.abs(cashFlow.returns_amount)
    );
  }

  /**
   * Получает период для запроса данных
   */
  getQueryPeriod(paymentSchedule: 'next_week' | 'week_after'): {
    from: Date;
    to: Date;
  } {
    const now = new Date();

    if (paymentSchedule === 'next_week') {
      // Для "next_week" - текущая неделя
      const to = new Date(now);
      if (now.getDay() === 0) {
        to.setDate(now.getDate());
      } else {
        to.setDate(now.getDate() - now.getDay());
      }
      to.setHours(23, 59, 59, 999);

      const from = new Date(to);
      from.setDate(to.getDate() - 6);
      from.setHours(0, 0, 0, 0);

      return { from, to };
    } else {
      // Для "week_after" - прошлая неделя
      const to = new Date(now);
      if (now.getDay() === 0) {
        to.setDate(now.getDate() - 7);
      } else {
        to.setDate(now.getDate() - now.getDay() - 7);
      }
      to.setHours(23, 59, 59, 999);

      const from = new Date(to);
      from.setDate(to.getDate() - 6);
      from.setHours(0, 0, 0, 0);

      return { from, to };
    }
  }

  /**
   * Рассчитывает даты для графика выплат
   */
  calculatePaymentDates(
    periodEndDate: Date,
    paymentSchedule: 'next_week' | 'week_after'
  ): { calculationDate: Date; paymentDate: Date } {
    const periodEnd = new Date(periodEndDate);
    const baseCalculationDate = new Date(periodEnd);
    baseCalculationDate.setDate(
      periodEnd.getDate() + ((8 - periodEnd.getDay()) % 7) || 7
    );

    if (paymentSchedule === 'next_week') {
      const paymentDate = new Date(baseCalculationDate);
      paymentDate.setDate(baseCalculationDate.getDate() + 2); // +2 дня = среда
      return { calculationDate: baseCalculationDate, paymentDate };
    } else {
      const calculationDate = new Date(baseCalculationDate);
      calculationDate.setDate(baseCalculationDate.getDate() + 7);
      const paymentDate = new Date(calculationDate);
      paymentDate.setDate(calculationDate.getDate() + 2); // +2 дня = среда
      return { calculationDate, paymentDate };
    }
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

    logger.info(`🔍 Найдено активных интеграций Ozon: ${integrations.length}`);

    if (integrations.length === 0) {
      logger.info('ℹ️  Активных интеграций не найдено, операций не создано');
      return results;
    }

    logger.info('═══════════════════════════════════════════════════════');
    logger.info('🔄 Начинаем обработку интеграций (прямой режим)...');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info(
      `⏰ Время начала обработки: ${new Date().toLocaleString('ru-RU')}`
    );
    logger.info('');

    for (let i = 0; i < integrations.length; i++) {
      const integration = integrations[i];
      const integrationStartTime = Date.now();

      logger.info('');
      logger.info('═══════════════════════════════════════════════════════');
      logger.info(`📦 ИНТЕГРАЦИЯ [${i + 1}/${integrations.length}]`);
      logger.info('═══════════════════════════════════════════════════════');
      logger.info(`   ID интеграции: ${integration.id}`);
      logger.info(`   Компания: ${integration.company.name}`);
      logger.info(`   График выплат: ${integration.paymentSchedule}`);
      logger.info(
        `   ⏰ Время начала обработки: ${new Date().toLocaleString('ru-RU')}`
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
            `   ✅ ИТОГ: Операция успешно создана для интеграции ${integration.id}`
          );
          logger.info(
            `   ⏱️  Время обработки интеграции: ${integrationDuration} сек`
          );
        } else {
          logger.info('');
          logger.info(
            `   ⏭️  ИТОГ: Операция не создана (сумма 0, payment >= 0 или дубликат)`
          );
          logger.info(
            `   ⏱️  Время обработки интеграции: ${integrationDuration} сек`
          );
        }
      } catch (error: any) {
        const integrationDuration = (
          (Date.now() - integrationStartTime) /
          1000
        ).toFixed(2);
        const errorMsg = `Integration ${integration.id}: ${error.message}`;
        logger.error('');
        logger.error(`   ❌ ИТОГ: Ошибка при обработке интеграции`);
        logger.error(`   ⏱️  Время до ошибки: ${integrationDuration} сек`);
        logger.error(`   📝 Сообщение: ${errorMsg}`);
        results.errors.push(errorMsg);
      }

      logger.info('═══════════════════════════════════════════════════════');
    }

    logger.info('\n═══════════════════════════════════════════════════════');
    logger.info('📊 ИТОГИ ОБРАБОТКИ ИНТЕГРАЦИЙ');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info(`✅ Успешно создано операций: ${results.created}`);
    logger.info(`❌ Ошибок: ${results.errors.length}`);
    logger.info('═══════════════════════════════════════════════════════\n');

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
      `   ┌─────────────────────────────────────────────────────────`
    );
    logger.info(`   │ 🚀 НАЧАЛО СОЗДАНИЯ ОПЕРАЦИИ`);
    logger.info(
      `   └─────────────────────────────────────────────────────────`
    );
    logger.info(
      `   📅 Период запроса: ${period.from.toLocaleDateString('ru-RU')} - ${period.to.toLocaleDateString('ru-RU')}`
    );
    logger.info(`   📋 Статья ID: ${integration.articleId || 'ОТСУТСТВУЕТ!'}`);
    logger.info(`   📋 Счет ID: ${integration.accountId || 'ОТСУТСТВУЕТ!'}`);

    try {
      logger.info(`   🔍 Шаг 1/7: Проверка обязательных полей...`);
      if (!integration.articleId) {
        throw new Error('Article ID is missing in integration');
      }
      if (!integration.accountId) {
        throw new Error('Account ID is missing in integration');
      }
      logger.info(`   ✅ Обязательные поля присутствуют`);

      logger.info(`   🔍 Шаг 2/7: Форматирование дат для Ozon API...`);
      const fromISO = period.from.toISOString();
      const toISO = period.to.toISOString();
      logger.info(`   ✅ Даты отформатированы: ${fromISO} → ${toISO}`);

      logger.info(`   🔍 Шаг 3/7: Запрос данных из Ozon API...`);
      logger.info(`   🌐 Отправляем запрос к Ozon API...`);
      const apiStartTime = Date.now();
      const cashFlowData = await this.getCashFlowStatement(
        integration.clientKey,
        integration.apiKey,
        fromISO,
        toISO
      );
      const apiDuration = ((Date.now() - apiStartTime) / 1000).toFixed(2);
      logger.info(
        `   ✅ Данные получены из Ozon API (время: ${apiDuration} сек)`
      );
      logger.info(
        `   📊 Получено записей cash_flows: ${cashFlowData.result.cash_flows?.length || 0}`
      );
      logger.info(
        `   📊 Получено записей details: ${cashFlowData.result.details?.length || 0}`
      );

      logger.info(`   🔍 Шаг 4/7: Расчет суммы выплаты...`);
      const calculatedAmount = this.calculatePaymentAmount(cashFlowData);
      logger.info(
        `   💰 Рассчитанная сумма выплаты: ${calculatedAmount.toLocaleString('ru-RU')} RUB`
      );

      if (calculatedAmount === 0) {
        logger.info(`   ⏭️  Сумма 0, пропускаем создание операции`);
        logger.info(
          `   ┌─────────────────────────────────────────────────────────`
        );
        logger.info(`   │ ⏹️  СОЗДАНИЕ ОПЕРАЦИИ ПРЕРВАНО (сумма = 0)`);
        logger.info(
          `   └─────────────────────────────────────────────────────────`
        );
        return false;
      }

      if (calculatedAmount >= 0) {
        logger.info(
          `   ⏭️  Payment ${calculatedAmount.toLocaleString('ru-RU')} >= 0, пропускаем создание операции`
        );
        logger.info(`   💡 Создаем операции только при payment < 0`);
        logger.info(
          `   ┌─────────────────────────────────────────────────────────`
        );
        logger.info(`   │ ⏹️  СОЗДАНИЕ ОПЕРАЦИИ ПРЕРВАНО (payment >= 0)`);
        logger.info(
          `   └─────────────────────────────────────────────────────────`
        );
        return false;
      }

      logger.info(`   🔍 Шаг 5/7: Подготовка данных операции...`);
      const operationAmount = Math.abs(calculatedAmount);
      const operationType = 'expense';
      logger.info(`   ✅ Тип операции: ${operationType}`);
      logger.info(
        `   ✅ Сумма операции: ${operationAmount.toLocaleString('ru-RU')} RUB`
      );

      logger.info(`   🔍 Шаг 6/7: Проверка на дубликаты...`);
      const duplicateCheckStartTime = Date.now();
      const existingOperation = await prisma.operation.findFirst({
        where: {
          companyId: integration.companyId,
          articleId: integration.articleId,
          accountId: integration.accountId,
          operationDate: {
            gte: period.from,
            lte: period.to,
          },
          description: {
            contains: `Ozon выплата`,
          },
        },
      });
      const duplicateCheckDuration = (
        (Date.now() - duplicateCheckStartTime) /
        1000
      ).toFixed(2);

      if (existingOperation) {
        logger.info(
          `   ⏭️  Операция за этот период уже существует: ${existingOperation.id}`
        );
        logger.info(
          `   ┌─────────────────────────────────────────────────────────`
        );
        logger.info(`   │ ⏹️  СОЗДАНИЕ ОПЕРАЦИИ ПРЕРВАНО (дубликат найден)`);
        logger.info(
          `   └─────────────────────────────────────────────────────────`
        );
        return false;
      }
      logger.info(
        `   ✅ Дубликатов не найдено (проверка заняла ${duplicateCheckDuration} сек)`
      );

      logger.info(`   🔍 Шаг 7/7: Расчет дат и создание операции...`);
      const paymentDates = this.calculatePaymentDates(
        period.to,
        integration.paymentSchedule as 'next_week' | 'week_after'
      );
      logger.info(
        `   📆 Дата выплаты: ${paymentDates.paymentDate.toLocaleDateString('ru-RU')}`
      );

      const currency =
        cashFlowData.result.details?.[0]?.payments?.[0]?.currency_code ||
        cashFlowData.result.cash_flows[0]?.currency_code ||
        'RUB';
      logger.info(`   💱 Валюта: ${currency}`);

      const formatDate = (date: Date) => date.toLocaleDateString('ru-RU');
      const scheduleText =
        integration.paymentSchedule === 'next_week'
          ? 'выплата на следующей неделе'
          : 'выплата через неделю';
      const description = `Ozon расход (${scheduleText}) за период ${formatDate(period.from)} - ${formatDate(period.to)}. Сумма: ${operationAmount.toLocaleString('ru-RU')} RUB`;
      logger.info(`   📝 Описание: ${description}`);
      const operationData = {
        type: operationType,
        operationDate: paymentDates.paymentDate,
        amount: operationAmount,
        currency,
        articleId: integration.articleId,
        accountId: integration.accountId,
        description,
        isConfirmed: true,
        companyId: integration.companyId,
      };
      logger.info(`   💾 Сохраняем операцию в базу данных...`);
      logger.info(`   📦 Данные операции:`);
      logger.info(`      - type: ${operationData.type}`);
      logger.info(
        `      - amount: ${operationData.amount} ${operationData.currency}`
      );
      logger.info(
        `      - operationDate: ${operationData.operationDate.toLocaleDateString('ru-RU')}`
      );
      logger.info(`      - articleId: ${operationData.articleId}`);
      logger.info(`      - accountId: ${operationData.accountId}`);
      logger.info(`      - companyId: ${operationData.companyId}`);

      const dbStartTime = Date.now();
      const createdOperation = await prisma.operation.create({
        data: operationData,
        include: {
          article: true,
          account: true,
        },
      });
      const dbDuration = ((Date.now() - dbStartTime) / 1000).toFixed(2);
      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.info(
        `   ✅ Операция сохранена в БД (время сохранения: ${dbDuration} сек)`
      );
      logger.info(
        `   ┌─────────────────────────────────────────────────────────`
      );
      logger.info(`   │ ✅ ОПЕРАЦИЯ УСПЕШНО СОЗДАНА`);
      logger.info(
        `   └─────────────────────────────────────────────────────────`
      );
      logger.info(`   📋 Детали созданной операции:`);
      logger.info(
        `      ┌─────────────────────────────────────────────────────`
      );
      logger.info(`      │ ID операции: ${createdOperation.id}`);
      logger.info(`      │ Тип: ${createdOperation.type}`);
      logger.info(
        `      │ Сумма: ${createdOperation.amount.toLocaleString('ru-RU')} ${createdOperation.currency}`
      );
      logger.info(
        `      │ Дата операции: ${createdOperation.operationDate.toLocaleDateString('ru-RU')}`
      );
      logger.info(
        `      │ ───────────────────────────────────────────────────`
      );
      logger.info(
        `      │ Статья ID: ${createdOperation.articleId || '❌ ОТСУТСТВУЕТ!'}`
      );
      logger.info(`      │ Статья: ${createdOperation.article?.name || 'N/A'}`);
      logger.info(
        `      │ ───────────────────────────────────────────────────`
      );
      logger.info(
        `      │ Счет ID: ${createdOperation.accountId || '❌ ОТСУТСТВУЕТ!'}`
      );
      logger.info(`      │ Счет: ${createdOperation.account?.name || 'N/A'}`);
      logger.info(
        `      │ ───────────────────────────────────────────────────`
      );
      logger.info(`      │ Компания ID: ${createdOperation.companyId}`);
      logger.info(`      │ Описание: ${createdOperation.description}`);
      logger.info(
        `      └─────────────────────────────────────────────────────`
      );
      logger.info(`   ⏱️  Общее время создания: ${totalDuration} сек`);
      logger.info(
        `   ┌─────────────────────────────────────────────────────────`
      );
      logger.info(`   │ 🎉 ПРОЦЕСС СОЗДАНИЯ ОПЕРАЦИИ ЗАВЕРШЕН`);
      logger.info(
        `   └─────────────────────────────────────────────────────────`
      );

      if (!createdOperation.articleId) {
        logger.error(
          `   ❌ КРИТИЧЕСКАЯ ОШИБКА: articleId не сохранился в операции!`
        );
      } else if (!createdOperation.accountId) {
        logger.error(
          `   ❌ КРИТИЧЕСКАЯ ОШИБКА: accountId не сохранился в операции!`
        );
      } else {
        logger.info(`   ✅ Все поля операции сохранены корректно`);
      }

      return true;
    } catch (error: any) {
      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error(
        `   ┌─────────────────────────────────────────────────────────`
      );
      logger.error(`   │ ❌ ОШИБКА ПРИ СОЗДАНИИ ОПЕРАЦИИ`);
      logger.error(
        `   └─────────────────────────────────────────────────────────`
      );
      logger.error(`   ⏱️  Время до ошибки: ${totalDuration} сек`);
      logger.error(`   📝 Сообщение: ${error.message}`);
      logger.error(`   🔍 Интеграция ID: ${integration.id}`);
      if (error.stack) {
        logger.error(`   📚 Stack trace:`, error.stack);
      }
      throw error;
    }
  }
}

export const ozonDirectService = new OzonDirectService();
