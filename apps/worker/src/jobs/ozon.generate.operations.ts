// apps/worker/src/jobs/ozon.generate.operations.ts
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';

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
      // Исправлено: details теперь массив
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

interface OzonOperationsGenerationParams {
  testIntegrationId?: string;
}

export class OzonOperationService {
  //Получает данные о денежных потоках из Ozon API
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

      const data = (await response.json()) as OzonCashFlowResponse;
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Таймаут подключения к Ozon API');
      }

      throw new Error(`Ошибка подключения к Ozon API: ${error.message}`);
    }
  }

  /**
   * Получает период за прошлую неделю (понедельник-воскресенье)
   */
  getLastWeekPeriod(): { from: Date; to: Date } {
    const now = new Date();

    // Находим воскресенье прошлой недели
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - now.getDay()); // Текущее воскресенье
    lastSunday.setDate(lastSunday.getDate() - 7); // Минус неделя = воскресенье прошлой недели
    lastSunday.setHours(23, 59, 59, 999);

    // Находим понедельник прошлой недели
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastSunday.getDate() - 6); // Понедельник прошлой недели
    lastMonday.setHours(0, 0, 0, 0);

    return { from: lastMonday, to: lastSunday };
  }

  /**
   * Получает сумму выплаты напрямую из поля payment в ответе Ozon API
   */
  calculatePaymentAmount(cashFlowData: OzonCashFlowResponse): number {
    if (!cashFlowData.result.cash_flows.length) {
      console.log('❌ Нет данных cash_flows в ответе Ozon API');
      return 0;
    }

    // Смотрим на поле payment в details (теперь details - массив)
    const details = cashFlowData.result.details;

    if (details && details.length > 0) {
      const payments = details[0]?.payments;

      if (payments && payments.length > 0) {
        // Берем первый payment (обычно там один элемент)
        const payment = payments[0];
        console.log(
          `💰 Прямая сумма выплаты из Ozon: ${payment.payment} ${payment.currency_code}`
        );
        return payment.payment || 0;
      }
    }

    // Если нет поля payment, используем старую логику как fallback
    console.log(`⚠️  Поле payment не найдено, используем расчетную сумму`);
    const cashFlow = cashFlowData.result.cash_flows[0];

    const calculatedAmount =
      cashFlow.orders_amount +
      cashFlow.services_amount -
      cashFlow.commission_amount -
      Math.abs(cashFlow.returns_amount);

    console.log(`🧮 Расчетная сумма: ${calculatedAmount}`);
    return calculatedAmount; // Убрали Math.max(0, ...) чтобы сохранять отрицательные значения
  }

  /**
   * Преобразует сумму в положительное значение для операции
   */
  private getOperationAmount(calculatedAmount: number): number {
    // Если сумма отрицательная, берем модуль (положительное значение)
    if (calculatedAmount < 0) {
      return Math.abs(calculatedAmount);
    }
    // Если сумма положительная, оставляем как есть
    return calculatedAmount;
  }

  /**
   * Определяет тип операции на основе рассчитанной суммы
   */
  private getOperationType(calculatedAmount: number): 'income' | 'expense' {
    // Если исходная сумма отрицательная - это расход (мы взяли модуль)
    // Если положительная - это доход
    return calculatedAmount < 0 ? 'expense' : 'income';
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
      // Выплата на следующей неделе
      const calculationDate = new Date(periodEnd);
      calculationDate.setDate(
        periodEnd.getDate() + ((8 - periodEnd.getDay()) % 7) || 7
      );

      const paymentDate = new Date(calculationDate);
      paymentDate.setDate(calculationDate.getDate() + 2);

      return { calculationDate, paymentDate };
    } else {
      // Выплата через неделю
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
   * Получает период для запроса данных в зависимости от графика выплат
   */
  getQueryPeriod(paymentSchedule: 'next_week' | 'week_after'): {
    from: Date;
    to: Date;
  } {
    const now = new Date();

    if (paymentSchedule === 'next_week') {
      // Для "выплата на следующей неделе" берем данные за последнюю завершенную неделю
      return this.getLastWeekPeriod();
    } else {
      // Для "выплата через неделю" берем данные за неделю до последней
      const lastWeek = this.getLastWeekPeriod();
      const to = new Date(lastWeek.from);
      to.setDate(lastWeek.from.getDate() - 1); // Воскресенье предыдущей недели
      to.setHours(23, 59, 59, 999);

      const from = new Date(to);
      from.setDate(to.getDate() - 6); // Понедельник предыдущей недели
      from.setHours(0, 0, 0, 0);

      return { from, to };
    }
  }

  /**
   * Создает операции для всех активных интеграций Ozon
   */
  async createOperationsForAllIntegrations(): Promise<{
    created: number;
    errors: string[];
  }> {
    const integrations = await prisma.integration.findMany({
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

    const results = {
      created: 0,
      errors: [] as string[],
    };

    console.log(`🔍 Найдено активных интеграций: ${integrations.length}`);

    for (const integration of integrations) {
      try {
        const created = await this.createOperationForIntegration(integration);
        if (created) {
          results.created++;
        }
      } catch (error: any) {
        const errorMsg = `Integration ${integration.id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    return results;
  }

  /**
   * Создает операцию для конкретной интеграции
   */
  async createOperationForIntegration(integration: any): Promise<boolean> {
    try {
      console.log(`🔄 Обрабатываем интеграцию: ${integration.id}`);

      // Получаем период для запроса данных
      const period = this.getQueryPeriod(
        integration.paymentSchedule as 'next_week' | 'week_after'
      );
      console.log(
        `📅 Период запроса: ${period.from.toLocaleDateString('ru-RU')} - ${period.to.toLocaleDateString('ru-RU')}`
      );

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

      // Получаем сумму выплаты (может быть отрицательной)
      const calculatedAmount = this.calculatePaymentAmount(cashFlowData);
      console.log(`💰 Рассчитанная сумма выплаты: ${calculatedAmount}`);

      // Если сумма 0, нет необходимости создавать операцию
      if (calculatedAmount === 0) {
        console.log(`⏭️ Сумма 0, пропускаем создание операции`);
        return false;
      }

      // Преобразуем сумму для операции (всегда положительная)
      const operationAmount = this.getOperationAmount(calculatedAmount);
      // Определяем тип операции
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

      // Получаем валюту из ответа
      const currency =
        cashFlowData.result.details?.[0]?.payments?.[0]?.currency_code ||
        cashFlowData.result.cash_flows[0]?.currency_code ||
        'RUB';

      // Создаем операцию
      const operationData = {
        type: operationType,
        operationDate: paymentDates.paymentDate,
        amount: operationAmount, // Всегда положительная сумма
        currency,
        articleId: integration.articleId,
        accountId: integration.accountId,
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
        article: integration.article.name,
        account: integration.account.name,
      });

      const createdOperation = await prisma.operation.create({
        data: {
          ...operationData,
          companyId: integration.companyId,
        },
      });

      console.log(`✅ Операция успешно создана: ${createdOperation.id}`);
      return true;
    } catch (error: any) {
      console.error(
        `❌ Ошибка при создании операции для интеграции ${integration.id}:`,
        error
      );
      throw new Error(`Failed to create Ozon operation: ${error.message}`);
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
    const integration = await prisma.integration.findFirst({
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

    if (!integration) {
      throw new Error('Integration not found or not active');
    }

    return this.createOperationForIntegration(integration);
  }
}

export const ozonOperationService = new OzonOperationService();

//Задача генерации операций из Ozon
export async function generateOzonOperations(
  params: OzonOperationsGenerationParams = {}
): Promise<{ created: number; errors: string[] }> {
  logger.info('🔄 Running Ozon operations generation task...');

  try {
    let result: { created: number; errors: string[] };

    if (params.testIntegrationId) {
      // Тестовый запуск для конкретной интеграции
      logger.info(`🔧 Test mode for integration: ${params.testIntegrationId}`);
      const created = await ozonOperationService.createTestOperation(
        params.testIntegrationId
      );
      result = {
        created: created ? 1 : 0,
        errors: [],
      };
    } else {
      // Продукционный запуск для всех интеграций
      result = await ozonOperationService.createOperationsForAllIntegrations();
    }

    logger.info(
      `✅ Ozon operations generation completed: ${result.created} created, ${result.errors.length} errors`
    );

    if (result.errors.length > 0) {
      logger.error('Ozon operation generation errors:', result.errors);
    }

    return result;
  } catch (error) {
    logger.error('❌ Ozon operations generation task failed:', error);
    throw error;
  }
}

//Получает текущий день недели (0 - воскресенье, 1 - понедельник, etc.)
export function getCurrentWeekday(): number {
  return new Date().getDay();
}

/**
 * Проверяет, нужно ли запускать задачу сегодня
 * Запускаем по понедельникам и средам для покрытия обоих графиков выплат
 */
export function shouldRunOzonTaskToday(): boolean {
  const today = getCurrentWeekday();
  // Понедельник (1) и Среда (3)
  return /* today === 1 || */ today === 3;
}
