// apps/api/src/modules/integrations/ozon/ozon-operation.service.ts
import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';

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
  };
  page_count: number;
}

export class OzonOperationService {
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
            with_details: false, // Упрощаем запрос
            page: 1,
            page_size: 100,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new AppError(
          `Ozon API error: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const data = (await response.json()) as OzonCashFlowResponse;
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new AppError('Таймаут подключения к Ozon API', 408);
      } else if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Ошибка подключения к Ozon API: ${error.message}`,
        500
      );
    }
  }

  /**
   * Рассчитывает сумму выплаты на основе данных Ozon
   */
  calculatePaymentAmount(cashFlowData: OzonCashFlowResponse): number {
    if (!cashFlowData.result.cash_flows.length) {
      return 0;
    }

    const cashFlow = cashFlowData.result.cash_flows[0];

    // Упрощенная формула расчета
    const paymentAmount =
      cashFlow.orders_amount +
      cashFlow.services_amount -
      cashFlow.commission_amount -
      Math.abs(cashFlow.returns_amount);

    return Math.max(0, paymentAmount);
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
      const to = new Date(now);
      to.setDate(now.getDate() - now.getDay()); // Воскресенье текущей недели
      to.setHours(23, 59, 59, 999);

      const from = new Date(to);
      from.setDate(to.getDate() - 6); // Понедельник той же недели
      from.setHours(0, 0, 0, 0);

      return { from, to };
    } else {
      // Для "выплата через неделю" берем данные за неделю до последней
      const to = new Date(now);
      to.setDate(now.getDate() - now.getDay() - 7); // Воскресенье предыдущей недели
      to.setHours(23, 59, 59, 999);

      const from = new Date(to);
      from.setDate(to.getDate() - 6); // Понедельник предыдущей недели
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
   * Создает операции для всех активных интеграций Ozon за прошлую неделю
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

      // Получаем период для запроса данных в зависимости от графика выплат
      const period = this.getQueryPeriod(
        integration.paymentSchedule as 'next_week' | 'week_after'
      );
      console.log(
        `📅 Период для запроса: ${period.from.toLocaleDateString('ru-RU')} - ${period.to.toLocaleDateString('ru-RU')}`
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

      // Рассчитываем сумму выплаты
      const amount = this.calculatePaymentAmount(cashFlowData);
      console.log(`💰 Рассчитанная сумма выплаты: ${amount}`);

      // Если сумма 0, нет необходимости создавать операцию
      if (amount <= 0) {
        console.log(`⏭️ Сумма 0, пропускаем создание операции`);
        return false;
      }

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

      // Создаем операцию
      const operationData = {
        type: 'income' as const,
        operationDate: paymentDates.paymentDate,
        amount,
        currency: cashFlowData.result.cash_flows[0]?.currency_code || 'RUB',
        articleId: integration.articleId,
        accountId: integration.accountId,
        description: this.generateOperationDescription(
          period.from,
          period.to,
          amount,
          integration.paymentSchedule as 'next_week' | 'week_after'
        ),
        isConfirmed: true,
      };

      console.log(`🔄 Создаем операцию:`, {
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
    paymentSchedule: 'next_week' | 'week_after'
  ): string {
    const formatDate = (date: Date) => date.toLocaleDateString('ru-RU');
    const scheduleText =
      paymentSchedule === 'next_week'
        ? 'выплата на следующей неделе'
        : 'выплата через неделю';

    return `Ozon выплата (${scheduleText}) за период ${formatDate(periodFrom)} - ${formatDate(periodTo)}. Сумма: ${amount.toLocaleString('ru-RU')} RUB`;
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
      throw new AppError('Integration not found or not active', 404);
    }

    return this.createOperationForIntegration(integration);
  }
}

export default new OzonOperationService();
