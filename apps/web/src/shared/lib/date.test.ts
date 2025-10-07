import { formatDate, formatDateTime, formatMonth, getCurrentMonth, toISODate } from './date';

describe('Date Utils', () => {
  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    it('should format ISO string date', () => {
      const date = '2024-03-15';
      const result = formatDate(date);
      expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    it('should format date with custom format', () => {
      const date = new Date('2024-03-15');
      const result = formatDate(date, 'yyyy-MM-dd');
      expect(result).toBe('2024-03-15');
    });
  });

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const date = new Date('2024-03-15T14:30:00Z');
      const result = formatDateTime(date);
      expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
    });
  });

  describe('formatMonth', () => {
    it('should format date as month and year', () => {
      const date = new Date('2024-03-15');
      const result = formatMonth(date);
      expect(result).toContain('2024');
    });
  });

  describe('getCurrentMonth', () => {
    it('should return current month in yyyy-MM format', () => {
      const result = getCurrentMonth();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('toISODate', () => {
    it('should convert date to ISO format', () => {
      const date = new Date('2024-03-15T14:30:00Z');
      const result = toISODate(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

