import type { ImportedOperation } from '@shared/types/imports';
import {
  findSimilarOperations as findSimilarOperationsShared,
  extractTags,
} from '@fin-u-ch/shared';

export interface OperationComparison {
  similarity: {
    score: number;
    matchReasons: string[];
    requiresReview: boolean;
    directionHint?: 'income' | 'expense' | null;
  };
  descriptionScore: number;
  counterpartyScore: number;
  innScore: number;
  amountScore: number;
  directionScore: number;
}

/**
 * Результат поиска похожих операций с дополнительной информацией
 */
export interface SimilarOperationResult {
  operation: ImportedOperation;
  comparison: OperationComparison;
}

/**
 * Функция для определения похожих операций
 * Использует новый алгоритм на основе тегов
 */
export const findSimilarOperations = (
  targetOperation: ImportedOperation,
  allOperations: ImportedOperation[],
  _companyInn?: string | null, // ИНН компании больше не используется для поиска похожих
  _minScore: number = 40, // minScore больше не используется
  fieldToUpdate?: string // Поле, которое будет обновляться
): SimilarOperationResult[] => {
  // Преобразуем ImportedOperation в формат, понятный shared функции
  const targetDoc = {
    id: targetOperation.id,
    date: new Date(targetOperation.date),
    amount: targetOperation.amount,
    payer: targetOperation.payer || undefined,
    payerInn: targetOperation.payerInn || undefined,
    receiver: targetOperation.receiver || undefined,
    receiverInn: targetOperation.receiverInn || undefined,
    purpose: targetOperation.description || undefined,
    direction: targetOperation.direction || undefined,
  };

  // Получаем теги для целевой операции
  const targetTags = extractTags(targetDoc);
  const primaryTag = targetTags[0];

  // Если тег 'other', то похожих не ищем
  if (primaryTag === 'other') {
    return [];
  }

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

  // Преобразуем кандидатов
  const candidateDocs = candidateOperations.map((op) => ({
    id: op.id,
    date: new Date(op.date),
    amount: op.amount,
    payer: op.payer || undefined,
    payerInn: op.payerInn || undefined,
    receiver: op.receiver || undefined,
    receiverInn: op.receiverInn || undefined,
    purpose: op.description || undefined,
    direction: op.direction || undefined,
  }));

  // Ищем похожие через shared функцию
  // Она возвращает массив похожих операций (ParsedDocument[])
  const similarDocs = findSimilarOperationsShared(targetDoc, candidateDocs);

  // Собираем результаты
  const results: SimilarOperationResult[] = [];

  // Создаем мапу id -> ImportedOperation для быстрого доступа
  const operationsMap = new Map(candidateOperations.map((op) => [op.id, op]));

  for (const doc of similarDocs) {
    // @ts-expect-error: doc имеет id, так как мы его передавали
    const op = operationsMap.get(doc.id);
    if (op) {
      results.push({
        operation: op,
        comparison: {
          similarity: {
            score: 100, // В новой логике совпадение тега = 100% (условно)
            matchReasons: [`Тег: ${primaryTag}`],
            requiresReview: false, // Теговая логика считается надежной
            directionHint: null,
          },
          descriptionScore: 100,
          counterpartyScore: 0,
          innScore: 0,
          amountScore: 0,
          directionScore: 0,
        },
      });
    }
  }

  return results;
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
