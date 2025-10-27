// import { useState, useEffect } from 'react';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Button';
import { PeriodFiltersProps, PeriodFormat } from '../types/period';
import {
  getPeriodRange,
  getNextPeriod,
  getPreviousPeriod,
  // formatPeriodDisplay,
  getPeriodFormatOptions,
} from '../lib/period';

export const PeriodFilters = ({ value, onChange }: PeriodFiltersProps) => {
  // const [periodDisplay, setPeriodDisplay] = useState('');

  // Обновляем отображение периода при изменении
  // useEffect(() => {
  //   setPeriodDisplay(formatPeriodDisplay(value.range, value.format));
  // }, [value.range, value.format]);

  const handleFormatChange = (newFormat: PeriodFormat) => {
    const newRange = getPeriodRange(new Date(value.range.from), newFormat);
    onChange({
      format: newFormat,
      range: newRange,
    });
  };

  const handlePreviousPeriod = () => {
    const newRange = getPreviousPeriod(value.range, value.format);
    onChange({
      format: value.format,
      range: newRange,
    });
  };

  const handleNextPeriod = () => {
    const newRange = getNextPeriod(value.range, value.format);
    onChange({
      format: value.format,
      range: newRange,
    });
  };

  const handleManualDateChange = (field: 'from' | 'to', dateValue: string) => {
    const newRange = {
      ...value.range,
      [field]: dateValue,
    };
    onChange({
      format: value.format,
      range: newRange,
    });
  };

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Input
            label="Период с"
            type="date"
            value={value.range.from}
            onChange={(e) => handleManualDateChange('from', e.target.value)}
          />
        </div>

        <div className="flex-1">
          <Input
            label="Период по"
            type="date"
            value={value.range.to}
            onChange={(e) => handleManualDateChange('to', e.target.value)}
          />
        </div>

        <div className="w-32">
          <Select
            label="Формат периода"
            value={value.format}
            onChange={(e) => handleFormatChange(e.target.value as PeriodFormat)}
            options={getPeriodFormatOptions()}
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

        {/* Пустое место под форматом */}
        <div className="w-32"></div>
      </div>
    </div>
  );
};
