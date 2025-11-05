export const formatAmountInput = (
  rawValue: string,
  maxDecimals = 2
): string => {
  if (rawValue == null) return '';
  let value = String(rawValue);

  // Keep only digits, comma, dot, and minus
  value = value.replace(/[^0-9,.-]/g, '');

  // Normalize minus: only one at start
  value = value.replace(/-/g, '');
  const isNegative = rawValue.trim().startsWith('-');

  // Normalize decimal separator to dot for processing
  value = value.replace(/,/g, '.');

  // Split integer and fraction
  const [intRaw, fracRaw = ''] = value.split('.');
  // Remove leading zeros from integer (but keep single 0)
  let intDigits = intRaw.replace(/^0+(?=\d)/, '');
  // Remove non-digits just in case
  intDigits = intDigits.replace(/\D/g, '');

  // Group thousands with spaces
  const intFormatted = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // Fraction: keep only digits and clamp length
  let fracDigits = fracRaw.replace(/\D/g, '');
  if (maxDecimals >= 0) {
    fracDigits = fracDigits.slice(0, maxDecimals);
  }

  // Build display string using comma as decimal separator (ru-RU)
  let result = intFormatted || '0';
  if (fracDigits.length > 0) {
    result += `,${fracDigits}`;
  }
  if (isNegative && result !== '0' && result !== '0,') {
    result = `-${result}`;
  }
  return result;
};

export const parseAmountInputToNumber = (displayValue: string): number => {
  if (!displayValue || displayValue.trim() === '') return 0;
  const normalized = displayValue
    .toString()
    .replace(/\s+/g, '') // remove spaces
    .replace(/,/g, '.') // comma to dot
    .replace(/(?!^)-/g, ''); // keep only leading minus
  const parsed = parseFloat(normalized);
  // Return 0 instead of NaN for invalid input
  return isNaN(parsed) ? 0 : parsed;
};
