import { PeriodFormat } from '@fin-u-ch/shared';
import { AggregatedDataPoint } from './operationAggregation';

/**
 * Форматирует данные для графиков в зависимости от формата периода
 */
export const formatChartData = (
  data: AggregatedDataPoint[],
  _periodFormat: PeriodFormat
): AggregatedDataPoint[] => {
  return data.map((point) => ({
    ...point,
    // Для разных форматов можно добавить дополнительное форматирование
    label: point.label,
  }));
};
