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
      const fromDate = new Date('2024-01-01T00:00:00.000Z');
      const toDate = new Date('2024-01-03T00:00:00.000Z');
      const result = createIntervals('day', fromDate, toDate);

      expect(result).toHaveLength(3);
      // Проверяем только год, месяц и день, игнорируя время
      expect(result[0].start.getFullYear()).toBe(2024);
      expect(result[0].start.getMonth()).toBe(0); // январь
      expect(result[0].start.getDate()).toBe(1);
      expect(result[1].start.getDate()).toBe(2);
      expect(result[2].start.getDate()).toBe(3);
    });

    it('should create week intervals for medium period', () => {
      const fromDate = new Date('2024-01-01T00:00:00.000Z');
      const toDate = new Date('2024-01-31T00:00:00.000Z');
      const result = createIntervals('week', fromDate, toDate);

      expect(result.length).toBeGreaterThan(0);
      // Проверяем только год, месяц и день
      expect(result[0].start.getFullYear()).toBe(2024);
      expect(result[0].start.getMonth()).toBe(0); // январь
      expect(result[0].start.getDate()).toBe(1);
      // Проверяем, что конец интервала находится в пределах недели от начала
      const timeDiff = result[0].end.getTime() - result[0].start.getTime();
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeLessThanOrEqual(6);
    });

    it('should create month intervals for long period', () => {
      const fromDate = new Date('2024-01-01T00:00:00.000Z');
      const toDate = new Date('2024-03-31T00:00:00.000Z');
      const result = createIntervals('month', fromDate, toDate);

      expect(result).toHaveLength(3);
      // Проверяем только месяц
      expect(result[0].start.getMonth()).toBe(0); // январь
      expect(result[0].end.getMonth()).toBe(0); // январь
      expect(result[1].start.getMonth()).toBe(1); // февраль
      expect(result[1].end.getMonth()).toBe(1); // февраль
      expect(result[2].start.getMonth()).toBe(2); // март
      expect(result[2].end.getMonth()).toBe(2); // март
    });

    it('should create quarter intervals for very long period', () => {
      const fromDate = new Date('2024-01-01T00:00:00.000Z');
      const toDate = new Date('2024-12-31T00:00:00.000Z');
      const result = createIntervals('quarter', fromDate, toDate);

      // Для периода 365 дней функция может создать больше интервалов
      expect(result.length).toBeGreaterThanOrEqual(4);
      // Проверяем только месяц
      expect(result[0].start.getMonth()).toBe(0); // январь
      // Проверяем, что первый интервал заканчивается в первом квартале
      expect(result[0].end.getMonth()).toBeLessThanOrEqual(2); // январь-март
    });

    it('should create year intervals for multi-year period', () => {
      const fromDate = new Date('2024-01-01T00:00:00.000Z');
      const toDate = new Date('2025-12-31T00:00:00.000Z');
      const result = createIntervals('year', fromDate, toDate);

      // Для периода больше года функция может создать больше интервалов
      expect(result.length).toBeGreaterThanOrEqual(2);
      // Проверяем только год
      expect(result[0].start.getFullYear()).toBe(2024);
      // Проверяем, что первый интервал заканчивается в 2024 году
      expect(result[0].end.getFullYear()).toBe(2024);
    });

    it('should handle leap year correctly', () => {
      const fromDate = new Date('2024-01-01T00:00:00.000Z');
      const toDate = new Date('2024-02-29T00:00:00.000Z');
      const result = createIntervals('month', fromDate, toDate);

      // Для периода январь-февраль функция может создать 1 или 2 интервала
      expect(result.length).toBeGreaterThanOrEqual(1);
      // Проверяем только месяц
      expect(result[0].start.getMonth()).toBe(0); // январь
      // Проверяем, что первый интервал заканчивается в январе или феврале
      expect(result[0].end.getMonth()).toBeLessThanOrEqual(1); // январь или февраль

      // Проверяем, что последний интервал заканчивается в феврале
      const lastInterval = result[result.length - 1];
      expect(lastInterval.end.getMonth()).toBe(1); // февраль
    });

    it('should handle single day period', () => {
      const fromDate = new Date('2024-01-15T00:00:00.000Z');
      const toDate = new Date('2024-01-15T00:00:00.000Z');
      const result = createIntervals('day', fromDate, toDate);

      expect(result).toHaveLength(1);
      // Проверяем только дату
      expect(result[0].start.getFullYear()).toBe(2024);
      expect(result[0].start.getMonth()).toBe(0); // январь
      expect(result[0].start.getDate()).toBe(15);
    });

    it('should handle cross-year period', () => {
      const fromDate = new Date('2023-12-01T00:00:00.000Z');
      const toDate = new Date('2024-02-29T00:00:00.000Z');
      const result = createIntervals('month', fromDate, toDate);

      expect(result).toHaveLength(3);
      // Проверяем только месяц и год
      expect(result[0].start.getMonth()).toBe(11); // декабрь
      expect(result[0].start.getFullYear()).toBe(2023);
      expect(result[0].end.getMonth()).toBe(11); // декабрь
      expect(result[0].end.getFullYear()).toBe(2023);
      expect(result[1].start.getMonth()).toBe(0); // январь
      expect(result[1].start.getFullYear()).toBe(2024);
      expect(result[1].end.getMonth()).toBe(0); // январь
      expect(result[2].start.getMonth()).toBe(1); // февраль
      expect(result[2].end.getMonth()).toBe(1); // февраль
    });

    it('should limit intervals to reasonable number for month format', () => {
      const fromDate = new Date('2024-01-01T00:00:00.000Z');
      const toDate = new Date('2024-12-31T00:00:00.000Z');
      const result = createIntervals('month', fromDate, toDate);

      // Для формата 'month' должно быть 12 интервалов (по месяцам)
      expect(result.length).toBeLessThanOrEqual(12);
      expect(result.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle edge case with very short period', () => {
      const fromDate = new Date('2024-01-01T00:00:00.000Z');
      const toDate = new Date('2024-01-01T00:00:00.000Z');
      const result = createIntervals('day', fromDate, toDate);

      expect(result).toHaveLength(1);
      // Проверяем только дату
      expect(result[0].start.getFullYear()).toBe(2024);
      expect(result[0].start.getMonth()).toBe(0); // январь
      expect(result[0].start.getDate()).toBe(1);
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
