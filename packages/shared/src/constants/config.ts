/**
 * Configuration constants
 */

export const SUPPORTED_CURRENCIES = ['RUB', 'USD', 'EUR', 'KZT'] as const;

export const DEFAULT_CURRENCY = 'RUB';

export const DEFAULT_SALARY_CONTRIBUTIONS_PCT = 30;
export const DEFAULT_SALARY_INCOME_TAX_PCT = 13;

export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';

export const CACHE_TTL = {
  REPORT_SHORT: 5 * 60, // 5 minutes
  REPORT_MEDIUM: 15 * 60, // 15 minutes
  REPORT_LONG: 60 * 60, // 1 hour
} as const;

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 500,
} as const;
