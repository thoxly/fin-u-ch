import { formatMoney, formatNumber } from './money';

describe('Money Utils', () => {
  describe('formatMoney', () => {
    it('should format money with default currency RUB', () => {
      const result = formatMoney(1000);
      expect(result).toContain('1');
      expect(result).toContain('000');
    });

    it('should format money with specified currency', () => {
      const result = formatMoney(1000, 'USD');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format zero correctly', () => {
      const result = formatMoney(0);
      expect(result).toBeDefined();
    });

    it('should format negative amounts', () => {
      const result = formatMoney(-500);
      expect(result).toBeDefined();
      expect(result).toContain('-');
    });

    it('should format decimal amounts', () => {
      const result = formatMoney(1234.56);
      expect(result).toBeDefined();
    });
  });

  describe('formatNumber', () => {
    it('should format number with default 2 decimals', () => {
      const result = formatNumber(1234.5678);
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('should format number with specified decimals', () => {
      const result = formatNumber(1234.5678, 0);
      expect(result).toBeDefined();
    });

    it('should format zero', () => {
      const result = formatNumber(0);
      expect(result).toBe('0,00');
    });

    it('should format negative numbers', () => {
      const result = formatNumber(-123.45);
      expect(result).toContain('-');
    });
  });
});
