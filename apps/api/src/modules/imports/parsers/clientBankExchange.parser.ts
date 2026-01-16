import { AppError } from '../../../middlewares/error';
import logger from '../../../config/logger';
import { createOperationHash } from '@fin-u-ch/shared/lib/operationHash';
import iconv from 'iconv-lite';

export interface ParsedDocument {
  date: Date;
  number?: string;
  amount: number;
  payer?: string;
  payerInn?: string;
  payerKpp?: string;
  payerAccount?: string;
  receiver?: string;
  receiverInn?: string;
  receiverKpp?: string;
  receiverAccount?: string;
  purpose?: string;
  hash?: string;
}

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
  date: [
    'дата',
    'date',
    'датапроводки',
    'dateposted',
    'датадокумента',
    'датадок',
    'docdate',
  ],
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
  // Добавляем недостающие ключи, которые были обнаружены в файле
  priority: ['очередность', 'очередностьплатежа', 'priority'],
  kbk: ['показателькбк', 'kbk'],
  okato: ['окато', 'okato'],
  paymentKind: ['видоплаты', 'видплатежа', 'paymentkind'],
  statusPayer: ['статусплательщика', 'статуссоставителя', 'statuspayer'],
  taxPeriod: ['показательпериода', 'налоговыйпериод', 'taxperiod'],
  taxDate: ['показательдаты', 'датадокументаналоговая', 'taxdate'],
  taxReason: ['показательоснования', 'основаниеплатежа', 'taxreason'],
  purpose: [
    'назначениеплатежа',
    'назначение',
    'purpose',
    'description',
    'платежноеназначение',
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
      // eslint-disable-next-line no-control-regex
      text = text.trim().replace(/[\uFEFF\u200B-\u200D\u2060\u0000]/g, '');
      return text;
    }

    // Если есть заголовок, но нет кириллицы - всё равно используем win1251
    if (hasHeader) {
      // eslint-disable-next-line no-control-regex
      text = text.trim().replace(/[\uFEFF\u200B-\u200D\u2060\u0000]/g, '');
      return text;
    }
  } catch (error) {
    // Продолжаем с fallback
  }
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
        // Сохраняем предыдущий документ
        // ВАЖНО: сохраняем даже если секция кажется невалидной на этом этапе
        // Валидация будет выполнена позже при парсинге
        const sectionText = currentSection.join('\n');
        // Проверяем только базовую валидность - наличие хотя бы одной строки после заголовка
        if (sectionText.split('\n').length > 1) {
          documentSections.push(sectionText);
        } else {
          logger.debug('[ПАРСЕР] Пропущена пустая секция документа', {
            sectionText: sectionText.substring(0, 100),
          });
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
        // ВАЖНО: сохраняем секцию даже если она кажется невалидной
        // Валидация будет выполнена позже при парсинге документа
        // Проверяем только базовую валидность - наличие хотя бы одной строки после заголовка
        if (sectionText.split('\n').length > 1) {
          documentSections.push(sectionText);
        } else {
          logger.debug(
            '[ПАРСЕР] Пропущена пустая секция документа при закрытии',
            {
              sectionText: sectionText.substring(0, 100),
            }
          );
        }
        currentSection = null;
      }
      inDocument = false;
      continue;
    }

    // Игнорируем секции счетов
    // ВАЖНО: если мы находимся внутри документа, сохраняем его перед обработкой секции счета
    if (
      normalized.startsWith('секциярасчсчет') ||
      normalized === 'конецрасчсчет'
    ) {
      // Если мы находимся внутри документа, сохраняем его перед обработкой секции счета
      if (currentSection && inDocument) {
        const sectionText = currentSection.join('\n');
        if (sectionText.split('\n').length > 1) {
          documentSections.push(sectionText);
          logger.debug(
            '[ПАРСЕР] Сохранена секция документа перед секцией счета',
            {
              sectionText: sectionText.substring(0, 200),
            }
          );
        }
        currentSection = null;
      }
      inDocument = false;
      continue;
    }

    // Собираем строки
    if (inHeader) {
      headerLines.push(trimmed);
    } else if (inDocument && currentSection) {
      currentSection.push(trimmed);
    }
  }

  // Добавляем последний документ, если он есть
  // ВАЖНО: сохраняем даже незакрытую секцию, если она содержит данные
  if (currentSection) {
    const sectionText = currentSection.join('\n');
    // Проверяем только базовую валидность - наличие хотя бы одной строки после заголовка
    if (sectionText.split('\n').length > 1) {
      documentSections.push(sectionText);
      logger.debug('[ПАРСЕР] Добавлена незакрытая секция документа', {
        sectionText: sectionText.substring(0, 200),
      });
    } else {
      logger.debug('[ПАРСЕР] Пропущена пустая незакрытая секция документа', {
        sectionText: sectionText.substring(0, 100),
      });
    }
  }

  logger.info('[ПАРСЕР] Разделение на секции завершено', {
    totalLines: lines.length,
    sectionStartCount,
    sectionEndCount,
    documentSectionsCount: documentSections.length,
    headerLinesCount: headerLines.length,
    hasUnclosedSection: !!currentSection,
  });

  // Предупреждение, если количество начал и концов не совпадает
  if (sectionStartCount !== sectionEndCount) {
    logger.warn('[ПАРСЕР] Несоответствие количества секций', {
      sectionStartCount,
      sectionEndCount,
      difference: sectionStartCount - sectionEndCount,
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
 * Возвращает объект ключ-значение и сырые поля
 */
function parseKeyValuePairs(lines: string[]): {
  fields: Record<string, string>;
  rawFields: Record<string, string>;
} {
  const result: Record<string, string> = {};
  const rawFields: Record<string, string> = {}; // Для неопознанных полей
  let currentKey: string | null = null;
  let currentRawKey: string | null = null;
  let currentValue: string[] = [];

  const flushCurrent = () => {
    if (currentKey && currentValue.length > 0) {
      const value = currentValue.join(' ').trim();

      // Сохраняем значение только если оно не пустое
      if (value.length > 0) {
        result[currentKey] = value;
      }
    } else if (currentRawKey && currentValue.length > 0) {
      // Сохраняем неопознанные поля
      const value = currentValue.join(' ').trim();
      if (value.length > 0) {
        rawFields[currentRawKey] = value;
      }
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

  return { fields: result, rawFields };
}

/**
 * Извлекает дату документа с правильным приоритетом
 * Приоритет: ДатаСписано -> ДатаПоступило -> Дата
 * Логика: для списаний используем ДатаСписано, для поступлений - ДатаПоступило
 * ВАЖНО: Все ошибки парсинга обрабатываются внутри, функция никогда не бросает исключения
 */
function getDocumentDate(fields: Record<string, string>): Date | null {
  // Пытаемся извлечь дату по приоритету
  // Если есть ДатаСписано - это расход
  if (fields.dateWrittenOff && fields.dateWrittenOff.trim().length > 0) {
    try {
      const date = parseDate(fields.dateWrittenOff.trim());
      if (date && !isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      // Продолжаем поиск в других полях
      logger.debug('[ПАРСЕР] Ошибка парсинга dateWrittenOff', {
        value: fields.dateWrittenOff,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Если есть ДатаПоступило - это приход
  if (fields.dateReceived && fields.dateReceived.trim().length > 0) {
    try {
      const date = parseDate(fields.dateReceived.trim());
      if (date && !isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      // Продолжаем поиск в других полях
      logger.debug('[ПАРСЕР] Ошибка парсинга dateReceived', {
        value: fields.dateReceived,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Если есть просто Дата, берем её
  if (fields.date && fields.date.trim().length > 0) {
    try {
      const date = parseDate(fields.date.trim());
      if (date && !isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      // Не удалось распарсить
      logger.debug('[ПАРСЕР] Ошибка парсинга date', {
        value: fields.date,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return null;
}

/**
 * Извлекает сумму документа
 * Универсальная логика: все варианты сумм (СуммаДокументаПоступило, СуммаДокументаСписано и т.д.)
 * должны быть нормализованы в единое поле amount
 * ВАЖНО: Все ошибки парсинга обрабатываются внутри, функция никогда не бросает исключения
 */
function getDocumentAmount(fields: Record<string, string>): number | null {
  // После нормализации все варианты сумм должны быть в поле 'amount'
  if (fields.amount && fields.amount.trim().length > 0) {
    try {
      const amount = parseAmount(fields.amount.trim());
      if (amount !== null && !isNaN(amount) && amount > 0) {
        return amount;
      }
    } catch (error) {
      // Не удалось распарсить
      logger.debug('[ПАРСЕР] Ошибка парсинга amount', {
        value: fields.amount,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return null;
}

/**
 * Парсит одну секцию документа
 * Использует мягкую валидацию - пустые или некорректные поля не ломают документ
 * ВАЖНО: Все ошибки обрабатываются внутри, функция никогда не бросает исключения
 */
function parseDocumentSection(
  sectionText: string
): Partial<ParsedDocument> | null {
  try {
    const lines = sectionText.split('\n');
    if (lines.length === 0) {
      return null;
    }

    // Первая строка - заголовок секции, остальные - данные
    const dataLines = lines.slice(1);
    let fields: Record<string, string> = {};

    try {
      const parsed = parseKeyValuePairs(dataLines);
      fields = parsed.fields;
    } catch (error) {
      logger.debug('[ПАРСЕР] Ошибка парсинга key-value пар', {
        error: error instanceof Error ? error.message : String(error),
        sectionPreview: sectionText.substring(0, 200),
      });
      // Продолжаем с пустыми полями
    }

    const doc: Partial<ParsedDocument> = {};

    // Извлекаем дату с fallback
    try {
      const date = getDocumentDate(fields);
      if (date) {
        doc.date = date;
      }
    } catch (error) {
      logger.debug('[ПАРСЕР] Ошибка извлечения даты', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Продолжаем без даты
    }

    // Извлекаем сумму с fallback
    try {
      const amount = getDocumentAmount(fields);
      if (amount !== null) {
        doc.amount = amount;
      }
    } catch (error) {
      logger.debug('[ПАРСЕР] Ошибка извлечения суммы', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Продолжаем без суммы
    }

    // Остальные поля - необязательные, заполняем если есть
    // ВАЖНО: Все операции оборачиваем в try-catch для безопасности
    try {
      if (fields.number) {
        doc.number = fields.number || undefined;
      }

      doc.payer = fields.payer || undefined;

      // Для ИНН и КПП допускаем значение "0" (используется некоторыми банками)
      if (fields.payerInn) {
        try {
          const validatedInn = validateInn(fields.payerInn);
          doc.payerInn =
            validatedInn || (fields.payerInn === '0' ? '0' : undefined);
        } catch (error) {
          // Игнорируем ошибки валидации ИНН
        }
      }

      if (fields.payerKpp) {
        doc.payerKpp = fields.payerKpp === '0' ? '0' : fields.payerKpp;
      }

      if (fields.payerAccount) {
        try {
          doc.payerAccount =
            validateAccountNumber(fields.payerAccount) || undefined;
        } catch (error) {
          // Игнорируем ошибки валидации счета
        }
      }

      doc.receiver = fields.receiver || undefined;

      if (fields.receiverInn) {
        try {
          const validatedInn = validateInn(fields.receiverInn);
          doc.receiverInn =
            validatedInn || (fields.receiverInn === '0' ? '0' : undefined);
        } catch (error) {
          // Игнорируем ошибки валидации ИНН
        }
      }

      if (fields.receiverKpp) {
        doc.receiverKpp = fields.receiverKpp === '0' ? '0' : fields.receiverKpp;
      }

      if (fields.receiverAccount) {
        try {
          doc.receiverAccount =
            validateAccountNumber(fields.receiverAccount) || undefined;
        } catch (error) {
          // Игнорируем ошибки валидации счета
        }
      }

      doc.purpose = fields.purpose || undefined;
    } catch (error) {
      // Ловим ошибки при заполнении полей, но продолжаем
      logger.debug('[ПАРСЕР] Ошибка заполнения полей документа', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return doc;
  } catch (error) {
    // Ловим любые ошибки парсинга и возвращаем null вместо исключения
    logger.warn('[ПАРСЕР] Ошибка парсинга секции документа', {
      error: error instanceof Error ? error.message : String(error),
      sectionPreview: sectionText.substring(0, 200),
    });
    return null;
  }
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
  logger.info('[ПАРСЕР] Начало парсинга файла', {
    contentType: typeof content,
    contentLength: Buffer.isBuffer(content) ? content.length : content.length,
  });

  // 1. Декодирование файла
  const text = decodeFile(content);

  logger.info('[ПАРСЕР] Файл декодирован', {
    textLength: text.length,
    firstChars: text.substring(0, 200),
  });

  // 2. Проверка заголовка файла
  const firstLines = text.split(/\r?\n/).slice(0, 5);
  const hasHeader = firstLines.some((line) =>
    line.includes('1CClientBankExchange')
  );

  logger.info('[ПАРСЕР] Проверка заголовка', {
    hasHeader,
    firstLines: firstLines.map((l) => l.substring(0, 100)),
  });

  if (!hasHeader) {
    logger.error('[ПАРСЕР] Ошибка: заголовок не найден', {
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

  logger.info('[ПАРСЕР] Разделение на секции завершено', {
    documentSectionsCount: documentSections.length,
    headerLinesCount: headerLines.length,
  });

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

  logger.info('[ПАРСЕР] Начало парсинга документов', {
    totalSections: documentSections.length,
  });

  // ВАЖНО: Обрабатываем все секции, даже если некоторые падают с ошибкой
  // Ошибка в одном документе не должна останавливать обработку остальных
  for (let i = 0; i < documentSections.length; i++) {
    // Логируем прогресс каждые 10 документов
    if (i > 0 && i % 10 === 0) {
      logger.debug('[ПАРСЕР] Прогресс обработки', {
        processed: i,
        total: documentSections.length,
        valid: documents.length,
        invalid: documentsInvalid,
        skipped: documentsSkipped,
      });
    }
    try {
      const sectionText = documentSections[i];

      // Проверяем, что секция не пустая
      if (!sectionText || sectionText.trim().length === 0) {
        logger.debug('[ПАРСЕР] Пропущена пустая секция', { index: i });
        documentsInvalid++;
        continue;
      }

      // Извлекаем тип документа из заголовка секции
      let docType = '';
      try {
        const firstLine = sectionText.split('\n')[0];
        const equalIndex = firstLine.indexOf('=');
        docType =
          equalIndex > 0 ? firstLine.substring(equalIndex + 1).trim() : '';
      } catch (error) {
        logger.debug('[ПАРСЕР] Ошибка извлечения типа документа', {
          index: i,
          error: error instanceof Error ? error.message : String(error),
        });
        // Продолжаем обработку даже если не удалось извлечь тип
      }

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
        continue; // Пропускаем неподдерживаемые типы
      }

      // Парсим документ - оборачиваем в try-catch для безопасности
      let doc: Partial<ParsedDocument> | null = null;
      try {
        doc = parseDocumentSection(sectionText);
      } catch (parseError) {
        documentsInvalid++;
        logger.warn('[ПАРСЕР] Ошибка парсинга секции документа', {
          index: i,
          docType,
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          sectionPreview: sectionText.substring(0, 300),
        });
        continue; // Продолжаем обработку следующего документа
      }

      if (!doc) {
        documentsInvalid++;
        logger.debug('[ПАРСЕР] Документ не распарсен (вернул null)', {
          index: i,
          docType,
          sectionPreview: sectionText.substring(0, 200),
        });
        continue;
      }

      // Валидируем обязательные поля
      let isValid = false;
      try {
        isValid = validateDocument(doc);
      } catch (validationError) {
        documentsInvalid++;
        logger.warn('[ПАРСЕР] Ошибка валидации документа', {
          index: i,
          docType,
          error:
            validationError instanceof Error
              ? validationError.message
              : String(validationError),
          docPreview: {
            date: doc.date,
            amount: doc.amount,
            number: doc.number,
          },
        });
        continue; // Продолжаем обработку следующего документа
      }

      if (!isValid) {
        documentsInvalid++;
        // Логируем сырые поля для первых нескольких невалидных документов
        if (documentsInvalid <= 5) {
          try {
            const lines = sectionText.split('\n');
            const dataLines = lines.slice(1);
            const { fields, rawFields } = parseKeyValuePairs(dataLines);

            // Детальная информация о полях date и amount
            const dateFields = Object.fromEntries(
              Object.entries(fields).filter(
                ([k]) =>
                  k.toLowerCase().includes('date') ||
                  k.toLowerCase().includes('дата')
              )
            );
            const amountFields = Object.fromEntries(
              Object.entries(fields).filter(
                ([k]) =>
                  k.toLowerCase().includes('amount') ||
                  k.toLowerCase().includes('сумма')
              )
            );

            logger.error('Parser: Invalid document - missing required fields', {
              index: i,
              docType,
              hasDate: !!doc.date,
              hasAmount: doc.amount !== undefined,
              docDate: doc.date,
              docAmount: doc.amount,
              rawFields: Object.keys(rawFields), // Логируем неопознанные ключи
              recognizedFields: Object.keys(fields), // Логируем опознанные ключи
              dateField: fields.date,
              dateFieldType: typeof fields.date,
              dateFieldLength: fields.date?.length,
              dateWrittenOffField: fields.dateWrittenOff,
              dateReceivedField: fields.dateReceived,
              amountField: fields.amount,
              amountFieldType: typeof fields.amount,
              amountFieldLength: fields.amount?.length,
              allDateFields: dateFields,
              allAmountFields: amountFields,
              allFields: Object.fromEntries(
                Object.entries(fields).map(([k, v]) => [
                  k,
                  typeof v === 'string' && v.length > 100
                    ? v.substring(0, 100) + '...'
                    : v,
                ])
              ),
              sectionContent: sectionText.substring(0, 500),
            });
          } catch (logError) {
            // Игнорируем ошибки логирования
            logger.debug(
              '[ПАРСЕР] Ошибка при логировании невалидного документа',
              {
                index: i,
                error:
                  logError instanceof Error
                    ? logError.message
                    : String(logError),
              }
            );
          }
        }
        continue; // Продолжаем обработку следующего документа
      }

      // Добавляем хэш - оборачиваем в try-catch
      try {
        doc.hash = createOperationHash(doc);
        documents.push(doc);
      } catch (hashError) {
        // Если ошибка создания хэша, все равно добавляем документ
        logger.warn('[ПАРСЕР] Ошибка создания хэша документа', {
          index: i,
          docType,
          error:
            hashError instanceof Error ? hashError.message : String(hashError),
        });
        documents.push(doc); // Добавляем документ без хэша
      }
    } catch (error) {
      // Ловим любые неожиданные ошибки и продолжаем обработку
      documentsInvalid++;
      logger.error(
        '[ПАРСЕР] Неожиданная ошибка при обработке секции документа',
        {
          index: i,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          sectionPreview: documentSections[i]?.substring(0, 200) || 'N/A',
        }
      );
      // Продолжаем обработку следующего документа
      continue;
    }
  }

  // 6. Проверка результата и финальное логирование
  logger.info('[ПАРСЕР] Парсинг завершен', {
    documentsFound: documents.length,
    documentsInvalid,
    documentsSkipped,
    totalSections: documentSections.length,
    documentTypesFound,
    companyAccountNumber,
    successRate:
      documentSections.length > 0
        ? `${((documents.length / documentSections.length) * 100).toFixed(1)}%`
        : '0%',
  });

  // ВАЖНО: Логируем детальную статистику для диагностики
  if (documents.length === 0 && documentSections.length > 0) {
    logger.warn(
      '[ПАРСЕР] ВНИМАНИЕ: Все секции обработаны, но ни одна не стала валидным документом',
      {
        totalSections: documentSections.length,
        documentsInvalid,
        documentsSkipped,
        documentTypesFound,
      }
    );
  }

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
        // Получаем ключи первого документа для диагностики
        const firstSection = documentSections[0];
        const lines = firstSection.split('\n');
        const dataLines = lines.slice(1);
        const { rawFields, fields } = parseKeyValuePairs(dataLines);
        const unrecognizedKeys = Object.keys(rawFields).join(', ');
        const recognizedKeys = Object.keys(fields).join(', ');

        errorMessage += ` Invalid documents: ${documentsInvalid} (missing required fields: date or amount). Unrecognized keys in first doc: [${unrecognizedKeys}]. Recognized keys: [${recognizedKeys}]`;
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
 * Поддерживает разделители: точка, слэш, дефис
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) {
    throw new AppError('Date field is required', 400);
  }

  // Заменяем слэши и дефисы на точки для унификации
  const normalizedDate = dateStr.replace(/[/-]/g, '.');
  const parts = normalizedDate.split('.');

  if (parts.length !== 3) {
    throw new AppError(
      `Invalid date format: ${dateStr}. Expected DD.MM.YYYY or YYYY.MM.DD`,
      400
    );
  }

  let day: number, month: number, year: number;

  // Проверяем формат YYYY.MM.DD
  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    // Стандартный DD.MM.YYYY
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new AppError(`Invalid date format: ${dateStr}`, 400);
  }

  // Валидация значений
  if (month < 0 || month > 11 || day < 1 || day > 31) {
    throw new AppError(
      `Invalid date: ${dateStr} (M:${month + 1}, D:${day})`,
      400
    );
  }

  // Обработка двузначного года (если вдруг попадется)
  const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;

  const date = new Date(fullYear, month, day);

  if (isNaN(date.getTime())) {
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

  // Убираем все пробелы и невидимые символы
  let normalized = amountStr
    .replace(/\s+/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\uFEFF\u200B-\u200D\u2060\u0000]/g, '');

  // Логика для обработки разделителей тысяч и десятичных
  // 1. Если есть и запятая, и точка
  if (normalized.includes(',') && normalized.includes('.')) {
    const commaIndex = normalized.indexOf(',');
    const dotIndex = normalized.indexOf('.');

    if (commaIndex < dotIndex) {
      // Пример: 1,234.56 -> убираем запятую
      normalized = normalized.replace(/,/g, '');
    } else {
      // Пример: 1.234,56 -> убираем точку, запятую меняем на точку
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    }
  } else if (normalized.includes(',')) {
    // 2. Только запятая
    // Если запятых несколько (1,234,567) - это разделители тысяч?
    // В 1С обычно запятая - это десятичный разделитель.
    // Но для надежности, проверим: если после запятой 2 знака и это конец строки, или запятая одна - это десятичная.
    // Если запятых много, и они не в конце - это тысячи.
    // Для простоты считаем, что в 1С формате (текстовом) запятая - это десятичный знак.
    // Но если это выгрузка из Excel, может быть иначе.
    // Самый частый кейс в РФ: запятая = десятичный разделитель.
    normalized = normalized.replace(',', '.');
  }

  const amount = parseFloat(normalized);

  if (isNaN(amount)) {
    throw new AppError(`Invalid amount format: ${amountStr}`, 400);
  }

  // Сумма должна быть положительной
  // В 1С выписках сумма документа положительная, а направление определяется типом документа
  if (amount <= 0) {
    throw new AppError(`Amount must be positive: ${amountStr}`, 400);
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
