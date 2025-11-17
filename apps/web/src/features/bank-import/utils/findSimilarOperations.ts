import type { ImportedOperation } from '@shared/types/imports';

/**
 * Извлекает ключевые слова из текста
 */
const extractKeywords = (text: string | null | undefined): string[] => {
  if (!text) return [];

  const normalized = text.toLowerCase().trim();
  const keywords: string[] = [];

  // Список ключевых слов для поиска
  const keywordPatterns = [
    /ндфл/gi,
    /енп/gi,
    /сбп/gi,
    /налог/gi,
    /взнос/gi,
    /страх(?:ов)?/gi,
    /пенс(?:ионн)?/gi,
    /зарплат/gi,
    /аренд/gi,
    /коммунальн/gi,
    /услуг/gi,
    /поставк/gi,
    /перечисл(?:ение)?/gi,
    /пополнен(?:ие)?/gi,
    /оплат/gi,
    /возврат/gi,
    /terminal|терминал/gi,
  ];

  keywordPatterns.forEach((pattern) => {
    const matches = normalized.match(pattern);
    if (matches) {
      keywords.push(...matches.map((m) => m.toLowerCase()));
    }
  });

  return [...new Set(keywords)]; // Убираем дубликаты
};

/**
 * Удаляет переменные части из описания (даты, номера, суммы)
 */
const cleanDescription = (text: string | null | undefined): string => {
  if (!text) return '';

  let cleaned = text.toLowerCase().trim();

  // Удаляем даты в различных форматах
  cleaned = cleaned.replace(/\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}/g, '');
  cleaned = cleaned.replace(
    /(?:январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр)[а-я]*/gi,
    ''
  );

  // Удаляем номера операций/документов
  cleaned = cleaned.replace(/№\s*\d+/g, '');
  cleaned = cleaned.replace(/\bн[ао]мер\s*\d+/g, '');
  cleaned = cleaned.replace(/\b\d{6,}/g, ''); // Длинные номера (6+ цифр)

  // Удаляем суммы
  cleaned = cleaned.replace(/\d+[\s.,]\d+\s*(?:руб|₽|р\.?)?/g, '');

  // Удаляем лишние пробелы
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
};

/**
 * Функция для определения похожих операций
 * Операции считаются похожими, если:
 * 1. Совпадают ключевые слова в описании (НДФЛ, ЕНП, СБП и т.д.)
 * 2. Описание похоже после удаления переменных частей (даты, номера)
 * 3. Совпадает контрагент или ИНН
 */
export const findSimilarOperations = (
  targetOperation: ImportedOperation,
  allOperations: ImportedOperation[]
): ImportedOperation[] => {
  // Определяем контрагента и ИНН текущей операции
  const targetCounterparty =
    targetOperation.direction === 'expense'
      ? targetOperation.receiver
      : targetOperation.payer;

  const targetInn =
    targetOperation.direction === 'expense'
      ? targetOperation.receiverInn
      : targetOperation.payerInn;

  // Извлекаем ключевые слова и очищенное описание
  const targetKeywords = extractKeywords(targetOperation.description);
  const targetCleanedDesc = cleanDescription(targetOperation.description);
  const targetCounterpartyNormalized = (targetCounterparty || '')
    .toLowerCase()
    .trim();

  // Если нет описания, не ищем похожие операции
  if (!targetOperation.description || targetCleanedDesc.length < 5) {
    return [];
  }

  return allOperations.filter((operation) => {
    // Не включаем саму операцию
    if (operation.id === targetOperation.id) {
      return false;
    }

    // Не включаем уже обработанные операции
    if (operation.processed) {
      return false;
    }

    // Получаем контрагента для сравнения
    const operationCounterparty =
      operation.direction === 'expense' ? operation.receiver : operation.payer;

    const operationInn =
      operation.direction === 'expense'
        ? operation.receiverInn
        : operation.payerInn;

    const operationKeywords = extractKeywords(operation.description);
    const operationCleanedDesc = cleanDescription(operation.description);
    const operationCounterpartyNormalized = (operationCounterparty || '')
      .toLowerCase()
      .trim();

    // Если нет описания, пропускаем
    if (!operation.description || operationCleanedDesc.length < 5) {
      return false;
    }

    // Подсчет совпадений
    let matchScore = 0;

    // 1. Проверка ключевых слов (сильное совпадение)
    if (targetKeywords.length > 0 && operationKeywords.length > 0) {
      const commonKeywords = targetKeywords.filter((kw) =>
        operationKeywords.includes(kw)
      );
      if (commonKeywords.length > 0) {
        matchScore += 3; // Высокий вес для ключевых слов
      }
    }

    // 2. Проверка очищенного описания (средний вес)
    if (targetCleanedDesc.length >= 10 && operationCleanedDesc.length >= 10) {
      // Используем более гибкое сравнение - проверяем, содержатся ли слова друг в друге
      const targetWords = targetCleanedDesc
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const operationWords = operationCleanedDesc
        .split(/\s+/)
        .filter((w) => w.length > 3);

      const commonWords = targetWords.filter((word) =>
        operationWords.some(
          (opWord) => opWord.includes(word) || word.includes(opWord)
        )
      );

      if (commonWords.length >= 2) {
        matchScore += 2;
      } else if (commonWords.length >= 1) {
        matchScore += 1;
      }
    }

    // 3. Проверка ИНН (сильное совпадение)
    if (targetInn && operationInn && targetInn === operationInn) {
      matchScore += 2;
    }

    // 4. Проверка контрагента (средний вес)
    if (targetCounterpartyNormalized && operationCounterpartyNormalized) {
      // Проверяем, что один содержит другой (частичное совпадение)
      const counterpartyMatch =
        targetCounterpartyNormalized.includes(
          operationCounterpartyNormalized
        ) ||
        operationCounterpartyNormalized.includes(targetCounterpartyNormalized);

      if (counterpartyMatch && targetCounterpartyNormalized.length > 3) {
        matchScore += 1;
      }
    }

    // Считаем операции похожими, если общий балл >= 3
    // Или если есть ключевые слова и ИНН/контрагент
    return matchScore >= 3 || (targetKeywords.length > 0 && matchScore >= 2);
  });
};

/**
 * Группирует операции по похожести
 */
export const groupSimilarOperations = (
  operations: ImportedOperation[]
): Map<string, ImportedOperation[]> => {
  const groups = new Map<string, ImportedOperation[]>();
  const processed = new Set<string>();

  operations.forEach((operation) => {
    if (processed.has(operation.id)) {
      return;
    }

    const similar = findSimilarOperations(operation, operations);
    if (similar.length > 0) {
      const groupKey = operation.id;
      const group = [operation, ...similar];
      groups.set(groupKey, group);

      // Помечаем все операции группы как обработанные
      group.forEach((op) => processed.add(op.id));
    }
  });

  return groups;
};
