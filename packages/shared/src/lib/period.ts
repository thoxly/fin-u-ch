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
    case 'day':
      return {
        from: formatDate(date),
        to: formatDate(date),
      };
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
    case 'day': {
      const nextDay = new Date(fromDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return getPeriodRange(nextDay, periodFormat);
    }
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
    case 'day': {
      const prevDay = new Date(fromDate);
      prevDay.setDate(prevDay.getDate() - 1);
      return getPeriodRange(prevDay, periodFormat);
    }
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
    case 'day':
      return format(fromDate, 'dd MMM yyyy', { locale: ru });
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
  { value: 'day', label: 'День' },
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
  // ВАЖНО: Нормализуем даты для корректного вычисления (используем UTC для согласованности)
  const fromDateNormalized = new Date(
    Date.UTC(
      fromDate.getUTCFullYear(),
      fromDate.getUTCMonth(),
      fromDate.getUTCDate()
    )
  );
  const toDateNormalized = new Date(
    Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate())
  );
  const totalDays =
    Math.ceil(
      (toDateNormalized.getTime() - fromDateNormalized.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  // Определяем оптимальное количество интервалов для визуализации (5-12 точек)
  let targetIntervals: number;

  // Если periodFormat = 'day' или 'week', создаем интервалы по дням
  // НО если период слишком большой (>31 день), автоматически переключаемся на месячные интервалы
  if (periodFormat === 'day' || periodFormat === 'week') {
    if (totalDays > 31) {
      // Для больших периодов используем месячные интервалы (5-12 интервалов)
      const startMonth = fromDateNormalized.getUTCMonth();
      const endMonth = toDateNormalized.getUTCMonth();
      const startYear = fromDateNormalized.getUTCFullYear();
      const endYear = toDateNormalized.getUTCFullYear();
      const months = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      targetIntervals = Math.max(5, Math.min(12, months));
    } else {
      targetIntervals = totalDays;
    }
  } else if (totalDays <= 7) {
    // Меньше недели - каждый день
    targetIntervals = totalDays;
  } else if (totalDays <= 31) {
    // До месяца - каждый день
    targetIntervals = totalDays;
  } else if (totalDays <= 90) {
    // До квартала - показываем месяцы
    const startMonth = fromDateNormalized.getUTCMonth();
    const endMonth = toDateNormalized.getUTCMonth();
    const startYear = fromDateNormalized.getUTCFullYear();
    const endYear = toDateNormalized.getUTCFullYear();

    // Считаем количество месяцев
    const months = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    targetIntervals = months;
  } else if (totalDays <= 365) {
    // До года - показываем каждый месяц попадающий в диапазон
    // Это обеспечит уникальные лейблы "апр 2025", "май 2025", "июн 2025"
    const startMonth = fromDateNormalized.getUTCMonth();
    const endMonth = toDateNormalized.getUTCMonth();
    const startYear = fromDateNormalized.getUTCFullYear();
    const endYear = toDateNormalized.getUTCFullYear();

    // Считаем количество месяцев
    const months = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    targetIntervals = months;
  } else {
    // Больше года - каждый квартал
    targetIntervals = Math.max(5, Math.min(12, Math.ceil(totalDays / 90)));
  }

  // Вычисляем шаг в днях между интервалами
  const stepDays = Math.max(1, Math.ceil(totalDays / targetIntervals));

  let current = new Date(fromDateNormalized);
  let intervalCount = 0;

  // Для периода 90-365 дней делим по месяцам
  // ВАЖНО: Проверяем строго больше 31, чтобы для 31 дня создавались дневные интервалы
  if (totalDays > 31 && totalDays >= 90 && totalDays <= 365) {
    const monthDate = new Date(fromDateNormalized);

    while (monthDate <= toDateNormalized && intervalCount < targetIntervals) {
      // Начало месяца (используем UTC для согласованности)
      const start = new Date(
        Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1)
      );
      if (start < fromDateNormalized)
        start.setTime(fromDateNormalized.getTime());

      // Конец месяца (последний день месяца в начале дня для согласованности)
      let end = new Date(
        Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)
      );
      // Если это последний месяц и он выходит за пределы toDate, используем toDate
      const toDateUTC = new Date(
        Date.UTC(
          toDate.getUTCFullYear(),
          toDate.getUTCMonth(),
          toDate.getUTCDate()
        )
      );
      if (end > toDateUTC) {
        end = new Date(toDateUTC);
      }

      intervals.push({
        start,
        end,
        label: formatIntervalLabel(start, end, 'month'),
      });

      // Переходим к следующему месяцу (используем UTC)
      monthDate.setUTCMonth(monthDate.getUTCMonth() + 1);
      monthDate.setUTCDate(1);
      intervalCount++;
    }

    return intervals;
  }

  // Для остальных периодов создаем интервалы для ВСЕГО календарного периода
  // Специальная обработка для дневных интервалов (stepDays = 1 или totalDays <= 31)
  if (stepDays === 1 || totalDays <= 31) {
    // Создаем интервал для каждого дня
    // ВАЖНО: Используем нормализованные даты
    const dayDate = new Date(fromDateNormalized);

    // Создаем интервалы для каждого дня в периоде
    // ВАЖНО: Создаем ровно totalDays интервалов
    // Используем UTC для согласованности с тестами
    for (let dayCount = 0; dayCount < totalDays; dayCount++) {
      const start = new Date(
        Date.UTC(
          dayDate.getUTCFullYear(),
          dayDate.getUTCMonth(),
          dayDate.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );
      // Для дневных интервалов end должен быть началом того же дня (00:00:00.000)
      // Это соответствует ожиданиям тестов и логике работы с датами
      const end = new Date(
        Date.UTC(
          dayDate.getUTCFullYear(),
          dayDate.getUTCMonth(),
          dayDate.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );

      intervals.push({
        start,
        end,
        label: formatIntervalLabel(start, end, 'day'),
      });

      // Переходим к следующему дню (используем UTC для согласованности)
      dayDate.setUTCDate(dayDate.getUTCDate() + 1);
    }

    // Для дневных интервалов не нужно добавлять дополнительный интервал в конце
    return intervals;
  } else {
    // Для интервалов больше одного дня
    while (current <= toDateNormalized && intervalCount < targetIntervals) {
      const start = new Date(
        Date.UTC(
          current.getUTCFullYear(),
          current.getUTCMonth(),
          current.getUTCDate(),
          0,
          0,
          0,
          0
        )
      );
      let end: Date;

      // Для последнего интервала берем toDateNormalized
      if (intervalCount === targetIntervals - 1) {
        end = new Date(toDateNormalized);
      } else {
        // Устанавливаем конец интервала: если stepDays = 1, то это конец текущего дня
        // Если stepDays > 1, то это конец последнего дня в интервале
        const endDate = new Date(current);
        endDate.setUTCDate(endDate.getUTCDate() + stepDays - 1);
        end = new Date(
          Date.UTC(
            endDate.getUTCFullYear(),
            endDate.getUTCMonth(),
            endDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        if (end > toDateNormalized) {
          end = new Date(toDateNormalized);
        }
      }

      // Определяем формат для лейбла в зависимости от размера интервала
      const intervalDays =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;
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

      // Переходим к следующему интервалу (используем UTC)
      current = new Date(end);
      current.setUTCDate(current.getUTCDate() + 1);
      intervalCount++;
    }
  }

  return intervals;
};
