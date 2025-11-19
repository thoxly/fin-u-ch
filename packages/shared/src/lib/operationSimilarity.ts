import type { ParsedDocument } from '../types/imports';

/**
 * Результат анализа похожести операций
 */
export interface SimilarityResult {
  score: number; // Общий балл похожести (0-100)
  matchReasons: string[]; // Причины совпадения
  requiresReview: boolean; // Требует ли ручной проверки
  directionHint?: 'income' | 'expense' | null; // Подсказка направления на основе текста
}

/**
 * Результат сравнения двух операций
 */
export interface OperationComparison {
  similarity: SimilarityResult;
  descriptionScore: number;
  counterpartyScore: number;
  innScore: number;
  amountScore: number;
  directionScore: number;
}

/**
 * Ключевые слова для определения направления операции
 * Приоритет: более специфичные паттерны проверяются первыми
 */
const INCOME_KEYWORDS = [
  /зачислен(?:ие|ия|ен|ены)?\s+(?:средств|денег|сумм)/gi, // "зачисление средств"
  /зачислен(?:ие|ия|ен|ены)?\s+по\s+терминал/gi, // "зачисление по терминалам"
  /зачислен(?:ие|ия|ен|ены)?/gi,
  /поступлен(?:ие|ия|ен|ены)?\s+(?:средств|денег|сумм)/gi, // "поступление средств"
  /поступлен(?:ие|ия|ен|ены)?/gi,
  /возврат\s+(?:средств|денег|сумм)/gi, // "возврат средств"
  /возврат/gi,
  /возмещен(?:ие|ия|ен|ены)?/gi,
  /выручк[аи]\s+от\s+продаж/gi, // "выручка от продаж"
  /выручк[аи]/gi,
  /доход/gi,
  /оплат[аы]?\s+(?:от|от\s+покупател)/gi, // "оплата от покупателя"
  /перечислен(?:ие|ия|ен|ены)?\s+(?:на|в)\s+счет/gi,
];

const EXPENSE_KEYWORDS = [
  /комисси[яи]\s+за\s+операци/gi, // "комиссия за операции" - очень специфично для расхода
  /комисси[яи]\s+за/gi, // "комиссия за"
  /комисси[яи]/gi,
  /списан(?:ие|ия|ен|ены)?\s+(?:средств|денег|сумм)/gi, // "списание средств"
  /списан(?:ие|ия|ен|ены)?/gi,
  /оплат[аы]?\s+(?:за|по)\s+(?:услуг|товар|поставк)/gi, // "оплата за услуги"
  /оплат[аы]?\s+(?:за|по)/gi,
  /платеж\s+(?:за|по)/gi,
  /перечислен(?:ие|ия|ен|ены)?\s+(?:за|по)\s+(?:услуг|товар|поставк)/gi,
  /перечислен(?:ие|ия|ен|ены)?\s+(?:за|по)/gi,
  /уплат[аы]?\s+(?:налог|штраф|пен)/gi,
  /уплат[аы]?/gi,
  /взнос/gi,
  /налог/gi,
  /штраф/gi,
  /пен[яи]/gi,
];

/**
 * Нормализует текст для сравнения
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zа-яё0-9\s]/gi, ''); // Оставляем только буквы (латиница и кириллица), цифры и пробелы
}

/**
 * Очищает описание от переменных частей (даты, номера, суммы)
 */
function cleanDescription(text: string | null | undefined): string {
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
  cleaned = cleaned.replace(/\bдоговор\s*\d+/gi, '');

  // Удаляем конструкцию "по счету/счетам ..." ЦЕЛИКОМ со всеми номерами
  cleaned = cleaned.replace(
    /\bпо\s+счет(?:у|ам|а|ов)?\s+[^,\sа-яё]+(?:\s*,\s*[^,\sа-яё]+)*/gi,
    ''
  );

  // Удаляем оставшиеся номера
  cleaned = cleaned.replace(/[a-zа-яё0-9]+-[a-zа-яё0-9-]+/gi, ''); // 1-Б2Б-5258096560-n
  cleaned = cleaned.replace(/\b[a-zа-яё]{1,3}\d{4,}/gi, ''); // БГ0009906, EN000000647
  cleaned = cleaned.replace(/\b\d{2,}/g, ''); // Все числа длиннее 2 цифр (142, 2218, 20 и т.д.)

  // Удаляем любые упоминания счетов
  cleaned = cleaned.replace(/\b(?:по\s+)?счет(?:у|ам|а|ов)?/gi, '');

  // Удаляем суммы и проценты
  cleaned = cleaned.replace(/\d+[\s.,]\d+\s*(?:руб|₽|р\.?|рублей)?/gi, '');
  cleaned = cleaned.replace(/\bндс\s+(?:не\s+облагается|\d+\s*%)/gi, 'ндс'); // Унифицируем НДС
  cleaned = cleaned.replace(/\bв\s+том\s+числе\s+ндс/gi, 'ндс'); // Удаляем "в том числе НДС"

  // Удаляем предлоги "от" после удаления дат
  cleaned = cleaned.replace(/\s+от\s+(?=\s|,|$)/g, ' ');

  // Удаляем лишние пробелы и запятые
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/,\s*,/g, ','); // Двойные запятые
  cleaned = cleaned.replace(/,\s*$/g, ''); // Запятые в конце

  return cleaned;
}

/**
 * Извлекает ключевые слова из текста
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractKeywords(text: string | null | undefined): string[] {
  if (!text) return [];

  const normalized = normalizeText(text);
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
    /эквайринг/gi,
    /комисси/gi,
    /зачислен/gi,
    /списан/gi,
  ];

  keywordPatterns.forEach((pattern) => {
    const matches = normalized.match(pattern);
    if (matches) {
      keywords.push(...matches.map((m) => m.toLowerCase()));
    }
  });

  return [...new Set(keywords)]; // Убираем дубликаты
}

/**
 * Определяет направление операции на основе текста назначения платежа
 * Улучшенная версия с учетом контекста и приоритетов
 */
function detectDirectionFromText(
  purpose: string | null | undefined
): 'income' | 'expense' | null {
  if (!purpose) return null;

  const normalized = normalizeText(purpose);
  let incomeScore = 0;
  let expenseScore = 0;

  // Проверяем ключевые слова прихода (более специфичные первыми)
  INCOME_KEYWORDS.forEach((pattern, index) => {
    if (pattern.test(normalized)) {
      // Более специфичные паттерны (первые в списке) дают больше баллов
      const weight = INCOME_KEYWORDS.length - index;
      incomeScore += weight;
    }
    pattern.lastIndex = 0; // Сбрасываем lastIndex
  });

  // Проверяем ключевые слова расхода (более специфичные первыми)
  EXPENSE_KEYWORDS.forEach((pattern, index) => {
    if (pattern.test(normalized)) {
      // Более специфичные паттерны (первые в списке) дают больше баллов
      const weight = EXPENSE_KEYWORDS.length - index;
      expenseScore += weight;
    }
    pattern.lastIndex = 0; // Сбрасываем lastIndex
  });

  // Дополнительные проверки для критических случаев
  // "комиссия за операции" - всегда расход, даже если есть слово "зачисление" в другом месте
  if (normalized.match(/комисси[яи]\s+за\s+операци/gi)) {
    expenseScore += 10; // Очень высокий приоритет
  }

  // "зачисление средств по терминалам" - всегда приход
  if (
    normalized.match(
      /зачислен(?:ие|ия|ен|ены)?\s+(?:средств|денег)?\s+по\s+терминал/gi
    )
  ) {
    incomeScore += 10; // Очень высокий приоритет
  }

  // Если есть явные признаки расхода (комиссия, списание) в начале фразы
  if (normalized.match(/^(?:комисси|списан)/)) {
    expenseScore += 5;
  }

  // Если есть явные признаки прихода (зачисление, поступление) в начале фразы
  if (normalized.match(/^(?:зачислен|поступлен)/)) {
    incomeScore += 5;
  }

  // Принимаем решение с учетом разницы в баллах
  // Если разница небольшая, считаем неопределенным
  const scoreDiff = Math.abs(incomeScore - expenseScore);
  const minDiff = 2; // Минимальная разница для принятия решения

  if (incomeScore > expenseScore && scoreDiff >= minDiff && incomeScore > 0) {
    return 'income';
  }
  if (expenseScore > incomeScore && scoreDiff >= minDiff && expenseScore > 0) {
    return 'expense';
  }

  return null;
}

/**
 * Вычисляет схожесть двух текстов на основе общих слов
 */
function calculateTextSimilarity(
  text1: string | null | undefined,
  text2: string | null | undefined
): number {
  if (!text1 || !text2) return 0;

  const cleaned1 = cleanDescription(text1);
  const cleaned2 = cleanDescription(text2);

  if (cleaned1.length < 5 || cleaned2.length < 5) return 0;

  const words1 = cleaned1
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w.toLowerCase());
  const words2 = cleaned2
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w.toLowerCase());

  if (words1.length === 0 || words2.length === 0) return 0;

  // Находим общие слова
  const commonWords = words1.filter((word) =>
    words2.some((w2) => w2.includes(word) || word.includes(w2) || w2 === word)
  );

  // Вычисляем процент совпадения
  const maxWords = Math.max(words1.length, words2.length);
  return (commonWords.length / maxWords) * 100;
}

/**
 * Вычисляет схожесть контрагентов
 */
function calculateCounterpartySimilarity(
  name1: string | null | undefined,
  name2: string | null | undefined
): number {
  if (!name1 || !name2) return 0;

  const norm1 = normalizeText(name1);
  const norm2 = normalizeText(name2);

  if (norm1.length < 3 || norm2.length < 3) return 0;

  // Точное совпадение
  if (norm1 === norm2) return 100;

  // Один содержит другой
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    return (minLen / maxLen) * 80; // До 80% за частичное совпадение
  }

  // Простое сравнение по словам
  const words1 = norm1.split(/\s+/).filter((w) => w.length > 2);
  const words2 = norm2.split(/\s+/).filter((w) => w.length > 2);

  const commonWords = words1.filter((w) => words2.includes(w));
  if (commonWords.length === 0) return 0;

  const maxWords = Math.max(words1.length, words2.length);
  return (commonWords.length / maxWords) * 60; // До 60% за совпадение слов
}

/**
 * Сравнивает две операции и вычисляет их похожесть
 */
export function compareOperations(
  op1: ParsedDocument | { purpose?: string | null; amount: number },
  op2: ParsedDocument | { purpose?: string | null; amount: number },
  _companyInn?: string | null
): OperationComparison {
  const purpose1 = 'purpose' in op1 ? op1.purpose : op1.purpose;
  const purpose2 = 'purpose' in op2 ? op2.purpose : op2.purpose;

  // 1. Сравнение описания
  const descriptionScore = calculateTextSimilarity(purpose1, purpose2);

  // 2. Сравнение контрагентов
  let counterpartyScore = 0;
  // Проверяем наличие полей контрагентов (payer или receiver) в обеих операциях
  if (
    ('payer' in op1 || 'receiver' in op1) &&
    ('payer' in op2 || 'receiver' in op2)
  ) {
    counterpartyScore = Math.max(
      calculateCounterpartySimilarity(
        'payer' in op1 ? op1.payer : undefined,
        'payer' in op2 ? op2.payer : undefined
      ),
      calculateCounterpartySimilarity(
        'receiver' in op1 ? op1.receiver : undefined,
        'receiver' in op2 ? op2.receiver : undefined
      )
    );
  }

  // 3. Сравнение ИНН
  let innScore = 0;
  if ('payerInn' in op1 && 'payerInn' in op2) {
    const inn1 = op1.payerInn || op1.receiverInn;
    const inn2 = op2.payerInn || op2.receiverInn;
    if (inn1 && inn2 && inn1 === inn2) {
      innScore = 100;
    }
  }

  // 4. Сравнение суммы (похожие суммы могут указывать на связь)
  const amountDiff = Math.abs(op1.amount - op2.amount);
  const maxAmount = Math.max(Math.abs(op1.amount), Math.abs(op2.amount));
  // Смягчаем влияние суммы - только если очень близкие
  const normalizedAmountScore = amountDiff < maxAmount * 0.01 ? 20 : 0;

  // 5. Сравнение направления (на основе текста и фактического направления)
  // При поиске похожих операций направление не должно быть критичным фактором
  // Важно содержание операции ("оплата за товар"), а не детали НДС или направления
  let directionScore = 0;
  const direction1 = detectDirectionFromText(purpose1);
  const direction2 = detectDirectionFromText(purpose2);

  // Если у операций есть явное направление, используем его
  let actualDirection1: 'income' | 'expense' | null = null;
  let actualDirection2: 'income' | 'expense' | null = null;

  if ('direction' in op1 && op1.direction) {
    const dir = op1.direction;
    actualDirection1 =
      dir === 'transfer'
        ? null
        : dir === 'income' || dir === 'expense'
          ? dir
          : null;
  }
  if ('direction' in op2 && op2.direction) {
    const dir = op2.direction;
    actualDirection2 =
      dir === 'transfer'
        ? null
        : dir === 'income' || dir === 'expense'
          ? dir
          : null;
  }

  // Используем фактическое направление, если есть, иначе текстовое
  const finalDirection1 = actualDirection1 || direction1;
  const finalDirection2 = actualDirection2 || direction2;

  if (finalDirection1 && finalDirection2) {
    if (finalDirection1 === finalDirection2) {
      directionScore = 20; // Небольшой бонус за одинаковое направление
    }
    // Не штрафуем за разное направление - важно содержание, а не детали
  } else if (direction1 && direction2) {
    // Если есть только текстовые направления
    if (direction1 === direction2) {
      directionScore = 15; // Небольшой бонус за одинаковое направление
    }
    // Не штрафуем за разное направление
  }

  // Вычисляем общий балл с весами
  const totalScore =
    descriptionScore * 0.4 + // Описание - самый важный фактор
    counterpartyScore * 0.25 + // Контрагент
    innScore * 0.2 + // ИНН - очень надежный признак
    normalizedAmountScore * 0.1 + // Сумма
    directionScore; // Направление (может быть отрицательным)

  // КРИТИЧНО: Если описание сильно отличается, операция не может быть похожей
  // даже при совпадении ИНН и направления
  const MIN_DESCRIPTION_SCORE = 20; // Минимальный порог схожести описаний
  let finalScore = totalScore;
  let requiresReview = false;

  if (descriptionScore < MIN_DESCRIPTION_SCORE) {
    // Если описания слишком разные, снижаем общий балл
    // Это предотвращает ложные совпадения только по ИНН/направлению
    const penalty = (MIN_DESCRIPTION_SCORE - descriptionScore) * 2;
    finalScore = Math.max(0, totalScore - penalty);
    requiresReview = true; // Всегда требует проверки при низком совпадении описания
  }

  // Собираем причины совпадения
  const matchReasons: string[] = [];
  if (descriptionScore > 50) {
    matchReasons.push('описание');
  }
  if (counterpartyScore > 30) {
    matchReasons.push('контрагент');
  }
  if (innScore > 0) {
    matchReasons.push('ИНН');
  }
  if (normalizedAmountScore > 0) {
    matchReasons.push('сумма');
  }
  if (directionScore > 0) {
    matchReasons.push('направление');
  }

  // Определяем, требуется ли проверка
  // Требует проверки, если:
  // - Средний балл схожести (между 35 и 55)
  // - Высокое совпадение описания, но нет других признаков
  // - Низкое совпадение описания, но есть совпадения по другим параметрам
  // Разное направление больше не требует обязательной проверки - важно содержание
  if (!requiresReview) {
    requiresReview =
      (finalScore > 35 && finalScore < 55) || // Средний балл - возможна неточность
      (descriptionScore > 50 && counterpartyScore < 20 && innScore === 0) || // Высокое совпадение описания, но нет других признаков
      (descriptionScore < 30 && (innScore > 0 || counterpartyScore > 30)); // Низкое совпадение описания, но есть другие признаки
  }

  return {
    similarity: {
      score: Math.max(0, Math.min(100, finalScore)),
      matchReasons,
      requiresReview,
      directionHint: direction1 || direction2 || null,
    },
    descriptionScore,
    counterpartyScore,
    innScore,
    amountScore: normalizedAmountScore,
    directionScore,
  };
}

/**
 * Находит похожие операции из списка
 */
export function findSimilarOperations<T extends ParsedDocument>(
  targetOperation: T,
  allOperations: T[],
  companyInn?: string | null,
  minScore: number = 40
): Array<{ operation: T; comparison: OperationComparison }> {
  const results: Array<{ operation: T; comparison: OperationComparison }> = [];

  for (const operation of allOperations) {
    // Пропускаем саму операцию
    if ('id' in targetOperation && 'id' in operation) {
      if (targetOperation.id === operation.id) continue;
    }

    const comparison = compareOperations(
      targetOperation,
      operation,
      companyInn
    );

    if (comparison.similarity.score >= minScore) {
      results.push({ operation, comparison });
    }
  }

  // Сортируем по убыванию похожести
  results.sort(
    (a, b) => b.comparison.similarity.score - a.comparison.similarity.score
  );

  return results;
}

/**
 * Определяет направление операции на основе всех доступных данных
 */
export function determineOperationDirection(
  operation: ParsedDocument,
  companyInn?: string | null
): {
  direction: 'income' | 'expense' | 'transfer' | null;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
} {
  const reasons: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // 1. Проверка по ИНН (самый надежный способ)
  if (companyInn) {
    const normalizedCompanyInn = companyInn.replace(/\s/g, '').trim();
    const normalizedPayerInn = operation.payerInn?.replace(/\s/g, '').trim();
    const normalizedReceiverInn = operation.receiverInn
      ?.replace(/\s/g, '')
      .trim();

    if (
      normalizedPayerInn &&
      normalizedReceiverInn &&
      normalizedPayerInn === normalizedCompanyInn &&
      normalizedReceiverInn === normalizedCompanyInn
    ) {
      return {
        direction: 'transfer',
        confidence: 'high',
        reasons: ['ИНН плательщика и получателя совпадают с компанией'],
      };
    }

    if (
      normalizedPayerInn &&
      normalizedPayerInn === normalizedCompanyInn &&
      normalizedReceiverInn !== normalizedCompanyInn
    ) {
      return {
        direction: 'expense',
        confidence: 'high',
        reasons: ['ИНН плательщика совпадает с компанией'],
      };
    }

    if (
      normalizedReceiverInn &&
      normalizedReceiverInn === normalizedCompanyInn &&
      normalizedPayerInn !== normalizedCompanyInn
    ) {
      return {
        direction: 'income',
        confidence: 'high',
        reasons: ['ИНН получателя совпадает с компанией'],
      };
    }
  }

  // 2. Проверка по тексту назначения платежа
  const textDirection = detectDirectionFromText(operation.purpose);
  if (textDirection) {
    reasons.push('ключевые слова в назначении платежа');
    confidence = 'medium';
    return {
      direction: textDirection,
      confidence,
      reasons,
    };
  }

  // 3. Не удалось определить
  return {
    direction: null,
    confidence: 'low',
    reasons: ['недостаточно данных для определения направления'],
  };
}
