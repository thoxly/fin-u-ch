import { AppError } from '../../../middlewares/error';
import logger from '../../../config/logger';
import type { ParsedDocument } from '@fin-u-ch/shared';
import { createOperationHash } from '@fin-u-ch/shared/lib/operationHash';
import iconv from 'iconv-lite';

// Re-export ParsedDocument for backward compatibility
export type { ParsedDocument };

export interface ParsedFile {
  documents: ParsedDocument[];
  companyAccountNumber?: string;
  stats: {
    documentsStarted: number;
    documentsFound: number;
    documentsSkipped: number;
    documentsInvalid: number;
    documentTypesFound: string[];
    skippedDocumentTypes: Array<{ type: string; count: number }>;
  };
}

/**
 * Поддерживаемые типы документов
 * Нормализуем к нижнему регистру без пробелов для проверки
 */
const SUPPORTED_DOC_TYPES = [
  'платежноепоручение',
  'банковскийордер',
  'мемориальныйордер',
  'инкассовоепоручение',
  'объявлениенавзносналичными',
  'взнос',
  'списание',
  'поступление',
  'платежныйордер',
  'реестрсписаний',
  'комиссия',
  'sbp',
  'сбп',
  'cbp',
  'чек',
  'карточныеоперации',
  'карточная',
  'payment',
  'платеж',
  'ордер',
];

// Универсальный словарь для нормализации ключей документа
const KEY_MAPPING: Record<string, string[]> = {
  date: ['дата', 'date', 'датапроводки', 'dateposted'],
  dateWrittenOff: [
    'датасписано',
    'датаcписано',
    'datadebit',
    'writeoffdate',
    'датасписания',
  ],
  dateReceived: [
    'датапоступило',
    'creditdate',
    'датапоступления',
    'receivedate',
  ],
  number: ['номер', 'номердокумента', 'number', 'номерплатежки', 'docnumber'],
  amount: [
    'сумма',
    'amount',
    'суммаплатежа',
    'суммадокумента',
    'total',
    'documentamount',
    'суммадокументапоступило',
    'суммадокументасписано',
  ],
  payer: [
    'плательщик',
    'плательщик1',
    'payer',
    'отправитель',
    'sender',
    'плательщикнаименование',
  ],
  payerInn: [
    'плательщикинн',
    'иннплательщика',
    'payerinn',
    'плательщик1инн',
    'senderinn',
  ],
  payerKpp: [
    'плательщиккпп',
    'кппплательщика',
    'payerkpp',
    'плательщик1кпп',
    'senderkpp',
  ],
  payerAccount: [
    'плательщиксчет',
    'плательщикрасчсчет',
    'плательщикрасчетныйсчет',
    'плательщик1расчсчет',
    'payeraccount',
    'счетплательщика',
    'senderaccount',
  ],
  payerCorrAccount: [
    'плательщиккорсчет',
    'плательщиккорреспондентскийсчет',
    'плательщик1корсчет',
    'payercorraccount',
  ],
  payerBank: [
    'плательщикбанк1',
    'плательщикбанк',
    'банкплательщика',
    'payerbank',
    'senderbank',
  ],
  payerBankBik: [
    'плательщикбик',
    'бикплательщика',
    'плательщикрсбик',
    'payerbankbik',
    'senderbik',
  ],
  receiver: [
    'получатель',
    'получатель1',
    'receiver',
    'получательнаименование',
    'receivername',
  ],
  receiverInn: [
    'получателинн',
    'получательинн',
    'иннполучателя',
    'receiverinn',
    'получатель1инн',
  ],
  receiverKpp: [
    'получателькпп',
    'получателькпп',
    'кппполучателя',
    'receiverkpp',
    'получатель1кпп',
  ],
  receiverAccount: [
    'получательсчет',
    'получателсчет',
    'получательрасчсчет',
    'получателрасчсчет',
    'получательрасчетныйсчет',
    'получатель1расчсчет',
    'receiveraccount',
    'счетполучателя',
  ],
  receiverCorrAccount: [
    'получателькорсчет',
    'получателькорреспондентскийсчет',
    'получатель1корсчет',
    'receivercorraccount',
  ],
  receiverBank: [
    'получательбанк1',
    'получательбанк',
    'получателбанк1',
    'получателбанк',
    'банкполучателя',
    'receiverbank',
  ],
  receiverBankBik: [
    'получательбик',
    'получателбик',
    'бикполучателя',
    'получательрсбик',
    'получателрсбик',
    'receiverbankbik',
  ],
  purpose: [
    'назначениеплатежа',
    'назначение',
    'purpose',
    'наименованиеплатежа',
    'описание',
    'description',
  ],
};

/**
 * Нормализует строку ключа для поиска в словаре
 * Удаляет пробелы, переводит в нижний регистр, убирает невидимые символы
 */
function normalizeKeyString(key: string): string {
  return (
    key
      .toLowerCase()
      .replace(/\s+/g, '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\uFEFF\u200B-\u200D\u2060\u0000]/g, '')
  );
}

/**
 * Находит нормализованное имя поля по любому варианту ключа
 * Поддерживает fuzzy matching для устойчивости к вариациям
 */
function normalizeKey(rawKey: string): string | null {
  const normalized = normalizeKeyString(rawKey);

  // Прямой поиск в словаре
  for (const [fieldName, variants] of Object.entries(KEY_MAPPING)) {
    if (variants.includes(normalized)) {
      return fieldName;
    }
  }

  // Fallback: поиск через includes для случаев с опечатками и вариациями
  for (const [fieldName, variants] of Object.entries(KEY_MAPPING)) {
    for (const variant of variants) {
      // Проверяем взаимное включение для гибкости
      if (normalized.includes(variant) || variant.includes(normalized)) {
        return fieldName;
      }
    }
  }

  return null;
}

/**
 * Проверяет, является ли тип документа поддерживаемым
 * Использует нормализацию и includes для гибкой проверки
 */
function isSupportedDocumentType(docType: string): boolean {
  if (!docType) {
    // Пустой тип считаем поддерживаемым (для обратной совместимости)
    return true;
  }

  const normalized = normalizeKeyString(docType);

  // Проверяем точное совпадение
  if (SUPPORTED_DOC_TYPES.includes(normalized)) {
    return true;
  }

  // Проверяем, содержится ли хотя бы один поддерживаемый тип в названии документа
  for (const supportedType of SUPPORTED_DOC_TYPES) {
    if (normalized.includes(supportedType)) {
      return true;
    }
  }

  return false;
}

/**
 * Декодирует содержимое файла с автоопределением кодировки
 * Поддерживает: Windows-1251, UTF-8, UTF-8 с BOM, Windows-1251 с BOM
 */
function decodeFile(content: Buffer | string): string {
  if (!Buffer.isBuffer(content)) {
    // Если строка, очищаем от BOM и невидимых символов
    // eslint-disable-next-line no-control-regex
    return content.trim().replace(/[\uFEFF\u200B-\u200D\u2060\u0000]/g, '');
  }

  let text: string;

  // Убираем BOM если есть
  let bufferToCheck = content;
  if (
    content.length >= 3 &&
    content[0] === 0xef &&
    content[1] === 0xbb &&
    content[2] === 0xbf
  ) {
    // UTF-8 BOM
    bufferToCheck = content.slice(3);
    text = bufferToCheck.toString('utf8');
    logger.info('Parser: File encoding = UTF-8 with BOM');
    // eslint-disable-next-line no-control-regex
    return text.replace(/[\uFEFF\u200B-\u200D\u2060\u0000]/g, '');
  }

  // Проверяем, есть ли в первых 500 байтах признаки UTF-8
  const sample = bufferToCheck.slice(0, Math.min(500, bufferToCheck.length));
  const utf8Text = sample.toString('utf8');
  const hasValidUTF8 = !utf8Text.includes('\ufffd'); // Проверяем наличие символа замены

  // Пробуем UTF-8
  if (hasValidUTF8) {
    const fullUtf8Text = bufferToCheck.toString('utf8');
    const hasHeader = fullUtf8Text
      .substring(0, 500)
      .includes('1CClientBankExchange');
    const hasCyrillic = /[а-яёА-ЯЁ]/.test(fullUtf8Text.substring(0, 500));

    if (hasHeader && hasCyrillic) {
      logger.info('Parser: File encoding = UTF-8');
      text = fullUtf8Text;
      // eslint-disable-next-line no-control-regex
      return text.trim().replace(/[\uFEFF\u200B-\u200D\u2060\u0000]/g, '');
    }
  }

  // Пробуем Windows-1251 (стандарт для 1С)
  try {
    text = iconv.decode(bufferToCheck, 'win1251');
    const hasCyrillic = /[а-яёА-ЯЁ]/.test(text.substring(0, 500));
    const hasHeader = text.substring(0, 500).includes('1CClientBankExchange');

    if (hasCyrillic && hasHeader) {
      logger.info('Parser: File encoding = Windows-1251 ✅');
      // eslint-disable-next-line no-control-regex
      text = text.trim().replace(/[\uFEFF\u200B-\u200D\u2060\u0000]/g, '');
      return text;
    }

    // Если есть заголовок, но нет кириллицы - всё равно используем win1251
    if (hasHeader) {
      logger.info('Parser: File encoding = Windows-1251 (forced)');
      // eslint-disable-next-line no-control-regex
      text = text.trim().replace(/[\uFEFF\u200B-\u200D\u2060\u0000]/g, '');
      return text;
    }
  } catch (error) {
    logger.warn('Parser: Failed to decode as win1251', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Последний fallback - UTF-8
  logger.warn('Parser: Using UTF-8 as last fallback');
  text = bufferToCheck.toString('utf8');
  // eslint-disable-next-line no-control-regex
  return text.trim().replace(/[\uFEFF\u200B-\u200D\u2060\u0000]/g, '');
}

/**
 * Разделяет текст файла на секции
 * Возвращает только секции документов (СекцияДокумент ... КонецДокумента)
 * Фильтрует пустые секции без пар key=value
 */
function splitIntoSections(text: string): {
  documentSections: string[];
  headerLines: string[];
} {
  const lines = text.split(/\r?\n/);
  const documentSections: string[] = [];
  const headerLines: string[] = [];

  let currentSection: string[] | null = null;
  let inDocument = false;
  let inHeader = true;
  let sectionStartCount = 0;
  let sectionEndCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    const normalized = normalizeKeyString(trimmed);

    // Начало документа - строго проверяем "СекцияДокумент"
    if (normalized.startsWith('секциядокумент')) {
      sectionStartCount++;
      inHeader = false;
      if (currentSection) {
        // Сохраняем предыдущий документ, если он валидный
        const sectionText = currentSection.join('\n');
        if (isValidSection(sectionText)) {
          documentSections.push(sectionText);
        }
      }
      currentSection = [trimmed];
      inDocument = true;
      continue;
    }

    // Конец документа
    if (normalized === 'конецдокумента' || normalized === 'конецдокумент') {
      sectionEndCount++;
      if (currentSection) {
        // НЕ добавляем маркер конца в секцию
        const sectionText = currentSection.join('\n');
        // Проверяем, что секция содержит хотя бы одну пару key=value
        if (isValidSection(sectionText)) {
          documentSections.push(sectionText);
        }
        currentSection = null;
      }
      inDocument = false;
      continue;
    }

    // Игнорируем секции счетов
    if (
      normalized.startsWith('секциярасчсчет') ||
      normalized === 'конецрасчсчет'
    ) {
      inDocument = false;
      currentSection = null;
      continue;
    }

    // Собираем строки
    if (inHeader) {
      headerLines.push(trimmed);
    } else if (inDocument && currentSection) {
      currentSection.push(trimmed);
    }
  }

  // Добавляем последний документ, если он валидный
  if (currentSection) {
    const sectionText = currentSection.join('\n');
    if (isValidSection(sectionText)) {
      documentSections.push(sectionText);
    }
  }

  logger.info('Parser: Sections split completed', {
    sectionStartCount,
    sectionEndCount,
    documentSectionsCount: documentSections.length,
    headerLinesCount: headerLines.length,
  });

  if (documentSections.length > 0) {
    logger.debug('Parser: First section preview', {
      firstSectionPreview: documentSections[0].substring(0, 500),
    });
  }

  return { documentSections, headerLines };
}

/**
 * Проверяет, содержит ли секция хотя бы одну пару key=value
 */
function isValidSection(sectionText: string): boolean {
  const lines = sectionText.split('\n');
  // Первая строка - заголовок секции, остальные - данные
  const dataLines = lines.slice(1);

  // Ищем хотя бы одну строку с символом '=' (пара key=value)
  return dataLines.some((line) => {
    const trimmed = line.trim();
    return trimmed.includes('=') && trimmed.indexOf('=') > 0;
  });
}

/**
 * Парсит строки секции документа с поддержкой многострочных значений
 * Возвращает объект ключ-значение
 * Сохраняет все ключи, даже если они не распознаны в KEY_MAPPING
 */
function parseKeyValuePairs(lines: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const rawFields: Record<string, string> = {}; // Для неопознанных полей
  let currentKey: string | null = null;
  let currentRawKey: string | null = null;
  let currentValue: string[] = [];

  const flushCurrent = () => {
    if (currentKey && currentValue.length > 0) {
      result[currentKey] = currentValue.join(' ').trim();
    } else if (currentRawKey && currentValue.length > 0) {
      // Сохраняем неопознанные поля для отладки
      rawFields[currentRawKey] = currentValue.join(' ').trim();
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const equalIndex = trimmed.indexOf('=');

    if (equalIndex > 0) {
      // Новая пара ключ=значение
      flushCurrent();

      const rawKey = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();

      // Убираем кавычки
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1).trim();
      }

      const normalizedKey = normalizeKey(rawKey);
      if (normalizedKey) {
        currentKey = normalizedKey;
        currentRawKey = null;
        currentValue = [value];
      } else {
        // Не выбрасываем неопознанные ключи, сохраняем их
        currentKey = null;
        currentRawKey = rawKey;
        currentValue = [value];
      }
    } else if (currentKey || currentRawKey) {
      // Продолжение многострочного значения
      currentValue.push(trimmed);
    }
  }

  flushCurrent();

  // Логируем неопознанные поля для отладки
  if (Object.keys(rawFields).length > 0) {
    logger.debug('Parser: Found unrecognized fields', {
      rawFields,
      recognizedFields: result,
    });
  }

  return result;
}

/**
 * Извлекает дату документа с правильным приоритетом
 * Приоритет: ДатаСписано -> ДатаПоступило -> Дата
 * Логика: для списаний используем ДатаСписано, для поступлений - ДатаПоступило
 */
function getDocumentDate(
  fields: Record<string, string>,
  sectionIndex?: number
): Date | null {
  const logForFirst = sectionIndex === 0;

  if (logForFirst) {
    logger.info('Parser: getDocumentDate called for FIRST doc', {
      fieldsKeys: Object.keys(fields),
      hasDate: !!fields.date,
      hasDateWrittenOff: !!fields.dateWrittenOff,
      hasDateReceived: !!fields.dateReceived,
    });
  }

  // Пытаемся извлечь дату по приоритету
  const datePriority = [
    { field: 'dateWrittenOff', label: 'ДатаСписано' },
    { field: 'dateReceived', label: 'ДатаПоступило' },
    { field: 'date', label: 'Дата' },
  ];

  for (const { field, label } of datePriority) {
    const value = fields[field];
    if (value) {
      try {
        const parsedDate = parseDate(value);
        if (logForFirst) {
          logger.info(`Parser: ✅ Successfully parsed ${label}`, {
            field,
            value,
            parsedDate,
          });
        }
        return parsedDate;
      } catch (error) {
        if (logForFirst) {
          logger.warn(`Parser: Failed to parse ${label}`, {
            field,
            value,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  if (logForFirst) {
    logger.warn('Parser: ❌ No valid date found in any field', {
      fieldsKeys: Object.keys(fields),
    });
  }

  return null;
}

/**
 * Извлекает сумму документа
 * Универсальная логика: все варианты сумм (СуммаДокументаПоступило, СуммаДокументаСписано и т.д.)
 * должны быть нормализованы в единое поле amount
 */
function getDocumentAmount(
  fields: Record<string, string>,
  sectionIndex?: number
): number | null {
  const logForFirst = sectionIndex === 0;

  if (logForFirst) {
    logger.info('Parser: getDocumentAmount called for FIRST doc', {
      fieldsKeys: Object.keys(fields),
      hasAmountField: !!fields.amount,
      amountValue: fields.amount,
    });
  }

  // После нормализации все варианты сумм должны быть в поле 'amount'
  if (fields.amount) {
    try {
      const parsedAmount = parseAmount(fields.amount);
      if (logForFirst) {
        logger.info('Parser: ✅ Successfully parsed amount', {
          rawValue: fields.amount,
          parsedAmount,
        });
      }
      return parsedAmount;
    } catch (error) {
      if (logForFirst) {
        logger.warn('Parser: ❌ Failed to parse amount', {
          value: fields.amount,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  if (logForFirst) {
    logger.warn('Parser: ❌ No valid amount found', {
      fieldsKeys: Object.keys(fields),
    });
  }

  return null;
}

/**
 * Парсит одну секцию документа
 * Использует мягкую валидацию - пустые или некорректные поля не ломают документ
 */
function parseDocumentSection(
  sectionText: string,
  sectionIndex: number
): Partial<ParsedDocument> | null {
  const lines = sectionText.split('\n');
  if (lines.length === 0) return null;

  // Логируем сырую секцию для ПЕРВОГО документа
  if (sectionIndex === 0) {
    logger.info('Parser: Raw section text for FIRST document', {
      sectionIndex: 0,
      rawSectionPreview: sectionText.substring(0, 1000),
      linesCount: lines.length,
    });
  }

  // Первая строка - заголовок секции, остальные - данные
  const dataLines = lines.slice(1);
  const fields = parseKeyValuePairs(dataLines);

  // Логируем только ПЕРВЫЙ документ
  if (sectionIndex === 0) {
    logger.info(`Parser: Parsed fields for FIRST document`, {
      sectionIndex: 0,
      fieldsKeys: Object.keys(fields),
      fieldsCount: Object.keys(fields).length,
      hasDate: !!fields.date,
      hasDateWrittenOff: !!fields.dateWrittenOff,
      hasDateReceived: !!fields.dateReceived,
      hasAmount: !!fields.amount,
    });
  }

  const doc: Partial<ParsedDocument> = {};

  // Извлекаем дату с fallback
  const date = getDocumentDate(fields, sectionIndex);
  if (date) {
    doc.date = date;
  }

  // Извлекаем сумму с fallback
  const amount = getDocumentAmount(fields, sectionIndex);
  if (amount !== null) {
    doc.amount = amount;
  }

  // Остальные поля - необязательные, заполняем если есть
  if (fields.number) {
    doc.number = fields.number || undefined;
  }

  doc.payer = fields.payer || undefined;

  // Для ИНН и КПП допускаем значение "0" (используется некоторыми банками)
  if (fields.payerInn) {
    const validatedInn = validateInn(fields.payerInn);
    doc.payerInn = validatedInn || (fields.payerInn === '0' ? '0' : undefined);
  }

  if (fields.payerKpp) {
    doc.payerKpp = fields.payerKpp === '0' ? '0' : fields.payerKpp;
  }

  if (fields.payerAccount) {
    doc.payerAccount = validateAccountNumber(fields.payerAccount) || undefined;
  }

  doc.receiver = fields.receiver || undefined;

  if (fields.receiverInn) {
    const validatedInn = validateInn(fields.receiverInn);
    doc.receiverInn =
      validatedInn || (fields.receiverInn === '0' ? '0' : undefined);
  }

  if (fields.receiverKpp) {
    doc.receiverKpp = fields.receiverKpp === '0' ? '0' : fields.receiverKpp;
  }

  if (fields.receiverAccount) {
    doc.receiverAccount =
      validateAccountNumber(fields.receiverAccount) || undefined;
  }

  doc.purpose = fields.purpose || undefined;

  return doc;
}

/**
 * Валидирует документ - проверяет наличие обязательных полей
 */
function validateDocument(doc: Partial<ParsedDocument>): doc is ParsedDocument {
  return !!(doc.date && doc.amount !== undefined);
}

/**
 * Парсит файл формата 1С ClientBankExchange
 *
 * TODO: Написать unit тесты для парсера
 * Файл тестов: apps/api/src/modules/imports/parsers/__tests__/clientBankExchange.parser.test.ts
 * См. ТЗ: раздел "Тестирование" → "Unit тесты"
 * Тестовые файлы должны быть в: apps/api/src/modules/imports/__tests__/fixtures/
 *
 * @param content - содержимое файла (Buffer или строка)
 * @returns объект с массивом распарсенных документов и метаданными файла
 */
export function parseClientBankExchange(content: Buffer | string): ParsedFile {
  // 1. Декодирование файла
  const text = decodeFile(content);

  // 2. Проверка заголовка файла
  const firstLines = text.split(/\r?\n/).slice(0, 5);
  const hasHeader = firstLines.some((line) =>
    line.includes('1CClientBankExchange')
  );

  if (!hasHeader) {
    logger.error('Parser: Invalid file format - no header found', {
      firstLines: firstLines.map((l) => l.substring(0, 100)),
      textLength: text.length,
    });
    throw new AppError(
      'Invalid file format: file must contain "1CClientBankExchange" header',
      400
    );
  }

  // 3. Разделение на секции
  const { documentSections, headerLines } = splitIntoSections(text);

  // 4. Извлечение номера счёта компании из заголовка
  let companyAccountNumber: string | undefined;
  for (const line of headerLines) {
    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      const value = line.substring(equalIndex + 1).trim();
      const normalizedKey = normalizeKeyString(key);

      if (normalizedKey === 'расчсчет' || normalizedKey === 'расчетныйсчет') {
        const validated = validateAccountNumber(value);
        if (validated) {
          companyAccountNumber = validated;
        }
      }
    }
  }

  // 5. Парсинг документов
  const documents: ParsedDocument[] = [];
  const documentTypesFound: string[] = [];
  const skippedDocumentTypesMap = new Map<string, number>();
  let documentsInvalid = 0;
  let documentsSkipped = 0;

  logger.info('Parser: Starting document parsing', {
    totalSections: documentSections.length,
  });

  for (let i = 0; i < documentSections.length; i++) {
    try {
      const sectionText = documentSections[i];

      // Извлекаем тип документа из заголовка секции
      const firstLine = sectionText.split('\n')[0];
      const equalIndex = firstLine.indexOf('=');
      const docType =
        equalIndex > 0 ? firstLine.substring(equalIndex + 1).trim() : '';

      // Собираем статистику по типам документов
      if (docType && !documentTypesFound.includes(docType)) {
        documentTypesFound.push(docType);
      }

      // Проверяем поддерживаемый ли тип документа
      const isSupported = isSupportedDocumentType(docType);

      if (!isSupported) {
        documentsSkipped++;
        // Собираем статистику по пропущенным типам
        const currentCount = skippedDocumentTypesMap.get(docType) || 0;
        skippedDocumentTypesMap.set(docType, currentCount + 1);

        // Логируем первые 2 пропущенных секции для диагностики
        if (documentsSkipped <= 2) {
          logger.info(`Parser: Skipped unsupported document type`, {
            index: i,
            docType,
            sectionPreview: sectionText.substring(0, 300),
          });
        }
        continue;
      }

      // Парсим документ
      const doc = parseDocumentSection(sectionText, i);
      if (!doc) {
        documentsInvalid++;
        if (documentsInvalid <= 2) {
          logger.warn('Parser: Failed to parse document section', {
            index: i,
            docType,
            sectionPreview: sectionText.substring(0, 300),
          });
        }
        continue;
      }

      // Валидируем обязательные поля
      const isValid = validateDocument(doc);
      if (i === 0) {
        logger.info('Parser: Validation result for FIRST doc', {
          isValid,
          hasDate: !!doc.date,
          hasAmount: doc.amount !== undefined,
          docType,
        });
      }

      if (!isValid) {
        documentsInvalid++;
        if (documentsInvalid <= 2) {
          logger.warn('Parser: Invalid document - missing required fields', {
            index: i,
            docType,
            hasDate: !!doc.date,
            hasAmount: doc.amount !== undefined,
          });
        }
        continue;
      }

      // Добавляем хэш
      try {
        doc.hash = createOperationHash(doc);
        documents.push(doc);

        if (i === 0) {
          logger.info('Parser: ✅ FIRST document added successfully!', {
            hash: doc.hash,
            docType,
          });
        }
      } catch (hashError) {
        if (i === 0) {
          logger.error('Parser: ❌ Failed to add FIRST document', {
            error:
              hashError instanceof Error
                ? hashError.message
                : String(hashError),
            stack: hashError instanceof Error ? hashError.stack : undefined,
          });
        }
        throw hashError;
      }
    } catch (error) {
      if (i === 0 || documentsInvalid <= 2) {
        logger.error('Parser: ❌ Exception in document processing', {
          index: i,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      documentsInvalid++;
    }
  }

  // Логируем итоговую статистику
  logger.info('Parser: Document parsing completed', {
    totalSections: documentSections.length,
    documentsFound: documents.length,
    documentsSkipped,
    documentsInvalid,
    documentTypesFound,
    skippedDocumentTypes: Array.from(skippedDocumentTypesMap.entries()).map(
      ([type, count]) => ({ type, count })
    ),
  });

  // 6. Проверка результата
  if (documents.length === 0) {
    let errorMessage = 'File has no valid documents';
    const debugInfo: any = {
      totalSections: documentSections.length,
      documentsInvalid,
      documentsSkipped,
    };

    // Добавляем preview первых 3 секций для отладки
    if (documentSections.length > 0) {
      errorMessage += `. Found ${documentSections.length} sections but none were valid.`;
      if (documentsInvalid > 0) {
        errorMessage += ` Invalid documents: ${documentsInvalid} (missing required fields: date or amount).`;
      }

      // Логируем первые 3 секции
      const previewCount = Math.min(3, documentSections.length);
      debugInfo.firstSectionsPreview = [];

      for (let i = 0; i < previewCount; i++) {
        const sectionPreview = documentSections[i].substring(0, 300);
        debugInfo.firstSectionsPreview.push({
          index: i,
          preview: sectionPreview,
          lines: documentSections[i].split('\n').length,
        });
      }

      logger.error('Parser: No valid documents found', debugInfo);
    }

    throw new AppError(errorMessage, 400);
  }

  return {
    documents,
    companyAccountNumber,
    stats: {
      documentsStarted: documentSections.length,
      documentsFound: documents.length,
      documentsSkipped,
      documentsInvalid,
      documentTypesFound,
      skippedDocumentTypes: Array.from(skippedDocumentTypesMap.entries()).map(
        ([type, count]) => ({ type, count })
      ),
    },
  };
}

/**
 * Парсит дату в формате DD.MM.YYYY
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) {
    throw new AppError('Date field is required', 400);
  }

  const parts = dateStr.split('.');
  if (parts.length !== 3) {
    throw new AppError(
      `Invalid date format: ${dateStr}. Expected DD.MM.YYYY`,
      400
    );
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // месяцы в JS начинаются с 0
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new AppError(`Invalid date format: ${dateStr}`, 400);
  }

  // Валидация диапазонов: день 1-31, месяц 0-11 (после вычитания 1), год > 0
  if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1) {
    throw new AppError(`Invalid date: ${dateStr}`, 400);
  }

  const date = new Date(year, month, day);

  // Дополнительная проверка: убеждаемся, что созданная дата соответствует введенным значениям
  // (JavaScript Date может "нормализовать" невалидные даты, например 32.01.2025 станет 01.02.2025)
  if (
    isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== month ||
    date.getFullYear() !== year
  ) {
    throw new AppError(`Invalid date: ${dateStr}`, 400);
  }

  return date;
}

/**
 * Парсит сумму с улучшенной нормализацией
 * Обрабатывает форматы: "1000", "1000.50", "1000,50", "1 000,50", "1 000 000.50"
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) {
    throw new AppError('Amount field is required', 400);
  }

  // Нормализация:
  // 1. Убираем все пробелы
  // 2. Заменяем запятую на точку для десятичных чисел
  // 3. Убираем возможные невидимые символы
  const normalized = amountStr
    .replace(/\s+/g, '') // Убираем все пробелы
    .replace(/,/g, '.') // Запятая -> точка
    // eslint-disable-next-line no-control-regex
    .replace(/[\uFEFF\u200B-\u200D\u2060\u0000]/g, '') // Невидимые символы
    .trim();

  const amount = parseFloat(normalized);

  if (isNaN(amount)) {
    throw new AppError(`Invalid amount format: ${amountStr}`, 400);
  }

  if (amount < 0) {
    throw new AppError(`Amount cannot be negative: ${amountStr}`, 400);
  }

  if (amount === 0) {
    throw new AppError(`Amount cannot be zero: ${amountStr}`, 400);
  }

  return amount;
}

/**
 * Валидирует ИНН (10 или 12 цифр)
 */
function validateInn(inn: string | undefined): string | null {
  if (!inn) {
    return null;
  }

  const cleaned = inn.replace(/\s/g, '').trim();

  if (cleaned.length !== 10 && cleaned.length !== 12) {
    return null; // Возвращаем null вместо ошибки, чтобы не блокировать импорт
  }

  if (!/^\d+$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Валидирует номер счета (20 цифр)
 */
function validateAccountNumber(account: string | undefined): string | null {
  if (!account) return null;

  const cleaned = account.replace(/\s/g, '');

  if (cleaned.length !== 20) {
    return null; // Возвращаем null вместо ошибки
  }

  if (!/^\d+$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}
