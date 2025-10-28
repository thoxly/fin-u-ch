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
  format,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { PeriodFormat, PeriodRange, Interval } from '../types/period';

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
        to: formatDate(endOfWeek(date, { weekStartsOn: 1 })),
      };
    case 'month':
      return {
        from: formatDate(startOfMonth(date)),
        to: formatDate(endOfMonth(date)),
      };
    case 'quarter':
      return {
        from: formatDate(startOfQuarter(date)),
        to: formatDate(endOfQuarter(date)),
      };
    case 'year':
      return {
        from: formatDate(startOfYear(date)),
        to: formatDate(endOfYear(date)),
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
    case 'quarter': {
      const quarter = Math.ceil((fromDate.getMonth() + 1) / 3);
      return `Q${quarter} ${fromDate.getFullYear()}`;
    }
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
  { value: 'year', label: 'Год' },
];

/**
 * Форматирует дату для отображения на графике - всегда показывает конкретную дату (конец интервала)
 * Точка на оси X должна представлять конкретное значение, а не период
 */
export const formatIntervalLabel = (
  start: Date,
  end: Date,
  format: PeriodFormat
): string => {
  const daysDiff =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Всегда показываем конец интервала как конкретную дату
  // Для дня - показываем дату конца интервала
  if (format === 'day' || daysDiff <= 2) {
    return `${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth() + 1).padStart(2, '0')}`;
  }

  // Для недели или небольшого интервала - показываем конец интервала
  if (format === 'week' || daysDiff <= 7) {
    const endDay = String(end.getDate()).padStart(2, '0');
    const endMonth = [
      'янв',
      'фев',
      'мар',
      'апр',
      'май',
      'июн',
      'июл',
      'авг',
      'сен',
      'окт',
      'ноя',
      'дек',
    ][end.getMonth()];
    return `${endDay} ${endMonth}`;
  }

  // Для месяца и больше - показываем месяц конца интервала
  if (format === 'month' || format === 'quarter' || daysDiff >= 30) {
    const endMonth = [
      'янв',
      'фев',
      'мар',
      'апр',
      'май',
      'июн',
      'июл',
      'авг',
      'сен',
      'окт',
      'ноя',
      'дек',
    ][end.getMonth()];
    return `${endMonth} ${end.getFullYear()}`;
  }

  return `${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Создает массив интервалов в зависимости от формата периода
 * ВАЖНО: Создает интервалы для ВСЕГО календарного периода, а не только для дней с операциями
 */
export const createIntervals = (
  periodFormat: PeriodFormat,
  fromDate: Date,
  toDate: Date
): Interval[] => {
  const intervals: Interval[] = [];

  // Вычисляем общее количество дней в периоде
  const totalDays =
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) +
    1;

  // Определяем оптимальное количество интервалов для визуализации (5-12 точек)
  let targetIntervals: number;

  if (totalDays <= 7) {
    // Меньше недели - каждый день
    targetIntervals = totalDays;
  } else if (totalDays <= 31) {
    // До месяца - каждый день
    targetIntervals = totalDays;
  } else if (totalDays <= 90) {
    // До квартала - показываем месяцы
    const startMonth = fromDate.getMonth();
    const endMonth = toDate.getMonth();
    const startYear = fromDate.getFullYear();
    const endYear = toDate.getFullYear();

    // Считаем количество месяцев
    const months = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    targetIntervals = months;
  } else if (totalDays <= 365) {
    // До года - показываем каждый месяц попадающий в диапазон
    // Это обеспечит уникальные лейблы "апр 2025", "май 2025", "июн 2025"
    const startMonth = fromDate.getMonth();
    const endMonth = toDate.getMonth();
    const startYear = fromDate.getFullYear();
    const endYear = toDate.getFullYear();

    // Считаем количество месяцев
    const months = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    targetIntervals = months;
  } else {
    // Больше года - каждый квартал
    targetIntervals = Math.max(5, Math.min(12, Math.ceil(totalDays / 90)));
  }

  // Вычисляем шаг в днях между интервалами
  const stepDays = Math.max(1, Math.ceil(totalDays / targetIntervals));

  let current = new Date(fromDate);
  let intervalCount = 0;

  // Для периода 90-365 дней делим по месяцам
  if (totalDays >= 90 && totalDays <= 365) {
    const monthDate = new Date(fromDate);

    while (monthDate <= toDate && intervalCount < targetIntervals) {
      // Начало месяца
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      if (start < fromDate) start.setTime(fromDate.getTime());

      // Конец месяца
      const end = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0
      );
      if (end > toDate) end.setTime(toDate.getTime());

      intervals.push({
        start,
        end,
        label: formatIntervalLabel(start, end, 'month'),
      });

      // Переходим к следующему месяцу
      monthDate.setMonth(monthDate.getMonth() + 1);
      intervalCount++;
    }

    return intervals;
  }

  // Для остальных периодов создаем интервалы для ВСЕГО календарного периода
  while (current <= toDate && intervalCount < targetIntervals) {
    const start = new Date(current);
    let end = new Date(current);

    // Для последнего интервала берем toDate
    if (intervalCount === targetIntervals - 1) {
      end = new Date(toDate);
    } else {
      end.setDate(end.getDate() + stepDays - 1);
      if (end > toDate) {
        end = new Date(toDate);
      }
    }

    // Определяем формат для лейбла в зависимости от размера интервала
    const intervalDays =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    let labelFormat: PeriodFormat = 'day';

    if (intervalDays <= 3) {
      labelFormat = 'day';
    } else if (intervalDays <= 14) {
      labelFormat = 'week';
    } else if (intervalDays <= 45) {
      labelFormat = 'month';
    } else if (intervalDays <= 120) {
      labelFormat = 'quarter';
    } else {
      labelFormat = 'year';
    }

    intervals.push({
      start,
      end,
      label: formatIntervalLabel(start, end, labelFormat),
    });

    // Переходим к следующему интервалу
    current = new Date(end);
    current.setDate(current.getDate() + 1);
    intervalCount++;
  }

  // Убеждаемся, что последний интервал охватывает toDate
  if (intervals.length > 0) {
    const lastInterval = intervals[intervals.length - 1];
    if (lastInterval.end < toDate) {
      intervals.push({
        start: new Date(lastInterval.end.getTime() + 1),
        end: new Date(toDate),
        label: formatIntervalLabel(
          new Date(lastInterval.end.getTime() + 1),
          toDate,
          'day'
        ),
      });
    }
  }

  return intervals;
};
