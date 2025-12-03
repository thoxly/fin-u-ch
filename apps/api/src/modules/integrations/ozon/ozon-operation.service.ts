// apps/api/src/modules/integrations/ozon/ozon-operation.service.ts
import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';
import logger from '../../../config/logger';

interface OzonCashFlowResponse {
  result: {
    cash_flows: Array<{
      commission_amount: number;
      currency_code: string;
      item_delivery_and_return_amount: number;
      orders_amount: number;
      period: {
        begin: string;
        end: string;
        id: number;
      };
      returns_amount: number;
      services_amount: number;
    }>;
    details?: Array<{
      period: {
        begin: string;
        end: string;
        id: number;
      };
      payments: Array<{
        payment: number;
        currency_code: string;
      }>;
      begin_balance_amount: number;
      delivery: {
        total: number;
        amount: number;
        delivery_services: {
          total: number;
          items: Array<{
            name: string;
            price: number;
          }>;
        };
      };
      return: {
        total: number;
        amount: number;
        return_services: {
          total: number;
          items: Array<{
            name: string;
            price: number;
          }>;
        };
      };
      loan: number;
      invoice_transfer: number;
      rfbs: {
        total: number;
        transfer_delivery: number;
        transfer_delivery_return: number;
        compensation_delivery_return: number;
        partial_compensation: number;
        partial_compensation_return: number;
      };
      services: {
        total: number;
        items: Array<{
          name: string;
          price: number;
        }>;
      };
      others: {
        total: number;
        items: Array<{
          name: string;
          price: number;
        }>;
      };
      end_balance_amount: number;
    }>;
  };
  page_count: number;
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
    logger.debug('Fetching cash flow statement from Ozon API', {
      dateFrom,
      dateTo,
      clientKey: clientKey.substring(0, 8) + '...', // Частично скрываем ключ
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const startTime = Date.now();

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
      const duration = Date.now() - startTime;

      if (!response.ok) {
        logger.error('Ozon API error', {
          status: response.status,
          statusText: response.statusText,
          dateFrom,
          dateTo,
          duration: `${duration}ms`,
        });
        throw new AppError(
          `Ozon API error: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const data = (await response.json()) as OzonCashFlowResponse;

      logger.info('Cash flow statement fetched from Ozon API successfully', {
        dateFrom,
        dateTo,
        duration: `${duration}ms`,
        cashFlowsCount: data.result?.cash_flows?.length || 0,
      });

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (error.name === 'AbortError') {
        logger.error('Ozon API timeout', {
          dateFrom,
          dateTo,
          duration: `${duration}ms`,
        });
        throw new AppError('Таймаут подключения к Ozon API', 408);
      } else if (error instanceof AppError) {
        logger.error('Ozon API error', {
          dateFrom,
          dateTo,
          error: error.message,
          statusCode: error.statusCode,
          duration: `${duration}ms`,
        });
        throw error;
      }

      logger.error('Ozon API connection error', {
        dateFrom,
        dateTo,
        error: error.message,
        duration: `${duration}ms`,
        stack: error.stack,
      });

      throw new AppError(
        `Ошибка подключения к Ozon API: ${error.message}`,
        500
      );
    }
  }

  /**
   * Рассчитывает сумму выплаты
   */
  calculatePaymentAmount(cashFlowData: OzonCashFlowResponse): number {
    if (!cashFlowData.result.cash_flows.length) {
      logger.warn('No cash_flows data in Ozon API response');
      return 0;
    }

    // Смотрим на поле payment в details
    const details = cashFlowData.result.details;
    if (details && details.length > 0) {
      const payments = details[0]?.payments;
      if (payments && payments.length > 0) {
        const payment = payments[0];
        logger.debug('Payment amount from Ozon API', {
          payment: payment.payment,
          currency: payment.currency_code,
        });
        return payment.payment || 0;
      }
    }

    // Fallback логика
    logger.debug('Payment field not found, using calculated amount');
    const cashFlow = cashFlowData.result.cash_flows[0];
    const calculatedAmount =
      cashFlow.orders_amount +
      cashFlow.services_amount -
      cashFlow.commission_amount -
      Math.abs(cashFlow.returns_amount);

    logger.debug('Calculated payment amount', {
      calculatedAmount,
      ordersAmount: cashFlow.orders_amount,
      servicesAmount: cashFlow.services_amount,
      commissionAmount: cashFlow.commission_amount,
      returnsAmount: cashFlow.returns_amount,
    });

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
   * Получает период за прошлую неделю
   */
  getLastWeekPeriod(): { from: Date; to: Date } {
    const now = new Date();
    const lastSunday = new Date(now);
    // Находим воскресенье прошлой недели
    if (now.getDay() === 0) {
      // Если сегодня воскресенье, то прошлое воскресенье - это 7 дней назад
      lastSunday.setDate(now.getDate() - 7);
    } else {
      // Иначе находим воскресенье текущей недели и отнимаем 7 дней
      lastSunday.setDate(now.getDate() - now.getDay() - 7);
    }
    lastSunday.setHours(23, 59, 59, 999);

    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastSunday.getDate() - 6);
    lastMonday.setHours(0, 0, 0, 0);

    return { from: lastMonday, to: lastSunday };
  }

  /**
   * Рассчитывает даты для графика выплат
   */
  calculatePaymentDates(
    periodEndDate: Date,
    paymentSchedule: 'next_week' | 'week_after'
  ): { calculationDate: Date; paymentDate: Date } {
    const periodEnd = new Date(periodEndDate);

    if (paymentSchedule === 'next_week') {
      const calculationDate = new Date(periodEnd);
      calculationDate.setDate(
        periodEnd.getDate() + ((8 - periodEnd.getDay()) % 7) || 7
      );
      const paymentDate = new Date(calculationDate);
      paymentDate.setDate(calculationDate.getDate() + 2);
      return { calculationDate, paymentDate };
    } else {
      const calculationDate = new Date(periodEnd);
      calculationDate.setDate(
        periodEnd.getDate() + ((8 - periodEnd.getDay()) % 7) || 7 + 7
      );
      const paymentDate = new Date(calculationDate);
      paymentDate.setDate(calculationDate.getDate() + 2);
      return { calculationDate, paymentDate };
    }
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
      // Для "next_week" - текущая неделя (понедельник - воскресенье текущей недели)
      const to = new Date(now);
      // now.getDate() - now.getDay() дает воскресенье текущей недели
      // Если сегодня воскресенье (getDay() = 0), то это и есть воскресенье текущей недели
      if (now.getDay() === 0) {
        to.setDate(now.getDate());
      } else {
        to.setDate(now.getDate() - now.getDay());
      }
      to.setHours(23, 59, 59, 999);

      const from = new Date(to);
      from.setDate(to.getDate() - 6); // Понедельник текущей недели
      from.setHours(0, 0, 0, 0);

      return { from, to };
    } else {
      // Для "week_after" - прошлая неделя (понедельник - воскресенье прошлой недели)
      return this.getLastWeekPeriod();
    }
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

    console.log(`🔍 Найдено активных интеграций Ozon: ${integrations.length}`);

    if (integrations.length === 0) {
      console.log('ℹ️  Активных интеграций не найдено, операций не создано');
      return results;
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 Начинаем обработку интеграций...');
    console.log('═══════════════════════════════════════════════════════');

    for (let i = 0; i < integrations.length; i++) {
      const integration = integrations[i];
      console.log(
        `\n[${i + 1}/${integrations.length}] Обработка интеграции: ${integration.id}`
      );
      console.log(`   Компания: ${integration.company.name}`);
      console.log(`   График выплат: ${integration.paymentSchedule}`);

      try {
        const period = this.getQueryPeriod(
          integration.paymentSchedule as 'next_week' | 'week_after'
        );
        const created = await this.createOperationForIntegration(
          integration,
          period
        );
        if (created) {
          results.created++;
          console.log(
            `   ✅ Операция успешно создана для интеграции ${integration.id}`
          );
        } else {
          console.log(
            `   ⏭️  Операция не создана (сумма 0, payment >= 0 или дубликат)`
          );
        }
      } catch (error: any) {
        const errorMsg = `Integration ${integration.id}: ${error.message}`;
        console.error(`   ❌ Ошибка: ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ИТОГИ ОБРАБОТКИ ИНТЕГРАЦИЙ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Успешно создано операций: ${results.created}`);
    console.log(`❌ Ошибок: ${results.errors.length}`);
    console.log('═══════════════════════════════════════════════════════\n');

    return results;
  }

  /**
   * Создает операцию для конкретной интеграции
   */
  async createOperationForIntegration(
    integration: any,
    period: { from: Date; to: Date }
  ): Promise<boolean> {
    try {
      console.log(`🔄 Обрабатываем интеграцию: ${integration.id}`);
      console.log(
        `📅 Период запроса: ${period.from.toLocaleDateString('ru-RU')} - ${period.to.toLocaleDateString('ru-RU')}`
      );

      // Проверяем данные интеграции
      console.log(`📋 Данные интеграции:`, {
        articleId: integration.articleId,
        articleName: integration.article?.name || 'N/A',
        accountId: integration.accountId,
        accountName: integration.account?.name || 'N/A',
        companyId: integration.companyId,
      });

      // Форматируем даты для Ozon API
      const fromISO = period.from.toISOString();
      const toISO = period.to.toISOString();

      // Получаем данные из Ozon
      console.log(`🌐 Запрашиваем данные Ozon API...`);
      const cashFlowData = await this.getCashFlowStatement(
        integration.clientKey,
        integration.apiKey,
        fromISO,
        toISO
      );

      // Получаем сумму выплаты
      const calculatedAmount = this.calculatePaymentAmount(cashFlowData);
      console.log(`💰 Рассчитанная сумма выплаты: ${calculatedAmount}`);

      // Если сумма 0, нет необходимости создавать операцию
      if (calculatedAmount === 0) {
        console.log(`⏭️ Сумма 0, пропускаем создание операции`);
        return false;
      }

      // Проверяем, что payment < 0 для создания операции
      if (calculatedAmount >= 0) {
        console.log(
          `⏭️ Payment ${calculatedAmount} >= 0, пропускаем создание операции (создаем только при payment < 0)`
        );
        return false;
      }

      // Преобразуем сумму для операции и определяем тип
      const operationAmount = this.getOperationAmount(calculatedAmount);
      const operationType = this.getOperationType(calculatedAmount);

      console.log(
        `📊 Создаем операцию: ${operationType} на сумму ${operationAmount}`
      );

      // Проверяем, не была ли уже создана операция за этот период
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

      if (existingOperation) {
        console.log(
          `⏭️ Операция за этот период уже существует: ${existingOperation.id}`
        );
        return false;
      }

      // Рассчитываем даты выплаты
      const paymentDates = this.calculatePaymentDates(
        period.to,
        integration.paymentSchedule as 'next_week' | 'week_after'
      );
      console.log(
        `📆 Дата выплаты: ${paymentDates.paymentDate.toLocaleDateString('ru-RU')}`
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

      // Создаем операцию - явно указываем все поля
      const operationData = {
        type: operationType,
        operationDate: paymentDates.paymentDate,
        amount: operationAmount,
        currency,
        articleId: integration.articleId, // Явно указываем articleId
        accountId: integration.accountId, // Явно указываем accountId
        description: this.generateOperationDescription(
          period.from,
          period.to,
          operationAmount,
          operationType,
          integration.paymentSchedule as 'next_week' | 'week_after'
        ),
        isConfirmed: true,
      };

      console.log(`🔄 Создаем операцию:`, {
        type: operationData.type,
        amount: operationData.amount,
        currency: operationData.currency,
        date: operationData.operationDate.toLocaleDateString('ru-RU'),
        articleId: operationData.articleId,
        article: integration.article?.name || 'N/A',
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
          description: operationData.description,
          isConfirmed: operationData.isConfirmed,
          companyId: integration.companyId,
        },
        include: {
          article: true,
          account: true,
        },
      });

      console.log(`✅ Операция успешно создана: ${createdOperation.id}`);
      console.log(`   📋 Детали созданной операции:`);
      console.log(`      - ID: ${createdOperation.id}`);
      console.log(`      - Тип: ${createdOperation.type}`);
      console.log(
        `      - Сумма: ${createdOperation.amount} ${createdOperation.currency}`
      );
      console.log(
        `      - Дата: ${createdOperation.operationDate.toLocaleDateString('ru-RU')}`
      );
      console.log(
        `      - Статья ID: ${createdOperation.articleId || 'ОТСУТСТВУЕТ!'}`
      );
      console.log(`      - Статья: ${createdOperation.article?.name || 'N/A'}`);
      console.log(
        `      - Счет ID: ${createdOperation.accountId || 'ОТСУТСТВУЕТ!'}`
      );
      console.log(`      - Счет: ${createdOperation.account?.name || 'N/A'}`);
      console.log(
        `      - Описание: ${createdOperation.description?.substring(0, 60)}...`
      );

      if (!createdOperation.articleId) {
        console.error(`   ❌ ВНИМАНИЕ: articleId не сохранился в операции!`);
      } else {
        console.log(`   ✅ Операция создана корректно со всеми полями`);
      }

      return true;
    } catch (error: any) {
      console.error(
        `❌ Ошибка при создании операции для интеграции ${integration.id}:`,
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

  /**
   * Тестовый метод для создания операции вручную
   */
  async createTestOperation(integrationId: string): Promise<boolean> {
    const integration = await this.getIntegrationById(integrationId);
    if (!integration) {
      throw new AppError('Integration not found or not active', 404);
    }

    const period = this.getQueryPeriod(
      integration.paymentSchedule as 'next_week' | 'week_after'
    );
    return this.createOperationForIntegration(integration, period);
  }
}

export default new OzonOperationService();
