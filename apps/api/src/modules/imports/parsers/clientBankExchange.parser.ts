import { AppError } from '../../../middlewares/error';
import logger from '../../../config/logger';
import { createOperationHash, type ParsedDocument } from '@fin-u-ch/shared';
import iconv from 'iconv-lite';

// Re-export ParsedDocument for backward compatibility
export type { ParsedDocument };

export interface ParsedFile {
  documents: ParsedDocument[];
  companyAccountNumber?: string; // РасчСчет из заголовка файла
  stats?: {
    documentsStarted: number;
    documentsFound: number;
    documentsSkipped: number;
    documentsInvalid: number;
    documentTypesFound: string[];
  };
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
  let text: string;

  // Преобразуем Buffer в строку с учетом кодировки
  if (Buffer.isBuffer(content)) {
    // Для файлов 1С обычно используется Windows-1251
    // Сначала пробуем декодировать как win1251
    let win1251Text: string;
    try {
      // Используем iconv.decode напрямую
      win1251Text = iconv.decode(content, 'win1251');

      // Проверяем, успешно ли декодировалось (если есть русские символы, они должны быть читаемы)
      const trimmed = win1251Text.trim();
      const withoutBom =
        trimmed.length > 0 && trimmed.charCodeAt(0) === 0xfeff
          ? trimmed.slice(1)
          : trimmed;
      const firstLines = withoutBom.split(/\r?\n/).slice(0, 3);

      logger.debug('Parser: win1251 decoded, first 3 lines', {
        lines: firstLines.map((l) => l.substring(0, 80)),
      });

      // Проверяем наличие заголовка в первых строках
      const hasHeader = firstLines.some((line) =>
        line.includes('1CClientBankExchange')
      );

      if (hasHeader) {
        text = win1251Text;
        logger.debug('Parser: Using Windows-1251 encoding (header found)');
      } else {
        // Пробуем UTF-8
        const utf8Text = content.toString('utf8');
        const utf8Trimmed = utf8Text.trim();
        const utf8WithoutBom =
          utf8Trimmed.length > 0 && utf8Trimmed.charCodeAt(0) === 0xfeff
            ? utf8Trimmed.slice(1)
            : utf8Trimmed;
        const utf8FirstLines = utf8WithoutBom.split(/\r?\n/).slice(0, 3);

        logger.debug('Parser: utf8 decoded, first 3 lines', {
          lines: utf8FirstLines.map((l) => l.substring(0, 80)),
        });

        const utf8HasHeader = utf8FirstLines.some((line) =>
          line.includes('1CClientBankExchange')
        );

        if (utf8HasHeader) {
          text = utf8Text;
          logger.debug('Parser: Using UTF-8 encoding (header found)');
        } else {
          // Если заголовок не найден, но win1251 декодировался, используем его
          // (возможно, файл корректный, но заголовок в другом месте или с пробелами)
          text = win1251Text;
          logger.debug(
            'Parser: Using Windows-1251 encoding (default for 1C files)'
          );
        }
      }
    } catch (decodeError: unknown) {
      // Если не удалось декодировать как win1251, пробуем UTF-8
      const errorMessage =
        decodeError instanceof Error
          ? decodeError.message
          : String(decodeError);
      logger.warn('Parser: Failed to decode as win1251, trying UTF-8', {
        error: errorMessage,
      });
      text = content.toString('utf8');
    }
  } else {
    text = content;
  }

  // Убираем BOM и пробелы в начале
  text = text.trim();
  // Убираем BOM (Byte Order Mark) если есть
  if (text.length > 0 && text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Проверка формата файла (гибкая проверка - ищем в первых строках)
  const lines = text.split(/\r?\n/);
  let foundHeader = false;

  // Проверяем первые 5 строк на наличие заголовка
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    const normalizedLine = line
      .replace(/[\uFEFF\u200B-\u200D\u2060]/g, '')
      .trim();

    if (normalizedLine.includes('1CClientBankExchange')) {
      foundHeader = true;
      break;
    }
  }

  if (!foundHeader) {
    // Для отладки показываем первые строки
    const firstLines = lines
      .slice(0, 3)
      .map((l) => l.substring(0, 50))
      .join(' | ');
    const debugBytes = Buffer.isBuffer(content)
      ? Array.from(content.slice(0, 30))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ')
      : 'not a buffer';
    throw new AppError(
      `Invalid file format: file must contain "1CClientBankExchange" in the first lines. First lines: "${firstLines}" | First bytes: ${debugBytes}`,
      400
    );
  }

  const documents: ParsedDocument[] = [];
  const fileLines = text.split(/\r?\n/);
  let companyAccountNumber: string | undefined;

  // Логируем первые несколько строк для отладки
  logger.info('Parser: First 20 lines after decoding', {
    lines: fileLines.slice(0, 20).map((l, idx) => ({
      line: idx + 1,
      content: l.substring(0, 100),
      hasSectionDoc: l.includes('СекцияДокумент'),
      hasSection: l.toLowerCase().includes('секция'),
    })),
  });

  // Ищем все строки, содержащие "секция" для диагностики
  const sectionLines = fileLines
    .map((line, idx) => ({ line: idx + 1, content: line }))
    .filter(({ content }) => content.toLowerCase().includes('секция'))
    .slice(0, 10);

  if (sectionLines.length > 0) {
    logger.info('Parser: Found section-related lines', {
      sections: sectionLines.map(({ line, content }) => ({
        line,
        content: content.substring(0, 150),
      })),
    });
  }

  let currentDocument: Partial<ParsedDocument> | null = null;
  let inDocument = false;
  let inHeader = true; // Флаг для обработки заголовка файла
  const documentTypesFound: string[] = []; // Используется через push, поэтому const
  let documentsStarted = 0;
  let documentsSkipped = 0;
  let documentsInvalid = 0;
  let lastSuccessfulDocumentLine = 0; // Для отладки

  for (let i = 0; i < fileLines.length; i++) {
    try {
      const line = fileLines[i].trim();

      // Пропускаем пустые строки
      if (!line) continue;

      // Обработка заголовка файла (до первой секции документа)
      if (inHeader) {
        const equalIndex = line.indexOf('=');
        if (equalIndex > 0) {
          const key = line.substring(0, equalIndex).trim();
          const value = line.substring(equalIndex + 1).trim();
          const normalizedKey = key.replace(/\s+/g, '').toLowerCase();

          // Обрабатываем РасчСчет из заголовка
          if (
            normalizedKey === 'расчсчет' ||
            normalizedKey === 'расчетныйсчет'
          ) {
            const validatedAccount = validateAccountNumber(value);
            if (validatedAccount) {
              companyAccountNumber = validatedAccount;
              logger.info('Parser: Found company account number in header', {
                accountNumber: companyAccountNumber,
              });
            }
          }
        }
      }

      // Начало документа - ищем различные варианты написания
      // Может быть "СекцияДокумент=" или "СекцияДокумент =" или "СекцияДокумент=Платежное поручение"
      // Также ищем без учета регистра и пробелов
      const normalizedLine = line.toLowerCase().replace(/\s+/g, '');

      if (normalizedLine.startsWith('секциядокумент')) {
        // Если начинается новый документ, а предыдущий не был закрыт,
        // обрабатываем его перед тем, как начать новый.
        if (inDocument && currentDocument) {
          if (!currentDocument.date || !currentDocument.amount) {
            const missingFields = [];
            if (!currentDocument.date) missingFields.push('Дата');
            if (!currentDocument.amount) missingFields.push('Сумма');

            logger.warn(
              `Parser: Document missing required fields before new section started`,
              {
                lineNumber: i + 1,
                missingFields,
                document: currentDocument,
              }
            );
            documentsInvalid++;
          } else {
            const parsedDoc: ParsedDocument = {
              date: currentDocument.date,
              number: currentDocument.number,
              amount: currentDocument.amount,
              payer: currentDocument.payer,
              payerInn: currentDocument.payerInn,
              payerAccount: currentDocument.payerAccount,
              receiver: currentDocument.receiver,
              receiverInn: currentDocument.receiverInn,
              receiverAccount: currentDocument.receiverAccount,
              purpose: currentDocument.purpose,
            };

            // Вычисляем и добавляем хэш
            parsedDoc.hash = createOperationHash(parsedDoc);

            documents.push(parsedDoc);
            lastSuccessfulDocumentLine = i;

            if (documents.length % 100 === 0) {
              logger.info(
                `Parser: Progress - parsed ${documents.length} documents so far (line ${i})`
              );
            }
          }
        }

        // Заголовок закончился, начинается документ
        inHeader = false;
        const equalIndex = line.indexOf('=');
        if (equalIndex > 0 || equalIndex === -1) {
          // Если есть =, берем тип документа после него, иначе пустая строка
          const docType =
            equalIndex > 0 ? line.substring(equalIndex + 1).trim() : '';
          documentsStarted++;

          if (docType && !documentTypesFound.includes(docType)) {
            documentTypesFound.push(docType);
          }

          // Принимаем разные типы документов (платежки, ордеры)
          const normalizedDocType = docType.toLowerCase().replace(/\s/g, ''); // убираем все пробелы
          const isSupportedDocument =
            !docType || // Если тип не указан, все равно обрабатываем
            normalizedDocType.includes('платеж') || // Ловим "платежное поручение"
            normalizedDocType.includes('payment') ||
            normalizedDocType.includes('ордер'); // Ловим "банковский ордер", "мемориальный ордер"

          if (isSupportedDocument) {
            inDocument = true;
            currentDocument = {};
            logger.info(`Parser: Found supported document at line ${i + 1}`, {
              docType: docType || '(empty, treating as supported)',
              originalLine: line.substring(0, 100),
            });
          } else {
            logger.info(
              `Parser: Skipping document type "${docType}" at line ${i + 1}`,
              {
                originalLine: line.substring(0, 100),
              }
            );
            documentsSkipped++;
            inDocument = false;
            currentDocument = null;
          }
        }
        continue;
      }

      // Конец документа - используем нормализованное сравнение для гибкости
      // Это позволит распознать "КонецДокумента", "КонецДокумента ", "конецдокумента" и т.д.
      if (normalizedLine === 'конецдокумента') {
        if (inDocument && currentDocument) {
          // Валидация обязательных полей
          if (!currentDocument.date || !currentDocument.amount) {
            const missingFields = [];
            if (!currentDocument.date) missingFields.push('Дата');
            if (!currentDocument.amount) missingFields.push('Сумма');

            logger.warn(
              `Parser: Document at line ${i + 1} missing required fields: ${missingFields.join(', ')}`,
              {
                lineNumber: i + 1,
                hasDate: !!currentDocument.date,
                hasAmount: !!currentDocument.amount,
                missingFields,
                document: currentDocument,
              }
            );
            documentsInvalid++;
          } else {
            const parsedDoc: ParsedDocument = {
              date: currentDocument.date,
              number: currentDocument.number,
              amount: currentDocument.amount,
              payer: currentDocument.payer,
              payerInn: currentDocument.payerInn,
              payerAccount: currentDocument.payerAccount,
              receiver: currentDocument.receiver,
              receiverInn: currentDocument.receiverInn,
              receiverAccount: currentDocument.receiverAccount,
              purpose: currentDocument.purpose,
            };

            // Вычисляем и добавляем хэш
            parsedDoc.hash = createOperationHash(parsedDoc);

            documents.push(parsedDoc);
            lastSuccessfulDocumentLine = i + 1;

            // Логируем каждый 100-й документ для отслеживания прогресса
            if (documents.length % 100 === 0 || documents.length === 1) {
              logger.info(
                `Parser: Progress - parsed ${documents.length} documents so far (line ${i + 1})`
              );
            }

            logger.debug(
              `Parser: Successfully parsed document at line ${i + 1}`,
              {
                lineNumber: i + 1,
                documentNumber: documents.length,
                receiver: parsedDoc.receiver,
                receiverInn: parsedDoc.receiverInn,
                payer: parsedDoc.payer,
                payerInn: parsedDoc.payerInn,
                amount: parsedDoc.amount,
              }
            );
          }
        }
        inDocument = false;
        currentDocument = null;
        continue;
      }

      // Парсинг полей документа
      if (inDocument && currentDocument) {
        const equalIndex = line.indexOf('=');
        if (equalIndex > 0) {
          const key = line.substring(0, equalIndex).trim();
          let value = line.substring(equalIndex + 1).trim();

          // Убираем кавычки в начале и конце, если они есть
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1).trim();
          }

          // Используем более гибкое сравнение ключей (учитываем возможные пробелы и варианты)
          const normalizedKey = key.replace(/\s+/g, '').toLowerCase();

          // Дополнительная проверка для ПолучательИНН - может быть написано по-разному
          const isReceiverInn =
            normalizedKey === 'получателинн' ||
            normalizedKey === 'получательинн' ||
            (normalizedKey.includes('получатель') &&
              normalizedKey.includes('инн'));
          const isPayerInn =
            normalizedKey === 'плательщикинн' ||
            (normalizedKey.includes('плательщик') &&
              normalizedKey.includes('инн'));

          switch (normalizedKey) {
            case 'дата':
              try {
                currentDocument.date = parseDate(value);
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                logger.warn(
                  `Parser: Failed to parse date "${value}" at line ${i + 1}`,
                  {
                    lineNumber: i + 1,
                    value,
                    error: errorMessage,
                  }
                );
              }
              break;
            case 'номер':
              currentDocument.number = value || undefined;
              break;
            case 'сумма':
              try {
                currentDocument.amount = parseAmount(value);
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                logger.warn(
                  `Parser: Failed to parse amount "${value}" at line ${i + 1}`,
                  {
                    lineNumber: i + 1,
                    value,
                    error: errorMessage,
                  }
                );
              }
              break;
            case 'плательщик':
              currentDocument.payer = value || undefined;
              break;
            case 'плательщикинн':
              currentDocument.payerInn = validateInn(value) || undefined;
              break;
            case 'плательщиксчет':
              currentDocument.payerAccount =
                validateAccountNumber(value) || undefined;
              break;
            case 'получатель':
              currentDocument.receiver = value || undefined;
              break;
            case 'получателинн':
            case 'получательинн': {
              const validatedReceiverInn = validateInn(value);
              currentDocument.receiverInn = validatedReceiverInn || undefined;
              break;
            }
            case 'получательсчет':
              currentDocument.receiverAccount =
                validateAccountNumber(value) || undefined;
              break;
            case 'назначениеплатежа':
              currentDocument.purpose = value || undefined;
              break;
            default:
              // Fallback для полей с ИНН, которые могли не попасть в switch
              if (isReceiverInn && !currentDocument.receiverInn) {
                const validatedReceiverInn = validateInn(value);
                currentDocument.receiverInn = validatedReceiverInn || undefined;
              } else if (isPayerInn && !currentDocument.payerInn) {
                const validatedPayerInn = validateInn(value);
                currentDocument.payerInn = validatedPayerInn || undefined;
              }
              break;
          }
        }
      }
    } catch (error: unknown) {
      // Логируем ошибку и продолжаем обработку следующих строк
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Parser: Error processing line', {
        lineNumber: i + 1,
        line: fileLines[i]?.substring(0, 100),
        error: errorMessage,
        stack: errorStack,
      });
      // Продолжаем обработку, не прерывая парсинг
    }
  }

  // Обрабатываем последний документ, если он не был закрыт маркером "КонецДокумента"
  if (inDocument && currentDocument) {
    logger.info('Parser: Processing final document without closing marker');
    if (!currentDocument.date || !currentDocument.amount) {
      const missingFields = [];
      if (!currentDocument.date) missingFields.push('Дата');
      if (!currentDocument.amount) missingFields.push('Сумма');

      logger.warn(
        `Parser: Final document missing required fields: ${missingFields.join(', ')}`,
        {
          hasDate: !!currentDocument.date,
          hasAmount: !!currentDocument.amount,
          missingFields,
          document: currentDocument,
        }
      );
      documentsInvalid++;
    } else {
      const parsedDoc: ParsedDocument = {
        date: currentDocument.date,
        number: currentDocument.number,
        amount: currentDocument.amount,
        payer: currentDocument.payer,
        payerInn: currentDocument.payerInn,
        payerAccount: currentDocument.payerAccount,
        receiver: currentDocument.receiver,
        receiverInn: currentDocument.receiverInn,
        receiverAccount: currentDocument.receiverAccount,
        purpose: currentDocument.purpose,
      };

      // Вычисляем и добавляем хэш
      parsedDoc.hash = createOperationHash(parsedDoc);

      documents.push(parsedDoc);
      lastSuccessfulDocumentLine = fileLines.length;
      logger.info(
        'Parser: Successfully parsed final document (no closing marker)',
        {
          documentNumber: documents.length,
          receiver: parsedDoc.receiver,
          receiverInn: parsedDoc.receiverInn,
          payer: parsedDoc.payer,
          payerInn: parsedDoc.payerInn,
          amount: parsedDoc.amount,
        }
      );
    }
  }

  logger.info('Parser: Parsing complete', {
    totalLines: fileLines.length,
    documentsStarted,
    documentsFound: documents.length,
    documentsSkipped,
    documentsInvalid,
    documentTypesFound,
    lastSuccessfulDocumentLine,
    percentageParsed:
      fileLines.length > 0
        ? ((lastSuccessfulDocumentLine / fileLines.length) * 100).toFixed(2) +
          '%'
        : '0%',
  });

  // Если документов нет, выбрасываем детальную ошибку
  if (documents.length === 0) {
    let errorMessage = 'File contains no valid operations.';

    if (documentsStarted > 0) {
      errorMessage += ` Found ${documentsStarted} document(s) but none were valid.`;
      errorMessage += ` Document types found: ${documentTypesFound.join(', ')}.`;
      if (documentsInvalid > 0) {
        errorMessage += ` Invalid documents: ${documentsInvalid} (missing required fields: Дата or Сумма).`;
      }
    } else {
      errorMessage += ' No documents found in the file.';
      errorMessage +=
        ' Please check that the file contains sections starting with "СекцияДокумент=Платежное поручение".';
    }

    throw new AppError(errorMessage, 400);
  }

  return {
    documents,
    companyAccountNumber,
    stats: {
      documentsStarted,
      documentsFound: documents.length,
      documentsSkipped,
      documentsInvalid,
      documentTypesFound,
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

  const date = new Date(year, month, day);

  if (isNaN(date.getTime())) {
    throw new AppError(`Invalid date: ${dateStr}`, 400);
  }

  return date;
}

/**
 * Парсит сумму
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) {
    throw new AppError('Amount field is required', 400);
  }

  // Заменяем запятую на точку для десятичных чисел
  const normalized = amountStr.replace(',', '.');
  const amount = parseFloat(normalized);

  if (isNaN(amount)) {
    throw new AppError(`Invalid amount format: ${amountStr}`, 400);
  }

  if (amount < 0) {
    throw new AppError(`Amount cannot be negative: ${amountStr}`, 400);
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
