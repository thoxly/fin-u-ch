import { getAggregationIntervals, createDefaultIntervals } from './dataAggregation';
import { PeriodFormat } from '../types/period';

describe('Data Aggregation - Label Deduplication', () => {
  describe('getAggregationIntervals', () => {
    it('should not create duplicate labels for quarter period', () => {
      const fromDate = new Date('2025-04-01');
      const toDate = new Date('2025-06-30');
      
      const intervals = getAggregationIntervals(
        'quarter' as PeriodFormat,
        fromDate,
        toDate,
        0
      );
      
      // Проверяем, что все лейблы уникальны
      const labels = intervals.map(interval => interval.label);
      const uniqueLabels = new Set(labels);
      
      expect(labels.length).toBe(uniqueLabels.size);
      expect(labels).toEqual(['1-й квартал', '2-й квартал', '3-й квартал']);
    });

    it('should not create duplicate labels for year period', () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-12-31');
      
      const intervals = getAggregationIntervals(
        'year' as PeriodFormat,
        fromDate,
        toDate,
        0
      );
      
      // Проверяем, что все лейблы уникальны
      const labels = intervals.map(interval => interval.label);
      const uniqueLabels = new Set(labels);
      
      expect(labels.length).toBe(uniqueLabels.size);
      expect(labels.length).toBe(12); // 12 месяцев в году
    });
  });

  describe('createDefaultIntervals', () => {
    it('should not create duplicate labels for quarter period', () => {
      const fromDate = new Date('2025-04-01');
      const toDate = new Date('2025-06-30');
      
      const intervals = createDefaultIntervals(
        'quarter' as PeriodFormat,
        fromDate,
        toDate
      );
      
      // Проверяем, что все лейблы уникальны
      const labels = intervals.map(interval => interval.label);
      const uniqueLabels = new Set(labels);
      
      expect(labels.length).toBe(uniqueLabels.size);
      expect(labels).toEqual(['1-й квартал', '2-й квартал', '3-й квартал']);
    });

    it('should not create duplicate labels for year period', () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-12-31');
      
      const intervals = createDefaultIntervals(
        'year' as PeriodFormat,
        fromDate,
        toDate
      );
      
      // Проверяем, что все лейблы уникальны
      const labels = intervals.map(interval => interval.label);
      const uniqueLabels = new Set(labels);
      
      expect(labels.length).toBe(uniqueLabels.size);
      expect(labels.length).toBe(12); // 12 месяцев в году
    });
  });

  describe('Quarter logic with different operation counts', () => {
    it('should create 3 points for quarter with few operations (≤10)', () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-09-30');
      
      const intervals = getAggregationIntervals(
        'quarter' as PeriodFormat,
        fromDate,
        toDate,
        5 // Few operations
      );
      
      expect(intervals).toHaveLength(3);
      expect(intervals[0].label).toBe('1-й квартал');
      expect(intervals[1].label).toBe('2-й квартал');
      expect(intervals[2].label).toBe('3-й квартал');
    });

    it('should create 5 points for quarter with many operations (>10)', () => {
      const fromDate = new Date('2025-04-01');
      const toDate = new Date('2025-06-30');
      
      const intervals = getAggregationIntervals(
        'quarter' as PeriodFormat,
        fromDate,
        toDate,
        25 // Many operations
      );
      
      expect(intervals).toHaveLength(3); // Should show months: апр, май, июн
      const labels = intervals.map(interval => interval.label);
      expect(labels).toEqual(['апр. 2025', 'мая 2025', 'июн. 2025']);
    });
  });

  describe('Edge cases', () => {
    it('should handle single month period', () => {
      const fromDate = new Date('2025-05-01');
      const toDate = new Date('2025-05-31');
      
      const intervals = getAggregationIntervals(
        'quarter' as PeriodFormat,
        fromDate,
        toDate,
        0
      );
      
      expect(intervals).toHaveLength(3);
      expect(intervals[0].label).toBe('1-й квартал');
    });

    it('should handle cross-year period', () => {
      const fromDate = new Date('2024-12-01');
      const toDate = new Date('2025-02-28');
      
      const intervals = getAggregationIntervals(
        'quarter' as PeriodFormat,
        fromDate,
        toDate,
        0
      );
      
      const labels = intervals.map(interval => interval.label);
      const uniqueLabels = new Set(labels);
      
      expect(labels.length).toBe(uniqueLabels.size);
      expect(labels).toEqual(['1-й квартал', '2-й квартал', '3-й квартал']);
    });
  });
});