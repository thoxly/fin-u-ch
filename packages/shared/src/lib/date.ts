/**
 * Date utilities for financial calculations
 */

export const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getMonthsBetween = (startDate: Date, endDate: Date): string[] => {
  const months: string[] = [];
  const current = new Date(startDate);
  current.setDate(1);

  while (current <= endDate) {
    months.push(getMonthKey(current));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
};

export const parseMonthKey = (monthKey: string): Date => {
  if (!monthKey || typeof monthKey !== 'string') {
    throw new Error('Invalid month key: empty or not a string');
  }

  const parts = monthKey.split('-');
  if (parts.length !== 2) {
    throw new Error('Invalid month key format: expected YYYY-MM');
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  if (isNaN(year) || isNaN(month)) {
    throw new Error('Invalid month key: year and month must be numbers');
  }

  if (month < 1 || month > 12) {
    throw new Error('Invalid month key: month must be between 1 and 12');
  }

  return new Date(year, month - 1, 1);
};

// Re-export interval utilities from period module
export { formatIntervalLabel, createIntervals } from './period';
