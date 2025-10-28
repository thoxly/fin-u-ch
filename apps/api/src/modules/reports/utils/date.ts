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

// Новые функции для работы с интервалами

export interface Interval {
  start: Date;
  end: Date;
  label: string;
}

export type PeriodFormat = 'day' | 'week' | 'month' | 'quarter' | 'year';

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
