export const formatMoney = (
  amount: number,
  currency = 'RUB',
  locale = 'ru-RU'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Форматирует сумму операции с отображением оригинальной валюты в скобках, если она отличается
 * @param amount - сумма в базовой валюте
 * @param currency - базовая валюта
 * @param originalAmount - оригинальная сумма (опционально)
 * @param originalCurrency - оригинальная валюта (опционально)
 * @returns Отформатированная строка, например: "1000 ₽ (100 $)"
 */
export const formatOperationAmount = (
  amount: number,
  currency: string,
  originalAmount?: number | null,
  originalCurrency?: string | null
): string => {
  const baseAmount = formatMoney(amount, currency);

  // Если есть оригинальная валюта и она отличается от базовой, показываем в скобках
  if (
    originalAmount != null &&
    originalCurrency &&
    originalCurrency !== currency
  ) {
    const originalFormatted = formatMoney(originalAmount, originalCurrency);
    return `${baseAmount} (${originalFormatted})`;
  }

  return baseAmount;
};

export const formatNumber = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};
