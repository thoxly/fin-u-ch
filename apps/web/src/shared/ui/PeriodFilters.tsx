import { Button } from './Button';
import { DateRangePicker } from './DateRangePicker';
import { PeriodFiltersProps, PeriodFormat } from '@fin-u-ch/shared';
import { getNextPeriod, getPreviousPeriod } from '../lib/period';

// Автоматически определяет формат периода на основе диапазона дат
const detectPeriodFormat = (from: string, to: string): PeriodFormat => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const daysDiff =
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) +
    1;

  if (daysDiff === 1) {
    return 'day';
  } else if (daysDiff <= 8) {
    // Неделя может быть 7-8 дней из-за погрешностей вычисления
    return 'week';
  } else if (daysDiff <= 32) {
    return 'month';
  } else if (daysDiff <= 93) {
    return 'quarter';
  } else {
    return 'year';
  }
};

export const PeriodFilters = ({ value, onChange }: PeriodFiltersProps) => {
  const handlePreviousPeriod = () => {
    const format = detectPeriodFormat(value.range.from, value.range.to);
    const newRange = getPreviousPeriod(value.range, format);
    // Определяем формат для нового диапазона
    const newFormat = detectPeriodFormat(newRange.from, newRange.to);
    onChange({
      format: newFormat,
      range: newRange,
    });
  };

  const handleNextPeriod = () => {
    const format = detectPeriodFormat(value.range.from, value.range.to);
    const newRange = getNextPeriod(value.range, format);
    // Определяем формат для нового диапазона
    const newFormat = detectPeriodFormat(newRange.from, newRange.to);
    onChange({
      format: newFormat,
      range: newRange,
    });
  };

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    // Нормализуем даты до начала дня, чтобы избежать проблем с часовыми поясами
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    // Отправляем даты в формате YYYY-MM-DD
    const newRange = {
      from: start.toISOString().split('T')[0],
      to: end.toISOString().split('T')[0],
    };
    // Автоматически определяем формат на основе диапазона
    const format = detectPeriodFormat(newRange.from, newRange.to);
    onChange({
      format,
      range: newRange,
    });
  };

  const startDate = value.range.from ? new Date(value.range.from) : new Date();
  const endDate = value.range.to ? new Date(value.range.to) : new Date();

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <DateRangePicker
            label="Период"
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Навигация снизу - кнопки точно под полями периодов */}
      <div className="flex items-center gap-4">
        {/* Кнопка "Предыдущий" под полем "Период с" - прижата к левому краю */}
        <div className="flex-1 flex justify-start">
          <Button variant="outline" size="sm" onClick={handlePreviousPeriod}>
            ←
          </Button>
        </div>

        {/* Кнопка "Следующий" под полем "Период по" - прижата к правому краю */}
        <div className="flex-1 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleNextPeriod}>
            →
          </Button>
        </div>
      </div>
    </div>
  );
};
