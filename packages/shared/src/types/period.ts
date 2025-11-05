export type PeriodFormat = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface PeriodRange {
  from: string;
  to: string;
}

export interface PeriodFiltersState {
  format: PeriodFormat;
  range: PeriodRange;
}

export interface PeriodFiltersProps {
  value: PeriodFiltersState;
  onChange: (filters: PeriodFiltersState) => void;
}

export interface Interval {
  start: Date;
  end: Date;
  label: string;
}
