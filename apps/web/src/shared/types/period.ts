export type PeriodFormat = 'week' | 'month' | 'quarter' | 'year';

export interface PeriodRange {
  from: string; // ISO date string
  to: string;   // ISO date string
}

export interface PeriodFiltersState {
  format: PeriodFormat;
  range: PeriodRange;
}

export interface PeriodFiltersProps {
  value: PeriodFiltersState;
  onChange: (filters: PeriodFiltersState) => void;
}
