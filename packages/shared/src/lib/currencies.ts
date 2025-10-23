/**
 * Currency data with code, name, and symbol
 */
export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

/**
 * List of supported currencies
 * Sorted alphabetically by code for consistent ordering
 */
export const CURRENCIES: Currency[] = [
  { code: 'AED', name: 'Дирхам ОАЭ', symbol: 'د.إ' },
  { code: 'AMD', name: 'Армянский драм', symbol: '֏' },
  { code: 'AUD', name: 'Австралийский доллар', symbol: 'A$' },
  { code: 'BGN', name: 'Болгарский лев', symbol: 'лв' },
  { code: 'BRL', name: 'Бразильский реал', symbol: 'R$' },
  { code: 'CAD', name: 'Канадский доллар', symbol: 'C$' },
  { code: 'CHF', name: 'Швейцарский франк', symbol: 'CHF' },
  { code: 'CNY', name: 'Китайский юань', symbol: '¥' },
  { code: 'CZK', name: 'Чешская крона', symbol: 'Kč' },
  { code: 'DKK', name: 'Датская крона', symbol: 'kr' },
  { code: 'EUR', name: 'Евро', symbol: '€' },
  { code: 'GBP', name: 'Британский фунт', symbol: '£' },
  { code: 'HKD', name: 'Гонконгский доллар', symbol: 'HK$' },
  { code: 'HUF', name: 'Венгерский форинт', symbol: 'Ft' },
  { code: 'IDR', name: 'Индонезийская рупия', symbol: 'Rp' },
  { code: 'ILS', name: 'Израильский шекель', symbol: '₪' },
  { code: 'INR', name: 'Индийская рупия', symbol: '₹' },
  { code: 'JPY', name: 'Японская иена', symbol: '¥' },
  { code: 'KRW', name: 'Южнокорейская вона', symbol: '₩' },
  { code: 'KZT', name: 'Казахстанский тенге', symbol: '₸' },
  { code: 'MXN', name: 'Мексиканское песо', symbol: '$' },
  { code: 'MYR', name: 'Малайзийский ринггит', symbol: 'RM' },
  { code: 'NOK', name: 'Норвежская крона', symbol: 'kr' },
  { code: 'NZD', name: 'Новозеландский доллар', symbol: 'NZ$' },
  { code: 'PLN', name: 'Польский злотый', symbol: 'zł' },
  { code: 'RON', name: 'Румынский лей', symbol: 'lei' },
  { code: 'RUB', name: 'Российский рубль', symbol: '₽' },
  { code: 'SAR', name: 'Саудовский риял', symbol: '﷼' },
  { code: 'SEK', name: 'Шведская крона', symbol: 'kr' },
  { code: 'SGD', name: 'Сингапурский доллар', symbol: 'S$' },
  { code: 'THB', name: 'Тайский бат', symbol: '฿' },
  { code: 'TRY', name: 'Турецкая лира', symbol: '₺' },
  { code: 'UAH', name: 'Украинская гривна', symbol: '₴' },
  { code: 'USD', name: 'Доллар США', symbol: '$' },
  { code: 'ZAR', name: 'Южноафриканский рэнд', symbol: 'R' },
];

/**
 * Get currency by code
 */
export const getCurrencyByCode = (code: string): Currency | undefined => {
  return CURRENCIES.find((currency) => currency.code === code);
};

/**
 * Get all currency codes
 */
export const getCurrencyCodes = (): string[] => {
  return CURRENCIES.map((currency) => currency.code);
};

/**
 * Check if currency code is valid
 */
export const isValidCurrencyCode = (code: string): boolean => {
  return CURRENCIES.some((currency) => currency.code === code);
};
