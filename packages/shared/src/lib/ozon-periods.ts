/**
 * Утилиты для расчета периодов для интеграции Ozon
 */

/**
 * Получает период для запроса данных Ozon API
 * @param paymentSchedule - График выплат: 'next_week' (текущая неделя) или 'week_after' (прошлая неделя)
 * @returns Период { from: Date, to: Date }
 */
export function getOzonQueryPeriod(
  paymentSchedule: 'next_week' | 'week_after'
): { from: Date; to: Date } {
  const now = new Date();

  if (paymentSchedule === 'next_week') {
    // Для "next_week" - текущая неделя (понедельник - воскресенье текущей недели)
    const to = new Date(now);
    // now.getDate() - now.getDay() дает воскресенье текущей недели
    // Если сегодня воскресенье (getDay() = 0), то это и есть воскресенье текущей недели
    if (now.getDay() === 0) {
      to.setDate(now.getDate());
    } else {
      to.setDate(now.getDate() - now.getDay());
    }
    to.setHours(23, 59, 59, 999);

    const from = new Date(to);
    from.setDate(to.getDate() - 6); // Понедельник текущей недели
    from.setHours(0, 0, 0, 0);

    return { from, to };
  } else {
    // Для "week_after" - прошлая неделя (понедельник - воскресенье прошлой недели)
    return getOzonLastWeekPeriod();
  }
}

/**
 * Получает период за прошлую неделю
 * @returns Период { from: Date, to: Date } для прошлой недели
 */
export function getOzonLastWeekPeriod(): { from: Date; to: Date } {
  const now = new Date();
  const lastSunday = new Date(now);
  // Находим воскресенье прошлой недели
  if (now.getDay() === 0) {
    // Если сегодня воскресенье, то прошлое воскресенье - это 7 дней назад
    lastSunday.setDate(now.getDate() - 7);
  } else {
    // Иначе находим воскресенье текущей недели и отнимаем 7 дней
    lastSunday.setDate(now.getDate() - now.getDay() - 7);
  }
  lastSunday.setHours(23, 59, 59, 999);

  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);
  lastMonday.setHours(0, 0, 0, 0);

  return { from: lastMonday, to: lastSunday };
}

/**
 * Рассчитывает даты для графика выплат Ozon
 * @param periodEndDate - Дата окончания периода
 * @param paymentSchedule - График выплат: 'next_week' или 'week_after'
 * @returns { calculationDate: Date, paymentDate: Date }
 */
export function calculateOzonPaymentDates(
  periodEndDate: Date,
  paymentSchedule: 'next_week' | 'week_after'
): { calculationDate: Date; paymentDate: Date } {
  const periodEnd = new Date(periodEndDate);

  if (paymentSchedule === 'next_week') {
    const calculationDate = new Date(periodEnd);
    calculationDate.setDate(
      periodEnd.getDate() + ((8 - periodEnd.getDay()) % 7) || 7
    );
    const paymentDate = new Date(calculationDate);
    paymentDate.setDate(calculationDate.getDate() + 2);
    return { calculationDate, paymentDate };
  } else {
    const calculationDate = new Date(periodEnd);
    calculationDate.setDate(
      periodEnd.getDate() + ((8 - periodEnd.getDay()) % 7) || 7 + 7
    );
    const paymentDate = new Date(calculationDate);
    paymentDate.setDate(calculationDate.getDate() + 2);
    return { calculationDate, paymentDate };
  }
}
