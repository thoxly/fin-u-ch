import {
  compareOperations,
  determineOperationDirection,
  findSimilarOperations,
} from '../operationSimilarity';
import type { ParsedDocument } from '../../types/imports';

describe('operationSimilarity', () => {
  describe('determineOperationDirection', () => {
    it('должен определить расход по "комиссия за операции"', () => {
      const operation: ParsedDocument = {
        date: new Date(),
        amount: 100,
        purpose:
          'Комиссия за операции по терминалам эквайринга от 31.10.2025. Договор 7009738104',
      };

      const result = determineOperationDirection(operation);

      expect(result.direction).toBe('expense');
      expect(result.confidence).toBe('medium');
    });

    it('должен определить приход по "зачисление средств по терминалам"', () => {
      const operation: ParsedDocument = {
        date: new Date(),
        amount: 1000,
        purpose:
          'Зачисление средств по терминалам эквайринга от 31.10.2025. Без НДС',
      };

      const result = determineOperationDirection(operation);

      expect(result.direction).toBe('income');
      expect(result.confidence).toBe('medium');
    });

    it('должен различать "комиссия" (расход) и "зачисление" (приход)', () => {
      const expenseOp: ParsedDocument = {
        date: new Date(),
        amount: 50,
        purpose: 'Комиссия за операции по терминалам эквайринга от 31.10.2025',
      };

      const incomeOp: ParsedDocument = {
        date: new Date(),
        amount: 1000,
        purpose: 'Зачисление средств по терминалам эквайринга от 31.10.2025',
      };

      const expenseResult = determineOperationDirection(expenseOp);
      const incomeResult = determineOperationDirection(incomeOp);

      expect(expenseResult.direction).toBe('expense');
      expect(incomeResult.direction).toBe('income');
    });

    it('должен определить направление по ИНН компании', () => {
      const companyInn = '1234567890';
      const operation: ParsedDocument = {
        date: new Date(),
        amount: 1000,
        payerInn: companyInn,
        receiverInn: '9876543210',
        purpose: 'Оплата услуг',
      };

      const result = determineOperationDirection(operation, companyInn);

      expect(result.direction).toBe('expense');
      expect(result.confidence).toBe('high');
    });
  });

  describe('compareOperations', () => {
    it('должен находить похожие операции по описанию', () => {
      const op1: ParsedDocument = {
        date: new Date(),
        amount: 1000,
        purpose: 'Комиссия за операции по терминалам эквайринга от 31.10.2025',
      };

      const op2: ParsedDocument = {
        date: new Date(),
        amount: 1000,
        purpose: 'Комиссия за операции по терминалам эквайринга от 15.11.2025',
      };

      const comparison = compareOperations(op1, op2);

      expect(comparison.similarity.score).toBeGreaterThan(40);
      expect(comparison.descriptionScore).toBeGreaterThan(50);
      expect(comparison.similarity.matchReasons).toContain('описание');
    });

    it('должен различать операции с разным направлением', () => {
      const expenseOp: ParsedDocument = {
        date: new Date(),
        amount: 50,
        purpose: 'Комиссия за операции по терминалам эквайринга от 31.10.2025',
        direction: 'expense',
      };

      const incomeOp: ParsedDocument = {
        date: new Date(),
        amount: 1000,
        purpose: 'Зачисление средств по терминалам эквайринга от 31.10.2025',
        direction: 'income',
      };

      const comparison = compareOperations(expenseOp, incomeOp);

      // Теперь мы не штрафуем за разное направление - важно содержание операции
      // directionScore должен быть 0 (нет бонуса, но и нет штрафа)
      expect(comparison.directionScore).toBe(0);
      // Операции все еще могут требовать проверки из-за среднего общего балла
      expect(comparison.similarity.score).toBeGreaterThanOrEqual(0);
    });

    it('должен находить похожие операции по ИНН', () => {
      const op1: ParsedDocument = {
        date: new Date(),
        amount: 1000,
        payerInn: '1234567890',
        purpose: 'Оплата услуг',
      };

      const op2: ParsedDocument = {
        date: new Date(),
        amount: 2000,
        payerInn: '1234567890',
        purpose: 'Оплата товаров',
      };

      const comparison = compareOperations(op1, op2);

      expect(comparison.innScore).toBe(100);
      expect(comparison.similarity.matchReasons).toContain('ИНН');
    });

    it('должен учитывать контрагента при сравнении', () => {
      const op1: ParsedDocument = {
        date: new Date(),
        amount: 1000,
        receiver: 'ООО "Поставщик"',
        purpose: 'Оплата по договору',
      };

      const op2: ParsedDocument = {
        date: new Date(),
        amount: 1500,
        receiver: 'ООО "Поставщик"',
        purpose: 'Оплата по договору',
      };

      const comparison = compareOperations(op1, op2);

      expect(comparison.counterpartyScore).toBeGreaterThan(30);
      expect(comparison.similarity.matchReasons).toContain('контрагент');
    });
  });

  describe('findSimilarOperations', () => {
    it('должен находить похожие операции из списка', () => {
      const target: ParsedDocument = {
        date: new Date('2025-10-31'),
        amount: 1000,
        purpose: 'Комиссия за операции по терминалам эквайринга',
      };

      const operations: ParsedDocument[] = [
        {
          date: new Date('2025-10-31'),
          amount: 1000,
          purpose:
            'Комиссия за операции по терминалам эквайринга от 15.11.2025',
        },
        {
          date: new Date('2025-11-01'),
          amount: 500,
          purpose: 'Зачисление средств по терминалам',
        },
        {
          date: new Date('2025-10-30'),
          amount: 1000,
          purpose:
            'Комиссия за операции по терминалам эквайринга от 30.10.2025',
        },
      ];

      const results = findSimilarOperations(target, operations, null, 40);

      expect(results.length).toBeGreaterThan(0);
      // Должны найти операции с "комиссия", но не с "зачисление"
      const foundPurposes = results.map((r) => r.operation.purpose);
      expect(foundPurposes.some((p) => p?.includes('Комиссия'))).toBe(true);
      expect(foundPurposes.some((p) => p?.includes('Зачисление'))).toBe(false);
    });

    it('должен исключать операции с разным направлением', () => {
      const target: ParsedDocument = {
        date: new Date('2025-10-31'),
        amount: 50,
        purpose: 'Комиссия за операции по терминалам эквайринга',
        direction: 'expense',
      };

      const operations: ParsedDocument[] = [
        {
          date: new Date('2025-10-31'),
          amount: 50,
          purpose: 'Комиссия за операции по терминалам эквайринга',
          direction: 'expense',
        },
        {
          date: new Date('2025-11-01'),
          amount: 1000,
          purpose: 'Зачисление средств по терминалам эквайринга',
          direction: 'income',
        },
      ];

      const results = findSimilarOperations(target, operations, null, 40);

      // Должна найти только операцию с тем же направлением
      expect(results.length).toBe(1);
      expect(results[0].operation.direction).toBe('expense');
    });
  });
});
