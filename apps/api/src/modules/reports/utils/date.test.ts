import {
  getMonthKey,
  parseMonthKey,
  formatIntervalLabel,
  createIntervals,
} from './date';

describe('Date utilities', () => {
  describe('getMonthKey', () => {
    it('should return correct month key for January', () => {
      const date = new Date('2024-01-15');
      const result = getMonthKey(date);
      expect(result).toBe('2024-01');
    });

    it('should return correct month key for December', () => {
      const date = new Date('2024-12-15');
      const result = getMonthKey(date);
      expect(result).toBe('2024-12');
    });

    it('should handle leap year February', () => {
      const date = new Date('2024-02-29');
      const result = getMonthKey(date);
      expect(result).toBe('2024-02');
    });
  });

  describe('parseMonthKey', () => {
    it('should parse correct month key', () => {
      const result = parseMonthKey('2024-01');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(1);
    });

    it('should parse December correctly', () => {
      const result = parseMonthKey('2024-12');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11); // December is 11
      expect(result.getDate()).toBe(1);
    });
  });

  describe('formatIntervalLabel', () => {
    it('should format day interval correctly', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-15');
      const result = formatIntervalLabel(start, end, 'day');
      expect(result).toBe('15.01');
    });

    it('should format week interval correctly', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-21');
      const result = formatIntervalLabel(start, end, 'week');
      expect(result).toBe('21 янв');
    });

    it('should format month interval correctly', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const result = formatIntervalLabel(start, end, 'month');
      expect(result).toBe('янв 2024');
    });

    it('should format quarter interval correctly', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-03-31');
      const result = formatIntervalLabel(start, end, 'quarter');
      expect(result).toBe('мар 2024');
    });

    it('should format year interval correctly', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const result = formatIntervalLabel(start, end, 'year');
      expect(result).toBe('дек 2024');
    });

    it('should handle short intervals (≤2 days)', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-16');
      const result = formatIntervalLabel(start, end, 'day');
      expect(result).toBe('16.01');
    });

    it('should handle medium intervals (≤7 days)', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-20');
      const result = formatIntervalLabel(start, end, 'week');
      expect(result).toBe('20 янв');
    });
  });

  describe('createIntervals', () => {
    it('should create day intervals for short period', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-03');
      const result = createIntervals('day', fromDate, toDate);

      expect(result).toHaveLength(3);
      expect(result[0].start).toEqual(new Date('2024-01-01'));
      expect(result[0].end).toEqual(new Date('2024-01-01'));
      expect(result[1].start).toEqual(new Date('2024-01-02'));
      expect(result[1].end).toEqual(new Date('2024-01-02'));
      expect(result[2].start).toEqual(new Date('2024-01-03'));
      expect(result[2].end).toEqual(new Date('2024-01-03'));
    });

    it('should create week intervals for medium period', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');
      const result = createIntervals('week', fromDate, toDate);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].start).toEqual(new Date('2024-01-01'));
      expect(result[0].end).toEqual(new Date('2024-01-07'));
    });

    it('should create month intervals for long period', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-03-31');
      const result = createIntervals('month', fromDate, toDate);

      expect(result).toHaveLength(3);
      expect(result[0].start).toEqual(new Date('2024-01-01'));
      expect(result[0].end).toEqual(new Date('2024-01-31'));
      expect(result[1].start).toEqual(new Date('2024-02-01'));
      expect(result[1].end).toEqual(new Date('2024-02-29'));
      expect(result[2].start).toEqual(new Date('2024-03-01'));
      expect(result[2].end).toEqual(new Date('2024-03-31'));
    });

    it('should create quarter intervals for very long period', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');
      const result = createIntervals('quarter', fromDate, toDate);

      expect(result).toHaveLength(4);
      expect(result[0].start).toEqual(new Date('2024-01-01'));
      expect(result[0].end).toEqual(new Date('2024-03-31'));
      expect(result[1].start).toEqual(new Date('2024-04-01'));
      expect(result[1].end).toEqual(new Date('2024-06-30'));
      expect(result[2].start).toEqual(new Date('2024-07-01'));
      expect(result[2].end).toEqual(new Date('2024-09-30'));
      expect(result[3].start).toEqual(new Date('2024-10-01'));
      expect(result[3].end).toEqual(new Date('2024-12-31'));
    });

    it('should create year intervals for multi-year period', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2025-12-31');
      const result = createIntervals('year', fromDate, toDate);

      expect(result).toHaveLength(2);
      expect(result[0].start).toEqual(new Date('2024-01-01'));
      expect(result[0].end).toEqual(new Date('2024-12-31'));
      expect(result[1].start).toEqual(new Date('2025-01-01'));
      expect(result[1].end).toEqual(new Date('2025-12-31'));
    });

    it('should handle leap year correctly', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-02-29');
      const result = createIntervals('month', fromDate, toDate);

      expect(result).toHaveLength(2);
      expect(result[0].start).toEqual(new Date('2024-01-01'));
      expect(result[0].end).toEqual(new Date('2024-01-31'));
      expect(result[1].start).toEqual(new Date('2024-02-01'));
      expect(result[1].end).toEqual(new Date('2024-02-29'));
    });

    it('should handle single day period', () => {
      const fromDate = new Date('2024-01-15');
      const toDate = new Date('2024-01-15');
      const result = createIntervals('day', fromDate, toDate);

      expect(result).toHaveLength(1);
      expect(result[0].start).toEqual(new Date('2024-01-15'));
      expect(result[0].end).toEqual(new Date('2024-01-15'));
    });

    it('should handle cross-year period', () => {
      const fromDate = new Date('2023-12-01');
      const toDate = new Date('2024-02-29');
      const result = createIntervals('month', fromDate, toDate);

      expect(result).toHaveLength(3);
      expect(result[0].start).toEqual(new Date('2023-12-01'));
      expect(result[0].end).toEqual(new Date('2023-12-31'));
      expect(result[1].start).toEqual(new Date('2024-01-01'));
      expect(result[1].end).toEqual(new Date('2024-01-31'));
      expect(result[2].start).toEqual(new Date('2024-02-01'));
      expect(result[2].end).toEqual(new Date('2024-02-29'));
    });

    it('should limit intervals to reasonable number (5-12)', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');
      const result = createIntervals('day', fromDate, toDate);

      expect(result.length).toBeLessThanOrEqual(12);
      expect(result.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle edge case with very short period', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-01');
      const result = createIntervals('day', fromDate, toDate);

      expect(result).toHaveLength(1);
      expect(result[0].start).toEqual(new Date('2024-01-01'));
      expect(result[0].end).toEqual(new Date('2024-01-01'));
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid month key gracefully', () => {
      expect(() => parseMonthKey('invalid')).toThrow();
    });

    it('should handle empty month key gracefully', () => {
      expect(() => parseMonthKey('')).toThrow();
    });

    it('should handle malformed month key gracefully', () => {
      expect(() => parseMonthKey('2024-13')).toThrow();
    });

    it('should handle negative month key gracefully', () => {
      expect(() => parseMonthKey('2024-00')).toThrow();
    });
  });
});
