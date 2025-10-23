import {
  CURRENCIES,
  getCurrencyByCode,
  getCurrencyCodes,
  isValidCurrencyCode,
} from '../currencies';

describe('currencies', () => {
  describe('CURRENCIES array', () => {
    it('should contain expected currencies', () => {
      expect(CURRENCIES).toHaveLength(35);
    });

    it('should be sorted alphabetically by code', () => {
      const codes = CURRENCIES.map((currency) => currency.code);
      const sortedCodes = [...codes].sort();
      expect(codes).toEqual(sortedCodes);
    });

    it('should have all required properties for each currency', () => {
      CURRENCIES.forEach((currency) => {
        expect(currency).toHaveProperty('code');
        expect(currency).toHaveProperty('name');
        expect(currency).toHaveProperty('symbol');
        expect(typeof currency.code).toBe('string');
        expect(typeof currency.name).toBe('string');
        expect(typeof currency.symbol).toBe('string');
        expect(currency.code).toHaveLength(3);
        expect(currency.name.length).toBeGreaterThan(0);
        expect(currency.symbol.length).toBeGreaterThan(0);
      });
    });

    it('should have unique currency codes', () => {
      const codes = CURRENCIES.map((currency) => currency.code);
      const uniqueCodes = new Set(codes);
      expect(codes).toHaveLength(uniqueCodes.size);
    });

    it('should include major currencies', () => {
      const majorCurrencies = ['USD', 'EUR', 'RUB', 'CNY', 'JPY', 'GBP'];
      majorCurrencies.forEach((code) => {
        expect(CURRENCIES.some((currency) => currency.code === code)).toBe(
          true
        );
      });
    });
  });

  describe('getCurrencyByCode', () => {
    it('should return currency for valid code', () => {
      const currency = getCurrencyByCode('USD');
      expect(currency).toEqual({
        code: 'USD',
        name: 'Доллар США',
        symbol: '$',
      });
    });

    it('should return undefined for invalid code', () => {
      const currency = getCurrencyByCode('INVALID');
      expect(currency).toBeUndefined();
    });

    it('should be case sensitive', () => {
      const currency = getCurrencyByCode('usd');
      expect(currency).toBeUndefined();
    });
  });

  describe('getCurrencyCodes', () => {
    it('should return all currency codes', () => {
      const codes = getCurrencyCodes();
      expect(codes).toHaveLength(35);
      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
      expect(codes).toContain('RUB');
    });

    it('should return codes in alphabetical order', () => {
      const codes = getCurrencyCodes();
      const sortedCodes = [...codes].sort();
      expect(codes).toEqual(sortedCodes);
    });
  });

  describe('isValidCurrencyCode', () => {
    it('should return true for valid currency codes', () => {
      expect(isValidCurrencyCode('USD')).toBe(true);
      expect(isValidCurrencyCode('EUR')).toBe(true);
      expect(isValidCurrencyCode('RUB')).toBe(true);
    });

    it('should return false for invalid currency codes', () => {
      expect(isValidCurrencyCode('INVALID')).toBe(false);
      expect(isValidCurrencyCode('')).toBe(false);
      expect(isValidCurrencyCode('usd')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isValidCurrencyCode('USD')).toBe(true);
      expect(isValidCurrencyCode('usd')).toBe(false);
    });
  });
});
