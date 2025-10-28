import {
  getPeriodRange,
  getNextPeriod,
  getPreviousPeriod,
  formatPeriodDisplay,
  getPeriodFormatOptions,
} from './period';
import { PeriodFormat } from '../types/period';

describe('period utilities', () => {
  const testDate = new Date('2024-01-15'); // Понедельник, середина января

  describe('getPeriodRange', () => {
    it('should return correct week range', () => {
      const result = getPeriodRange(testDate, 'week');

      expect(result.from).toBe('2024-01-15'); // Понедельник
      expect(result.to).toBe('2024-01-21'); // Воскресенье
    });

    it('should return correct month range', () => {
      const result = getPeriodRange(testDate, 'month');

      expect(result.from).toBe('2024-01-01');
      expect(result.to).toBe('2024-01-31');
    });

    it('should return correct quarter range', () => {
      const result = getPeriodRange(testDate, 'quarter');

      expect(result.from).toBe('2024-01-01');
      expect(result.to).toBe('2024-03-31');
    });

    it('should return correct year range', () => {
      const result = getPeriodRange(testDate, 'year');

      expect(result.from).toBe('2024-01-01');
      expect(result.to).toBe('2024-12-31');
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        getPeriodRange(testDate, 'invalid' as PeriodFormat);
      }).toThrow('Unsupported period format: invalid');
    });
  });

  describe('getNextPeriod', () => {
    const currentRange = {
      from: '2024-01-15',
      to: '2024-01-21',
    };

    it('should move week forward', () => {
      const result = getNextPeriod(currentRange, 'week');

      expect(result.from).toBe('2024-01-22'); // Следующий понедельник
      expect(result.to).toBe('2024-01-28'); // Следующее воскресенье
    });

    it('should move month forward', () => {
      const result = getNextPeriod(currentRange, 'month');

      expect(result.from).toBe('2024-02-01');
      expect(result.to).toBe('2024-02-29'); // 2024 - високосный год
    });

    it('should move quarter forward', () => {
      const result = getNextPeriod(currentRange, 'quarter');

      expect(result.from).toBe('2024-04-01');
      expect(result.to).toBe('2024-06-30');
    });

    it('should move year forward', () => {
      const result = getNextPeriod(currentRange, 'year');

      expect(result.from).toBe('2025-01-01');
      expect(result.to).toBe('2025-12-31');
    });
  });

  describe('getPreviousPeriod', () => {
    const currentRange = {
      from: '2024-01-15',
      to: '2024-01-21',
    };

    it('should move week backward', () => {
      const result = getPreviousPeriod(currentRange, 'week');

      expect(result.from).toBe('2024-01-08'); // Предыдущий понедельник
      expect(result.to).toBe('2024-01-14'); // Предыдущее воскресенье
    });

    it('should move month backward', () => {
      const result = getPreviousPeriod(currentRange, 'month');

      expect(result.from).toBe('2023-12-01');
      expect(result.to).toBe('2023-12-31');
    });

    it('should move quarter backward', () => {
      const result = getPreviousPeriod(currentRange, 'quarter');

      expect(result.from).toBe('2023-10-01');
      expect(result.to).toBe('2023-12-31');
    });

    it('should move year backward', () => {
      const result = getPreviousPeriod(currentRange, 'year');

      expect(result.from).toBe('2023-01-01');
      expect(result.to).toBe('2023-12-31');
    });
  });

  describe('formatPeriodDisplay', () => {
    const range = {
      from: '2024-01-15',
      to: '2024-01-21',
    };

    it('should format week display', () => {
      const result = formatPeriodDisplay(range, 'week');

      expect(result).toContain('15 янв');
      expect(result).toContain('21 янв. 2024');
    });

    it('should format month display', () => {
      const result = formatPeriodDisplay(range, 'month');

      expect(result).toBe('январь 2024');
    });

    it('should format quarter display', () => {
      const result = formatPeriodDisplay(range, 'quarter');

      expect(result).toBe('Q1 2024');
    });

    it('should format year display', () => {
      const result = formatPeriodDisplay(range, 'year');

      expect(result).toBe('2024');
    });

    it('should format default display for unknown format', () => {
      const result = formatPeriodDisplay(range, 'unknown' as PeriodFormat);

      expect(result).toBe('15.01.2024 - 21.01.2024');
    });
  });

  describe('getPeriodFormatOptions', () => {
    it('should return correct format options', () => {
      const options = getPeriodFormatOptions();

      expect(options).toHaveLength(4);
      expect(options).toEqual([
        { value: 'week', label: 'Неделя' },
        { value: 'month', label: 'Месяц' },
        { value: 'quarter', label: 'Квартал' },
        { value: 'year', label: 'Год' },
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle leap year correctly', () => {
      const leapYearDate = new Date('2024-02-15');
      const result = getPeriodRange(leapYearDate, 'month');

      expect(result.from).toBe('2024-02-01');
      expect(result.to).toBe('2024-02-29'); // 29 дней в феврале 2024
    });

    it('should handle year boundary correctly', () => {
      const newYearDate = new Date('2024-01-01');
      const result = getPeriodRange(newYearDate, 'year');

      expect(result.from).toBe('2024-01-01');
      expect(result.to).toBe('2024-12-31');
    });

    it('should handle quarter boundaries correctly', () => {
      const q1Date = new Date('2024-01-01');
      const q2Date = new Date('2024-04-01');
      const q3Date = new Date('2024-07-01');
      const q4Date = new Date('2024-10-01');

      expect(getPeriodRange(q1Date, 'quarter').from).toBe('2024-01-01');
      expect(getPeriodRange(q2Date, 'quarter').from).toBe('2024-04-01');
      expect(getPeriodRange(q3Date, 'quarter').from).toBe('2024-07-01');
      expect(getPeriodRange(q4Date, 'quarter').from).toBe('2024-10-01');
    });
  });
});
