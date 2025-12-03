import { formatMoney } from './money';

/**
 * Вычисляет оптимальный размер шрифта для оси Y на основе максимального значения
 * @param maxValue - максимальное значение для отображения
 * @param availableWidth - доступная ширина для оси Y (примерно 60-80px)
 * @param minFontSize - минимальный размер шрифта (по умолчанию 8)
 * @param maxFontSize - максимальный размер шрифта (по умолчанию 12)
 * @returns оптимальный размер шрифта
 */
export const calculateYAxisFontSize = (
  maxValue: number,
  availableWidth: number = 70,
  minFontSize: number = 8,
  maxFontSize: number = 12
): number => {
  if (!Number.isFinite(maxValue) || maxValue === 0) {
    return maxFontSize;
  }

  // Форматируем максимальное значение
  const formattedValue = formatMoney(maxValue);

  // Приблизительно оцениваем ширину текста (примерно 0.6 * fontSize * количество символов)
  // Для более точной оценки можно использовать canvas, но это будет избыточно
  const estimatedCharWidth = maxFontSize * 0.6;
  const estimatedWidth = formattedValue.length * estimatedCharWidth;

  // Если текст помещается, возвращаем максимальный размер
  if (estimatedWidth <= availableWidth) {
    return maxFontSize;
  }

  // Вычисляем необходимый размер шрифта
  const calculatedSize = availableWidth / formattedValue.length / 0.6;

  // Ограничиваем размер шрифта минимальным и максимальным значениями
  return Math.max(minFontSize, Math.min(maxFontSize, calculatedSize));
};

/**
 * Находит максимальное значение в данных графика
 * @param data - массив данных
 * @param keys - ключи для поиска максимального значения
 * @returns максимальное значение
 */
export const findMaxValue = (
  data: Record<string, unknown>[],
  keys: string[]
): number => {
  if (!data || data.length === 0) {
    return 0;
  }

  let max = -Infinity;

  data.forEach((item) => {
    keys.forEach((key) => {
      const value = item[key];
      if (typeof value === 'number' && Number.isFinite(value) && value > max) {
        max = value;
      }
    });
  });

  return max === -Infinity ? 0 : max;
};
