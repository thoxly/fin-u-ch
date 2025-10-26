import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  format
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { PeriodFormat, PeriodRange } from '../types/period';

/**
 * Получить диапазон дат для указанного формата периода
 */
export const getPeriodRange = (
  date: Date, 
  periodFormat: PeriodFormat
): PeriodRange => {
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');
  
  switch (periodFormat) {
    case 'week':
      return {
        from: formatDate(startOfWeek(date, { weekStartsOn: 1 })), // Понедельник
        to: formatDate(endOfWeek(date, { weekStartsOn: 1 }))
      };
    case 'month':
      return {
        from: formatDate(startOfMonth(date)),
        to: formatDate(endOfMonth(date))
      };
    case 'quarter':
      return {
        from: formatDate(startOfQuarter(date)),
        to: formatDate(endOfQuarter(date))
      };
    case 'year':
      return {
        from: formatDate(startOfYear(date)),
        to: formatDate(endOfYear(date))
      };
    default:
      throw new Error(`Unsupported period format: ${periodFormat}`);
  }
};

/**
 * Сдвинуть период на один шаг вперед
 */
export const getNextPeriod = (
  currentRange: PeriodRange,
  periodFormat: PeriodFormat
): PeriodRange => {
  const fromDate = new Date(currentRange.from);
  
  switch (periodFormat) {
    case 'week':
      return getPeriodRange(addWeeks(fromDate, 1), periodFormat);
    case 'month':
      return getPeriodRange(addMonths(fromDate, 1), periodFormat);
    case 'quarter':
      return getPeriodRange(addQuarters(fromDate, 1), periodFormat);
    case 'year':
      return getPeriodRange(addYears(fromDate, 1), periodFormat);
    default:
      throw new Error(`Unsupported period format: ${periodFormat}`);
  }
};

/**
 * Сдвинуть период на один шаг назад
 */
export const getPreviousPeriod = (
  currentRange: PeriodRange,
  periodFormat: PeriodFormat
): PeriodRange => {
  const fromDate = new Date(currentRange.from);
  
  switch (periodFormat) {
    case 'week':
      return getPeriodRange(subWeeks(fromDate, 1), periodFormat);
    case 'month':
      return getPeriodRange(subMonths(fromDate, 1), periodFormat);
    case 'quarter':
      return getPeriodRange(subQuarters(fromDate, 1), periodFormat);
    case 'year':
      return getPeriodRange(subYears(fromDate, 1), periodFormat);
    default:
      throw new Error(`Unsupported period format: ${periodFormat}`);
  }
};

/**
 * Форматировать период для отображения
 */
export const formatPeriodDisplay = (
  range: PeriodRange,
  periodFormat: PeriodFormat
): string => {
  const fromDate = new Date(range.from);
  const toDate = new Date(range.to);
  
  switch (periodFormat) {
    case 'week':
      return `${format(fromDate, 'dd MMM', { locale: ru })} - ${format(toDate, 'dd MMM yyyy', { locale: ru })}`;
    case 'month':
      return format(fromDate, 'LLLL yyyy', { locale: ru });
    case 'quarter':
      const quarter = Math.ceil((fromDate.getMonth() + 1) / 3);
      return `Q${quarter} ${fromDate.getFullYear()}`;
    case 'year':
      return fromDate.getFullYear().toString();
    default:
      return `${format(fromDate, 'dd.MM.yyyy')} - ${format(toDate, 'dd.MM.yyyy')}`;
  }
};

/**
 * Получить опции для селектора формата периода
 */
export const getPeriodFormatOptions = () => [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' }
];