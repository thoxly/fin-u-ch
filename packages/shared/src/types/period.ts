export type PeriodFormat = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface PeriodRange {
  from: string;
  to: string;
}

export interface Interval {
  start: Date;
  end: Date;
  label: string;
}
