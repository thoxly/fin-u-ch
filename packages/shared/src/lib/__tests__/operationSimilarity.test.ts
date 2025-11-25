import {
  determineOperationDirection,
  findSimilarOperations,
  extractTags,
  normalizeText,
} from '../operationSimilarity';
import type { ParsedDocument } from '../../types/imports';

describe('operationSimilarity', () => {
  describe('normalizeText', () => {
    it('should normalize text correctly', () => {
      const text = 'Оплата по счету № 123-45 от 01.01.2025 в т.ч. НДС 20%';
      const normalized = normalizeText(text);
      expect(normalized).not.toContain('123-45');
      expect(normalized).not.toContain('01.01.2025');
      expect(normalized).not.toContain('ндс');
    });
  });

  describe('extractTags', () => {
    it('should extract travel_accommodation tag', () => {
      const op: ParsedDocument = {
        date: new Date(),
        amount: 100,
        purpose: 'Оплата за проживание в гостинице',
      };
      const tags = extractTags(op);
      expect(tags[0]).toBe('travel_accommodation');
    });

    it('should extract acquiring_fee tag', () => {
      const op: ParsedDocument = {
        date: new Date(),
        amount: 100,
        purpose: 'Комиссия за операции по терминалам',
      };
      const tags = extractTags(op);
      expect(tags[0]).toBe('acquiring_fee');
    });

    it('should return "other" if no tags found', () => {
      const op: ParsedDocument = {
        date: new Date(),
        amount: 100,
        purpose: 'Непонятная операция',
      };
      const tags = extractTags(op);
      expect(tags[0]).toBe('other');
    });
  });

  describe('findSimilarOperations', () => {
    it('should find operations with same primary tag', () => {
      const target = {
        id: '1',
        date: new Date(),
        amount: 100,
        purpose: 'Оплата за проживание',
      } as ParsedDocument & { id: string };

      const all = [
        {
          id: '2',
          date: new Date(),
          amount: 200,
          purpose: 'Оплата гостиницы', // travel_accommodation
        },
        {
          id: '3',
          date: new Date(),
          amount: 300,
          purpose: 'Зачисление средств', // acquiring_income
        },
      ] as (ParsedDocument & { id: string })[];

      const similar = findSimilarOperations(target, all) as (ParsedDocument & {
        id: string;
      })[];
      expect(similar.length).toBe(1);
      expect(similar[0].id).toBe('2');
    });

    it('should not find similar operations if target is "other"', () => {
      const target = {
        id: '1',
        date: new Date(),
        amount: 100,
        purpose: 'Непонятное',
      } as ParsedDocument & { id: string };

      const all = [
        {
          id: '2',
          date: new Date(),
          amount: 200,
          purpose: 'Тоже непонятное',
        },
      ] as (ParsedDocument & { id: string })[];

      const similar = findSimilarOperations(target, all);
      expect(similar.length).toBe(0);
    });
  });

  describe('determineOperationDirection', () => {
    it('should detect direction by tag', () => {
      const op: ParsedDocument = {
        date: new Date(),
        amount: 100,
        purpose: 'Комиссия за операции по терминалам',
      };
      const result = determineOperationDirection(op);
      expect(result.direction).toBe('expense');
    });

    it('should detect direction by INN', () => {
      const companyInn = '111';
      const op: ParsedDocument = {
        date: new Date(),
        amount: 100,
        payerInn: '111',
        receiverInn: '222',
      };
      const result = determineOperationDirection(op, companyInn);
      expect(result.direction).toBe('expense');
    });
  });
});
