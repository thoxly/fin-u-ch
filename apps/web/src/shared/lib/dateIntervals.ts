import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  format,
  eachDayOfInterval,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  isWithinInterval,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { PeriodFormat } from '@fin-u-ch/shared';

/**
 * Умное форматирование лейблов для оси X - всегда показывает конкретную дату (конец интервала)
 * Точка на оси X должна представлять конкретное значение, а не период
 */
export const formatSmartLabel = (
  intervalStart: Date,
  intervalEnd: Date,
  daysPerInterval: number,
  _periodFormat: PeriodFormat
): string => {
  // Всегда показываем конец интервала как конкретную дату
  // Это правильный подход для точек на графике

  // Для одного дня - показываем дату
  if (daysPerInterval === 1) {
    return format(intervalEnd, 'dd.MM', { locale: ru });
  }

  // Для коротких интервалов (2-6 дней) - показываем конец периода
  if (daysPerInterval < 7) {
    return format(intervalEnd, 'dd MMM', { locale: ru });
  }

  // Для недельных интервалов - показываем конец недели
  if (daysPerInterval >= 7 && daysPerInterval < 30) {
    return format(intervalEnd, 'dd MMM', { locale: ru });
  }

  // Для месячных интервалов - показываем конец месяца
  if (daysPerInterval >= 30) {
    return format(intervalEnd, 'MMM yyyy', { locale: ru });
  }

  // Fallback - показываем конец интервала
  return format(intervalEnd, 'dd.MM', { locale: ru });
};

/**
 * Создает компактные и понятные лейблы для оси X - всегда показывает конкретную дату
 */
export const createCompactLabels = (
  intervals: Array<{ start: Date; end: Date; label: string }>
): Array<{ start: Date; end: Date; label: string }> => {
  return intervals.map((interval, _index) => {
    // Всегда показываем конец интервала как конкретную дату
    // Это правильный подход для точек на графике

    const daysDiff =
      Math.ceil(
        (interval.end.getTime() - interval.start.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    // Для одного дня - показываем дату
    if (daysDiff === 1) {
      return {
        ...interval,
        label: format(interval.end, 'dd.MM', { locale: ru }),
      };
    }

    // Для коротких интервалов (2-6 дней) - показываем конец периода
    if (daysDiff < 7) {
      return {
        ...interval,
        label: format(interval.end, 'dd MMM', { locale: ru }),
      };
    }

    // Для недельных интервалов - показываем конец недели
    if (daysDiff >= 7 && daysDiff < 30) {
      return {
        ...interval,
        label: format(interval.end, 'dd MMM', { locale: ru }),
      };
    }

    // Для месячных интервалов - показываем конец месяца
    if (daysDiff >= 30) {
      return {
        ...interval,
        label: format(interval.end, 'MMM yyyy', { locale: ru }),
      };
    }

    // Fallback - показываем конец интервала
    return {
      ...interval,
      label: format(interval.end, 'dd.MM', { locale: ru }),
    };
  });
};

/**
 * Определяет оптимальное количество точек для графика на основе периода и количества операций
 */
export const getOptimalDataPoints = (
  _periodFormat: PeriodFormat,
  fromDate: Date,
  toDate: Date,
  operationCount: number
): number => {
  // const daysDiff = Math.ceil(
  //   (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  // );

  // Максимальное количество точек для читаемости графика
  const maxPoints = 20;
  const minPoints = 3;

  // Базовое количество точек в зависимости от периода
  let basePoints: number;
  switch (_periodFormat) {
    case 'week':
      basePoints = Math.min(7, Math.max(3, Math.ceil(operationCount / 2)));
      break;
    case 'month':
      basePoints = Math.min(15, Math.max(5, Math.ceil(operationCount / 3)));
      break;
    case 'quarter':
      // Для квартала: 3 точки для малого количества операций, 5 для большого
      if (operationCount <= 10) {
        basePoints = 3; // 1-й квартал, 2-й квартал, 3-й квартал
      } else {
        basePoints = 5; // Более детализированное отображение
      }
      break;
    case 'year':
      basePoints = Math.min(12, Math.max(6, Math.ceil(operationCount / 10)));
      break;
    default:
      basePoints = 10;
  }

  return Math.max(minPoints, Math.min(maxPoints, basePoints));
};

/**
 * Создает умные интервалы для месяца с равномерным распределением
 */
export const getMonthIntervals = (
  fromDate: Date,
  toDate: Date,
  operationCount: number = 0
): Array<{ start: Date; end: Date; label: string }> => {
  const totalDays =
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) +
    1;

  // Определяем оптимальное количество точек для месяца
  let optimalPoints: number;

  if (operationCount === 0) {
    // Если операций нет, показываем 5-7 точек
    optimalPoints = Math.min(7, Math.max(5, Math.floor(totalDays / 5)));
  } else if (operationCount <= 3) {
    // Если операций мало (1-3), показываем 5-8 точек
    optimalPoints = Math.min(8, Math.max(5, operationCount + 2));
  } else if (operationCount <= 10) {
    // Если операций немного (4-10), показываем 6-12 точек
    optimalPoints = Math.min(12, Math.max(6, operationCount + 3));
  } else {
    // Если операций много, показываем больше точек
    optimalPoints = Math.min(
      15,
      Math.max(8, Math.floor(operationCount / 2) + 5)
    );
  }

  // Ограничиваем максимальное количество точек
  optimalPoints = Math.min(optimalPoints, Math.floor(totalDays / 2));

  const intervals: Array<{ start: Date; end: Date; label: string }> = [];

  // Вычисляем шаг между точками
  const step = Math.max(1, Math.floor((totalDays - 1) / (optimalPoints - 1)));

  // Создаем интервалы с равномерным распределением
  for (let i = 0; i < optimalPoints; i++) {
    const dayOffset = i * step;
    const currentDate = addDays(fromDate, dayOffset);

    // Проверяем, что не выходим за границы месяца
    if (currentDate <= toDate) {
      intervals.push({
        start: startOfDay(currentDate),
        end: endOfDay(currentDate),
        label: format(currentDate, 'dd', { locale: ru }),
      });
    }
  }

  // Убеждаемся, что последний день включен
  if (
    intervals.length > 0 &&
    intervals[intervals.length - 1].label !==
      format(toDate, 'dd', { locale: ru })
  ) {
    intervals.push({
      start: startOfDay(toDate),
      end: endOfDay(toDate),
      label: format(toDate, 'dd', { locale: ru }),
    });
  }

  return intervals;
};

/**
 * Определяет интервалы для агрегации данных в зависимости от формата периода и количества операций
 */
export const getAggregationIntervals = (
  _periodFormat: PeriodFormat,
  fromDate: Date,
  toDate: Date,
  operationCount: number = 0
): Array<{ start: Date; end: Date; label: string }> => {
  // Для месяца всегда показываем все дни месяца
  if (_periodFormat === 'month') {
    const intervals: Array<{ start: Date; end: Date; label: string }> = [];

    // Создаем интервалы для каждого дня месяца
    const days = eachDayOfInterval({ start: fromDate, end: toDate });

    // Если дней слишком много (>15), показываем только каждый N-й день
    if (days.length > 15) {
      const step = Math.ceil(days.length / 15);
      for (let i = 0; i < days.length; i += step) {
        const currentDate = days[i];
        intervals.push({
          start: startOfDay(currentDate),
          end: endOfDay(currentDate),
          label: format(currentDate, 'dd', { locale: ru }),
        });
      }

      // Убеждаемся, что последний день включен
      if (
        intervals.length > 0 &&
        intervals[intervals.length - 1].label !==
          format(toDate, 'dd', { locale: ru })
      ) {
        intervals.push({
          start: startOfDay(toDate),
          end: endOfDay(toDate),
          label: format(toDate, 'dd', { locale: ru }),
        });
      }
    } else {
      // Если дней немного, показываем все дни
      for (const day of days) {
        intervals.push({
          start: startOfDay(day),
          end: endOfDay(day),
          label: format(day, 'dd', { locale: ru }),
        });
      }
    }

    return intervals;
  }

  // Для квартала используем умную логику в зависимости от количества операций
  if (_periodFormat === 'quarter') {
    const optimalPoints = getOptimalDataPoints(
      _periodFormat,
      fromDate,
      toDate,
      operationCount
    );
    const intervals: Array<{ start: Date; end: Date; label: string }> = [];

    if (optimalPoints === 3) {
      // 3 точки: 1-й квартал, 2-й квартал, 3-й квартал
      const quarter1Start = new Date(fromDate.getFullYear(), 0, 1); // Январь
      const quarter1End = new Date(fromDate.getFullYear(), 2, 31); // Март
      const quarter2Start = new Date(fromDate.getFullYear(), 3, 1); // Апрель
      const quarter2End = new Date(fromDate.getFullYear(), 5, 30); // Июнь
      const quarter3Start = new Date(fromDate.getFullYear(), 6, 1); // Июль
      const quarter3End = new Date(fromDate.getFullYear(), 8, 30); // Сентябрь

      intervals.push({
        start: quarter1Start,
        end: quarter1End,
        label: '1-й квартал',
      });

      intervals.push({
        start: quarter2Start,
        end: quarter2End,
        label: '2-й квартал',
      });

      intervals.push({
        start: quarter3Start,
        end: quarter3End,
        label: '3-й квартал',
      });
    } else {
      // 5 точек: показываем отдельные месяцы
      const seenLabels = new Set<string>(); // Для дедупликации лейблов
      let current = new Date(fromDate);
      current.setDate(1); // Начало месяца

      while (current <= toDate) {
        const monthStart = startOfMonth(current);
        const monthEnd = endOfMonth(current);

        // Создаем уникальный лейбл для месяца
        const label = format(current, 'MMM yyyy', { locale: ru });

        // Если лейбл уже существует, добавляем суффикс
        let counter = 1;
        let uniqueLabel = label;
        while (seenLabels.has(uniqueLabel)) {
          uniqueLabel = `${label} (${counter})`;
          counter++;
        }

        seenLabels.add(uniqueLabel);

        intervals.push({
          start: monthStart,
          end: monthEnd,
          label: uniqueLabel,
        });

        // Переходим к следующему месяцу
        current = new Date(current);
        current.setMonth(current.getMonth() + 1);
      }
    }

    return intervals;
  }

  // Для года всегда показываем отдельные месяцы
  if (_periodFormat === 'year') {
    const intervals: Array<{ start: Date; end: Date; label: string }> = [];
    const seenLabels = new Set<string>(); // Для дедупликации лейблов
    let current = new Date(fromDate);
    current.setDate(1); // Начало месяца

    while (current <= toDate) {
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);

      // Создаем уникальный лейбл для месяца
      const label = format(current, 'MMM yyyy', { locale: ru });

      // Если лейбл уже существует, добавляем суффикс
      let counter = 1;
      let uniqueLabel = label;
      while (seenLabels.has(uniqueLabel)) {
        uniqueLabel = `${label} (${counter})`;
        counter++;
      }

      seenLabels.add(uniqueLabel);

      intervals.push({
        start: monthStart,
        end: monthEnd,
        label: uniqueLabel,
      });

      // Переходим к следующему месяцу
      current = new Date(current);
      current.setMonth(current.getMonth() + 1);
    }

    return intervals;
  }

  // Для недели всегда показываем отдельные дни
  if (_periodFormat === 'week') {
    const days = eachDayOfInterval({ start: fromDate, end: toDate });
    return days.map((day) => ({
      start: startOfDay(day),
      end: endOfDay(day),
      label: format(day, 'dd.MM', { locale: ru }),
    }));
  }

  const optimalPoints = getOptimalDataPoints(
    _periodFormat,
    fromDate,
    toDate,
    operationCount
  );
  const totalDays = Math.ceil(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysPerInterval = Math.max(1, Math.ceil(totalDays / optimalPoints));

  const intervals: Array<{ start: Date; end: Date; label: string }> = [];
  let currentDate = new Date(fromDate);

  while (currentDate <= toDate) {
    const intervalStart = new Date(currentDate);
    const intervalEnd = new Date(
      Math.min(
        addDays(currentDate, daysPerInterval - 1).getTime(),
        toDate.getTime()
      )
    );

    // Умное форматирование лейблов для лучшей читаемости
    const label = formatSmartLabel(
      intervalStart,
      intervalEnd,
      daysPerInterval,
      _periodFormat
    );

    intervals.push({
      start: startOfDay(intervalStart),
      end: endOfDay(intervalEnd),
      label,
    });

    currentDate = addDays(intervalEnd, 1);
  }

  return intervals;
};

/**
 * Создает дефолтные интервалы для периода когда нет данных
 */
export const createDefaultIntervals = (
  _periodFormat: PeriodFormat,
  fromDate: Date,
  toDate: Date
): Array<{ start: Date; end: Date; label: string }> => {
  const intervals: Array<{ start: Date; end: Date; label: string }> = [];

  switch (_periodFormat) {
    case 'month': {
      // Для месяца используем умные интервалы
      return getMonthIntervals(fromDate, toDate, 0);
    }

    case 'week': {
      // Для недели шаг день
      const days = eachDayOfInterval({ start: fromDate, end: toDate });
      days.forEach((day) => {
        intervals.push({
          start: startOfDay(day),
          end: endOfDay(day),
          label: format(day, 'dd.MM', { locale: ru }),
        });
      });
      break;
    }

    case 'quarter': {
      // Для квартала создаем интервалы в зависимости от количества операций
      // По умолчанию используем 3 точки (1-й, 2-й, 3-й квартал)
      const quarter1Start = new Date(fromDate.getFullYear(), 0, 1); // Январь
      const quarter1End = new Date(fromDate.getFullYear(), 2, 31); // Март
      const quarter2Start = new Date(fromDate.getFullYear(), 3, 1); // Апрель
      const quarter2End = new Date(fromDate.getFullYear(), 5, 30); // Июнь
      const quarter3Start = new Date(fromDate.getFullYear(), 6, 1); // Июль
      const quarter3End = new Date(fromDate.getFullYear(), 8, 30); // Сентябрь

      intervals.push({
        start: quarter1Start,
        end: quarter1End,
        label: '1-й квартал',
      });

      intervals.push({
        start: quarter2Start,
        end: quarter2End,
        label: '2-й квартал',
      });

      intervals.push({
        start: quarter3Start,
        end: quarter3End,
        label: '3-й квартал',
      });
      break;
    }

    case 'year': {
      // Для года создаем месяцы вручную
      const seenLabels = new Set<string>(); // Для дедупликации лейблов
      let current = new Date(fromDate);
      current.setDate(1);

      while (current <= toDate) {
        const monthStart = startOfMonth(current);
        const monthEnd = endOfMonth(current);

        // Создаем уникальный лейбл для месяца
        const label = format(current, 'MMM yyyy', { locale: ru });

        // Если лейбл уже существует, добавляем суффикс
        let counter = 1;
        let uniqueLabel = label;
        while (seenLabels.has(uniqueLabel)) {
          uniqueLabel = `${label} (${counter})`;
          counter++;
        }

        seenLabels.add(uniqueLabel);

        intervals.push({
          start: monthStart,
          end: monthEnd,
          label: uniqueLabel,
        });

        current = new Date(current);
        current.setMonth(current.getMonth() + 1);
      }
      break;
    }
  }

  return intervals;
};

/**
 * Умная группировка операций для создания читаемых интервалов
 * (НЕ используется для месяца - для месяца всегда показываются конкретные дни)
 */
export const createSmartIntervals = (
  operations: Array<{ operationDate: string; [key: string]: unknown }>,
  _periodFormat: PeriodFormat,
  fromDate: Date,
  toDate: Date
): Array<{ start: Date; end: Date; label: string }> => {
  if (operations.length === 0) {
    return getAggregationIntervals(_periodFormat, fromDate, toDate, 0);
  }

  // Для месяца эта функция НЕ должна вызываться
  if (_periodFormat === 'month') {
    throw new Error(
      'createSmartIntervals should not be called for month period. Use direct day intervals instead.'
    );
  }

  // Для других периодов используем существующую логику
  // const sortedOps = [...operations].sort(
  //   (a, b) =>
  //     new Date(a.operationDate).getTime() - new Date(b.operationDate).getTime()
  // );

  const totalDays = Math.ceil(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const operationCount = operations.length;

  // Определяем оптимальное количество интервалов
  let optimalIntervals: number;

  if (_periodFormat === 'week') {
    // Для недели: 3-7 интервалов в зависимости от количества операций
    optimalIntervals = Math.min(7, Math.max(3, Math.ceil(operationCount / 2)));
  } else if (_periodFormat === 'quarter') {
    // Для квартала: 4-12 интервалов
    optimalIntervals = Math.min(12, Math.max(4, Math.ceil(operationCount / 5)));
  } else {
    // Для года: 6-12 интервалов
    optimalIntervals = Math.min(
      12,
      Math.max(6, Math.ceil(operationCount / 10))
    );
  }

  // Если операций мало, группируем по дням
  if (operationCount <= optimalIntervals) {
    const days = eachDayOfInterval({ start: fromDate, end: toDate });
    return days.map((day) => ({
      start: startOfDay(day),
      end: endOfDay(day),
      label: format(day, 'dd.MM', { locale: ru }),
    }));
  }

  // Если операций много, создаем равномерные интервалы
  const daysPerInterval = Math.max(1, Math.ceil(totalDays / optimalIntervals));
  const intervals: Array<{ start: Date; end: Date; label: string }> = [];
  let currentDate = new Date(fromDate);

  while (currentDate <= toDate) {
    const intervalStart = new Date(currentDate);
    const intervalEnd = new Date(
      Math.min(
        addDays(currentDate, daysPerInterval - 1).getTime(),
        toDate.getTime()
      )
    );

    // Умное форматирование лейбла
    const label = formatSmartLabel(
      intervalStart,
      intervalEnd,
      daysPerInterval,
      _periodFormat
    );

    intervals.push({
      start: startOfDay(intervalStart),
      end: endOfDay(intervalEnd),
      label,
    });

    currentDate = addDays(intervalEnd, 1);
  }

  return intervals;
};

/**
 * Проверяет корректность работы с разными месяцами
 */
export const validateMonthDays = (
  fromDate: Date,
  toDate: Date
): { isValid: boolean; daysCount: number; monthName: string } => {
  const daysCount =
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) +
    1;
  const monthName = fromDate.toLocaleDateString('ru', { month: 'long' });

  // Проверяем, что количество дней соответствует реальному месяцу
  const expectedDays = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth() + 1,
    0
  ).getDate();
  const isValid = daysCount === expectedDays;

  return { isValid, daysCount, monthName };
};
