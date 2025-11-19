import type { ImportedOperation } from '@shared/types/imports';
import {
  findSimilarOperations as findSimilarOperationsShared,
  type OperationComparison,
} from '@fin-u-ch/shared';

/**
 * Результат поиска похожих операций с дополнительной информацией
 */
export interface SimilarOperationResult {
  operation: ImportedOperation;
  comparison: OperationComparison;
}

// Re-export для удобства
export type { OperationComparison };

/**
 * Функция для определения похожих операций
 * Использует улучшенный алгоритм из shared пакета
 * Фильтрует операции с заблокированными полями и требующие проверки
 */
export const findSimilarOperations = (
  targetOperation: ImportedOperation,
  allOperations: ImportedOperation[],
  companyInn?: string | null,
  minScore: number = 40,
  fieldToUpdate?: string // Поле, которое будет обновляться
): SimilarOperationResult[] => {
  // Преобразуем ImportedOperation в ParsedDocument для сравнения
  const targetDoc = {
    date: new Date(targetOperation.date),
    amount: targetOperation.amount,
    payer: targetOperation.payer || undefined,
    payerInn: targetOperation.payerInn || undefined,
    receiver: targetOperation.receiver || undefined,
    receiverInn: targetOperation.receiverInn || undefined,
    purpose: targetOperation.description || undefined,
    direction: targetOperation.direction || undefined,
  };

  // Фильтруем операции (исключаем обработанные, саму операцию и с заблокированными полями)
  const candidateOperations = allOperations.filter((op) => {
    if (op.id === targetOperation.id || op.processed) {
      return false;
    }

    // Если указано поле для обновления, проверяем, не заблокировано ли оно
    if (fieldToUpdate) {
      let lockedFields: string[] = [];
      try {
        lockedFields = op.lockedFields ? JSON.parse(op.lockedFields) : [];
      } catch {
        lockedFields = [];
      }

      // Маппинг полей UI на поля БД
      const fieldMapping: Record<string, string> = {
        article: 'matchedArticleId',
        counterparty: 'matchedCounterpartyId',
        account: 'matchedAccountId',
        deal: 'matchedDealId',
        department: 'matchedDepartmentId',
        currency: 'currency',
        direction: 'direction',
      };

      const dbField = fieldMapping[fieldToUpdate];
      if (dbField && lockedFields.includes(dbField)) {
        return false; // Пропускаем операции с заблокированным полем
      }
    }

    return true;
  });

  // Используем shared функцию для поиска похожих
  const candidateDocs = candidateOperations.map((op) => ({
    date: new Date(op.date),
    amount: op.amount,
    payer: op.payer || undefined,
    payerInn: op.payerInn || undefined,
    receiver: op.receiver || undefined,
    receiverInn: op.receiverInn || undefined,
    purpose: op.description || undefined,
    direction: op.direction || undefined,
  }));

  const results = findSimilarOperationsShared(
    targetDoc,
    candidateDocs,
    companyInn,
    minScore
  );

  // Создаем мапу для быстрого поиска операций по индексу
  const resultsWithOperations: SimilarOperationResult[] = [];
  for (const result of results) {
    // Находим соответствующую операцию по индексу в candidateDocs
    const docIndex = candidateDocs.findIndex(
      (doc) =>
        doc.purpose === result.operation.purpose &&
        doc.amount === result.operation.amount &&
        Math.abs(
          new Date(doc.date).getTime() -
            new Date(result.operation.date).getTime()
        ) < 1000
    );
    if (docIndex >= 0) {
      // Показываем все похожие операции, даже с разным направлением
      // Пользователь должен иметь возможность сам решить, применять ли сопоставление
      // Предупреждение о разном направлении уже включено в requiresReview
      const comparison = result.comparison;

      resultsWithOperations.push({
        operation: candidateOperations[docIndex],
        comparison: comparison,
      });
    }
  }

  return resultsWithOperations;
};

/**
 * Группирует операции по похожести
 */
export const groupSimilarOperations = (
  operations: ImportedOperation[],
  companyInn?: string | null
): Map<string, ImportedOperation[]> => {
  const groups = new Map<string, ImportedOperation[]>();
  const processed = new Set<string>();

  operations.forEach((operation) => {
    if (processed.has(operation.id)) {
      return;
    }

    const similar = findSimilarOperations(operation, operations, companyInn);
    if (similar.length > 0) {
      const groupKey = operation.id;
      const group = [operation, ...similar.map((s) => s.operation)];
      groups.set(groupKey, group);

      // Помечаем все операции группы как обработанные
      group.forEach((op) => processed.add(op.id));
    }
  });

  return groups;
};
