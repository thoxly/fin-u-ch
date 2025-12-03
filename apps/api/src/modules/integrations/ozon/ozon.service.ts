// apps/api/src/modules/integrations/ozon/ozon.service.ts
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
    details: {
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
        transfer_delivery: 0;
        transfer_delivery_return: 0;
        compensation_delivery_return: 0;
        partial_compensation: 0;
        partial_compensation_return: 0;
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
    };
  };
  page_count: number;
}

interface OzonIntegrationData {
  clientKey: string;
  apiKey: string;
  paymentSchedule: 'next_week' | 'week_after';
  articleId: string;
  accountId: string;
}

export class OzonService {
  async getCashFlowStatement(
    clientKey: string,
    apiKey: string,
    dateFrom: string,
    dateTo: string
  ): Promise<OzonCashFlowResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

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
            page_size: 100, // Получаем больше данных для точности
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

      throw new AppError('Ошибка подключения к Ozon API', 500);
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

    // Сумма выплаты = orders_amount + services_amount - commission_amount - returns_amount
    // Это упрощенная формула, можно настроить под конкретные нужды
    const paymentAmount =
      cashFlow.orders_amount +
      cashFlow.services_amount -
      cashFlow.commission_amount -
      Math.abs(cashFlow.returns_amount); // returns_amount отрицательный, берем модуль

    return Math.max(0, paymentAmount); // Не может быть отрицательным
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
      // Расчет в понедельник после окончания периода
      const calculationDate = new Date(periodEnd);
      calculationDate.setDate(
        periodEnd.getDate() + ((8 - periodEnd.getDay()) % 7) || 7
      );

      // Выплата в среду (2 дня после понедельника)
      const paymentDate = new Date(calculationDate);
      paymentDate.setDate(calculationDate.getDate() + 2);

      return { calculationDate, paymentDate };
    } else {
      // Выплата через неделю
      // Расчет в понедельник через неделю после окончания периода
      const calculationDate = new Date(periodEnd);
      calculationDate.setDate(
        periodEnd.getDate() + ((8 - periodEnd.getDay()) % 7) || 7 + 7
      );

      // Выплата в среду (2 дня после понедельника)
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
}

export default new OzonService();
