/**
 * Утилиты для расчета сумм и операций для интеграции Ozon
 */

/**
 * Интерфейс ответа Ozon API для денежных потоков
 */
export interface OzonCashFlowResponse {
  result: {
    cash_flows: Array<{
      commission_amount: number;
      currency_code: string;
      item_delivery_and_return_amount?: number;
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

/**
 * Рассчитывает сумму выплаты из данных Ozon API
 *
 * Приоритет:
 * 1. Поле `payment` из `details[0].payments[0].payment` (если доступно)
 * 2. Fallback: расчетная сумма из `cash_flows[0]`
 *
 * @param cashFlowData - Данные денежных потоков от Ozon API
 * @returns Сумма выплаты (может быть отрицательной для расходов)
 */
export function calculateOzonPaymentAmount(
  cashFlowData: OzonCashFlowResponse
): number {
  if (!cashFlowData.result.cash_flows.length) {
    return 0;
  }

  // Приоритет: поле payment в details
  const details = cashFlowData.result.details;
  if (details && details.length > 0) {
    const payments = details[0]?.payments;
    if (payments && payments.length > 0) {
      return payments[0].payment || 0;
    }
  }

  // Fallback: расчетная сумма из cash_flows
  const cashFlow = cashFlowData.result.cash_flows[0];
  return (
    cashFlow.orders_amount +
    cashFlow.services_amount -
    cashFlow.commission_amount -
    Math.abs(cashFlow.returns_amount)
  );
}
