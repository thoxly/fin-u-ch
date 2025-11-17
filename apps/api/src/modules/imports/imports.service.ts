import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import logger from '../../config/logger';
import { AppError } from '../../middlewares/error';
import {
  parseClientBankExchange,
  ParsedDocument,
  ParsedFile,
} from './parsers/clientBankExchange.parser';
import { autoMatch } from './services/matching.service';
import operationsService from '../operations/operations.service';
import type { CreateOperationInput } from '@fin-u-ch/shared';

/**
 * Import session status constants
 */
export const IMPORT_SESSION_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PROCESSED: 'processed',
} as const;

/**
 * Duplicate check result
 */
interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateOfId?: string;
  existingOperation?:
    | Prisma.OperationGetPayload<Record<string, never>>
    | Prisma.ImportedOperationGetPayload<Record<string, never>>;
}

export interface ImportFilters {
  confirmed?: boolean;
  matched?: boolean;
  duplicate?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * TODO: Написать integration тесты для всех endpoints
 * Файл тестов: apps/api/src/modules/imports/__tests__/imports.integration.test.ts
 * См. ТЗ: раздел "Тестирование" → "Integration тесты"
 */
export class ImportsService {
  /**
   * Проверяет, является ли операция дубликатом существующей
   *
   * Критерии дубликата (сравниваем ТОЛЬКО исходные данные из выписки):
   * 1. Совпадает дата (в пределах 2 дней)
   * 2. Совпадает сумма (точно)
   * 3. Совпадает хотя бы одно из:
   *    - Номер документа
   *    - ИНН плательщика или получателя
   *    - Имена плательщика и получателя
   *    - Назначение платежа
   */
  private async detectDuplicate(
    companyId: string,
    doc: ParsedDocument
  ): Promise<DuplicateCheckResult> {
    const dateFrom = new Date(doc.date);
    dateFrom.setDate(dateFrom.getDate() - 2); // -2 дня
    const dateTo = new Date(doc.date);
    dateTo.setDate(dateTo.getDate() + 2); // +2 дня

    // 1. Проверяем среди уже импортированных операций (таблица operation)
    // ВАЖНО: в таблице operation нет исходных данных из выписки (payer, receiver, payerInn и т.д.)
    // Поэтому сравниваем только по: дате, сумме и описанию
    const whereOperation: Prisma.OperationWhereInput = {
      companyId,
      operationDate: {
        gte: dateFrom,
        lte: dateTo,
      },
      amount: doc.amount,
    };

    const existingOperations = await prisma.operation.findMany({
      where: whereOperation,
      take: 10, // Ограничиваем поиск для производительности
    });

    // Проверяем совпадение по описанию (назначению платежа)
    for (const existing of existingOperations) {
      // Сравниваем описание - если совпадает хотя бы частично (первые 50 символов)
      const docDesc = (doc.purpose || '').toLowerCase().trim();
      const existingDesc = (existing.description || '').toLowerCase().trim();

      if (
        docDesc &&
        existingDesc &&
        docDesc.length > 10 &&
        existingDesc.length > 10
      ) {
        const minLength = Math.min(50, docDesc.length, existingDesc.length);
        const docSubstr = docDesc.substring(0, minLength);
        const existingSubstr = existingDesc.substring(0, minLength);

        // Если совпадают первые N символов назначения платежа - это дубликат
        if (docSubstr === existingSubstr) {
          return {
            isDuplicate: true,
            duplicateOfId: existing.id,
            existingOperation: existing,
          };
        }
      }
    }

    // 2. Проверяем среди импортированных, но не обработанных операций (таблица imported_operations)
    // Здесь есть все исходные данные из выписки, поэтому сравниваем более точно
    const whereImported: Prisma.ImportedOperationWhereInput = {
      companyId,
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
      amount: doc.amount,
      processed: false, // только необработанные
    };

    const importedOperations = await prisma.importedOperation.findMany({
      where: whereImported,
      take: 10,
    });

    // Проверяем каждую импортированную операцию по исходным данным
    for (const imported of importedOperations) {
      const matchResult = this.checkOperationMatch(doc, {
        number: imported.number,
        payerInn: imported.payerInn,
        receiverInn: imported.receiverInn,
        payer: imported.payer,
        receiver: imported.receiver,
        description: imported.description,
      });

      if (matchResult) {
        return {
          isDuplicate: true,
          duplicateOfId: imported.id,
          existingOperation: imported,
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Проверяет совпадение операции по различным критериям
   */
  private checkOperationMatch(
    doc: ParsedDocument,
    existing: {
      number?: string | null;
      payerInn?: string | null;
      receiverInn?: string | null;
      payer?: string | null;
      receiver?: string | null;
      description?: string | null;
    }
  ): boolean {
    // Проверка 1: Совпадение по номеру документа
    if (doc.number && existing.number) {
      // Если в existing.number есть полный номер или это description с номером
      const numberMatch = existing.number.match(/№?\s*(\d+)/);
      if (numberMatch && numberMatch[1] === doc.number) {
        return true;
      }
      // Прямое совпадение номера
      if (existing.number === doc.number) {
        return true;
      }
    }

    // Проверка 2: Совпадение по ИНН
    const payerInnMatch = doc.payerInn && existing.payerInn === doc.payerInn;
    const receiverInnMatch =
      doc.receiverInn && existing.receiverInn === doc.receiverInn;

    if (payerInnMatch || receiverInnMatch) {
      return true;
    }

    // Проверка 3: Совпадение по именам контрагентов (частичное)
    const payerNameMatch =
      doc.payer &&
      existing.payer &&
      (existing.payer
        .toLowerCase()
        .includes(doc.payer.toLowerCase().substring(0, 20)) ||
        doc.payer
          .toLowerCase()
          .includes(existing.payer.toLowerCase().substring(0, 20)));
    const receiverNameMatch =
      doc.receiver &&
      existing.receiver &&
      (existing.receiver
        .toLowerCase()
        .includes(doc.receiver.toLowerCase().substring(0, 20)) ||
        doc.receiver
          .toLowerCase()
          .includes(existing.receiver.toLowerCase().substring(0, 20)));

    if (payerNameMatch || receiverNameMatch) {
      // Дополнительно проверяем совпадение description (частично)
      const descMatch =
        doc.purpose &&
        existing.description &&
        (existing.description
          .toLowerCase()
          .includes(doc.purpose.toLowerCase().substring(0, 30)) ||
          doc.purpose
            .toLowerCase()
            .includes(existing.description.toLowerCase().substring(0, 30)));

      if (descMatch) {
        return true;
      }

      // Если совпадают и плательщик и получатель, это уже достаточно
      if (
        (payerNameMatch && receiverNameMatch) ||
        payerInnMatch ||
        receiverInnMatch
      ) {
        return true;
      }
    }

    return false;
  }
  /**
   * Загружает файл выписки, парсит и создает сессию импорта
   */
  async uploadStatement(
    companyId: string,
    userId: string,
    fileName: string,
    fileBuffer: Buffer
  ): Promise<{
    sessionId: string;
    importedCount: number;
    duplicatesCount: number;
    fileName: string;
    parseStats?: {
      documentsStarted: number;
      documentsFound: number;
      documentsSkipped: number;
      documentsInvalid: number;
      documentTypesFound: string[];
    };
  }> {
    // Валидация размера файла (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > maxSize) {
      throw new AppError('File size exceeds 10MB limit', 400);
    }

    // Парсинг файла
    let parsedFile: ParsedFile;
    try {
      // Логируем начало парсинга
      const filePreview = fileBuffer
        .slice(0, 500)
        .toString('utf8')
        .replace(/\0/g, '');
      logger.info('Starting file parse', {
        fileName,
        fileSize: fileBuffer.length,
        preview: filePreview.substring(0, 200),
      });

      parsedFile = parseClientBankExchange(fileBuffer);

      logger.info('File parsed successfully', {
        fileName,
        documentsCount: parsedFile.documents.length,
        companyAccountNumber: parsedFile.companyAccountNumber,
      });
    } catch (error: unknown) {
      // Логируем ошибку парсинга с деталями
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('File parsing failed', {
        fileName,
        error: errorMessage,
        stack: errorStack,
      });

      // Если это уже AppError, передаем как есть (с детальной информацией)
      if (error instanceof AppError) {
        throw error;
      }
      // Иначе оборачиваем в AppError с детальным сообщением
      throw new AppError(
        errorMessage || `Failed to parse file: ${String(error)}`,
        400
      );
    }

    const documents = parsedFile.documents;
    const companyAccountNumber = parsedFile.companyAccountNumber;
    const parseStats = parsedFile.stats;

    // Валидация количества операций (максимум 5000)
    if (documents.length > 5000) {
      throw new AppError(
        `File contains too many operations (${documents.length}). Maximum allowed is 5000.`,
        400
      );
    }

    // Получаем информацию о компании для автосопоставления
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { inn: true },
    });

    // Поиск дубликатов по хэшу
    const duplicates: ParsedDocument[] = [];
    const uniqueDocuments: ParsedDocument[] = [];

    logger.info('Checking for duplicates', {
      fileName,
      totalDocuments: documents.length,
      companyId,
    });

    if (documents.length > 0) {
      // 1. Собираем все хэши из распарсенных документов
      const hashes = documents
        .map((doc) => doc.hash)
        .filter((h): h is string => !!h);

      logger.debug('Checking duplicates: collected hashes', {
        fileName,
        hashesCount: hashes.length,
      });

      // 2. Ищем в базе все операции с такими хэшами
      const existingOperations = await prisma.operation.findMany({
        where: {
          companyId,
          sourceHash: {
            in: hashes,
          },
        },
        select: {
          id: true,
          sourceHash: true,
        },
      });

      const existingHashes = new Set(
        existingOperations
          .map((op) => op.sourceHash)
          .filter((hash): hash is string => hash !== null)
      );

      logger.debug('Checking duplicates: found existing operations', {
        fileName,
        existingOperationsCount: existingOperations.length,
      });

      // 3. Разделяем документы на уникальные и дубликаты
      for (const doc of documents) {
        if (doc.hash && existingHashes.has(doc.hash)) {
          duplicates.push(doc);
        } else {
          uniqueDocuments.push(doc);
        }
      }
    }

    logger.info('Duplicate check completed', {
      fileName,
      totalDocuments: documents.length,
      duplicatesCount: duplicates.length,
      uniqueDocumentsCount: uniqueDocuments.length,
    });

    // Создаем сессию импорта
    logger.info('Creating import session', {
      fileName,
      companyId,
      userId,
      documentsCount: documents.length,
    });

    const importSession = await prisma.importSession.create({
      data: {
        companyId,
        userId,
        fileName,
        status: IMPORT_SESSION_STATUS.DRAFT,
        importedCount: documents.length,
      },
    });

    logger.info('Import session created', {
      sessionId: importSession.id,
      fileName,
      companyId,
    });

    // Применяем автосопоставление и создаем черновики операций
    // Используем батчинг для больших файлов (по 100 операций за раз)
    const importedOperations: Prisma.ImportedOperationGetPayload<
      Record<string, never>
    >[] = [];
    const BATCH_SIZE = 100;
    const batches = [];

    // Разбиваем документы на батчи
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      batches.push(documents.slice(i, i + BATCH_SIZE));
    }

    logger.info('Starting batch processing', {
      sessionId: importSession.id,
      fileName,
      totalBatches: batches.length,
      batchSize: BATCH_SIZE,
      totalDocuments: documents.length,
    });

    // Обрабатываем каждый батч в транзакции
    let batchNumber = 0;
    for (const batch of batches) {
      batchNumber++;
      try {
        await prisma.$transaction(async (tx) => {
          for (const doc of batch) {
            try {
              // Проверяем на дубликат
              const duplicateCheck = await this.detectDuplicate(companyId, doc);

              // Автосопоставление
              const matchingResult = await autoMatch(
                companyId,
                doc,
                company?.inn || null,
                companyAccountNumber
              );

              // Проверяем, что операция полностью сопоставлена (статья, счет, валюта)
              // Валюта по умолчанию RUB, но для полного сопоставления нужны все поля
              const isFullyMatched = !!(
                matchingResult.matchedArticleId &&
                matchingResult.matchedAccountId &&
                matchingResult.direction // направление обязательно
              );

              // Создаем черновик операции
              const operationData: Prisma.ImportedOperationCreateInput = {
                importSession: { connect: { id: importSession.id } },
                company: { connect: { id: companyId } },
                date: doc.date,
                number: doc.number,
                amount: doc.amount,
                description: doc.purpose || '',
                direction: matchingResult.direction || null,
                payer: doc.payer,
                payerInn: doc.payerInn,
                payerAccount: doc.payerAccount,
                receiver: doc.receiver,
                receiverInn: doc.receiverInn,
                receiverAccount: doc.receiverAccount,
                currency: 'RUB', // По умолчанию RUB
                // Устанавливаем matchedBy только если операция полностью сопоставлена
                matchedBy: isFullyMatched ? matchingResult.matchedBy : null,
                // Информация о дубликате
                isDuplicate: duplicateCheck.isDuplicate,
                duplicateOfId: duplicateCheck.duplicateOfId || null,
                confirmed: false,
                processed: false,
                draft: true, // All imported operations start as drafts
              };

              // Добавляем связи через connect
              if (matchingResult.matchedArticleId) {
                operationData.matchedArticle = {
                  connect: { id: matchingResult.matchedArticleId },
                };
              }
              if (matchingResult.matchedCounterpartyId) {
                operationData.matchedCounterparty = {
                  connect: { id: matchingResult.matchedCounterpartyId },
                };
              }
              if (matchingResult.matchedAccountId) {
                operationData.matchedAccount = {
                  connect: { id: matchingResult.matchedAccountId },
                };
              }
              if (isFullyMatched && matchingResult.matchedRuleId) {
                operationData.matchedRule = {
                  connect: { id: matchingResult.matchedRuleId },
                };
              }

              const importedOp = await tx.importedOperation.create({
                data: operationData,
              });

              importedOperations.push(importedOp);
            } catch (error: unknown) {
              // Логируем ошибку с деталями, но продолжаем обработку остальных операций в батче
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              const errorStack =
                error instanceof Error ? error.stack : undefined;

              logger.error('Failed to process document during import', {
                fileName,
                sessionId: importSession.id,
                batchNumber,
                document: {
                  date: doc.date,
                  amount: doc.amount,
                  number: doc.number,
                  purpose: doc.purpose,
                },
                error: errorMessage,
                stack: errorStack,
              });
            }
          }
        });

        logger.debug('Batch processed successfully', {
          sessionId: importSession.id,
          fileName,
          batchNumber,
          batchSize: batch.length,
          totalProcessed: importedOperations.length,
        });
      } catch (error: unknown) {
        // Логируем ошибку батча, но продолжаем обработку следующих батчей
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error('Failed to process batch during import', {
          fileName,
          sessionId: importSession.id,
          batchNumber,
          batchSize: batch.length,
          error: errorMessage,
          stack: errorStack,
        });
      }
    }

    logger.info('Batch processing completed', {
      sessionId: importSession.id,
      fileName,
      totalBatches: batches.length,
      totalProcessed: importedOperations.length,
    });

    // Подсчитываем количество дубликатов
    const duplicatesCount = importedOperations.filter(
      (op) => op.isDuplicate
    ).length;

    logger.info('Upload statement processing completed', {
      sessionId: importSession.id,
      fileName,
      companyId,
      importedCount: importedOperations.length,
      duplicatesCount,
      parseStats: parseStats
        ? {
            documentsStarted: parseStats.documentsStarted,
            documentsFound: parseStats.documentsFound,
            documentsSkipped: parseStats.documentsSkipped,
            documentsInvalid: parseStats.documentsInvalid,
            documentTypesFound: parseStats.documentTypesFound,
          }
        : undefined,
    });

    return {
      sessionId: importSession.id,
      importedCount: importedOperations.length,
      duplicatesCount,
      fileName: importSession.fileName,
      parseStats: parseStats
        ? {
            documentsStarted: parseStats.documentsStarted,
            documentsFound: parseStats.documentsFound,
            documentsSkipped: parseStats.documentsSkipped,
            documentsInvalid: parseStats.documentsInvalid,
            documentTypesFound: parseStats.documentTypesFound,
          }
        : undefined,
    };
  }

  /**
   * Получает список черновиков операций из сессии
   */
  async getImportedOperations(
    sessionId: string,
    companyId: string,
    filters?: ImportFilters
  ): Promise<{
    operations: Prisma.ImportedOperationGetPayload<{
      include: {
        matchedArticle: { select: { id: true; name: true } };
        matchedCounterparty: { select: { id: true; name: true } };
        matchedAccount: { select: { id: true; name: true } };
        matchedDeal: { select: { id: true; name: true } };
        matchedDepartment: { select: { id: true; name: true } };
      };
    }>[];
    total: number;
    confirmed: number;
    unmatched: number;
    duplicates: number;
  }> {
    // Проверяем, что сессия принадлежит компании
    const session = await prisma.importSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new AppError('Import session not found', 404);
    }

    // Базовый where без фильтров matched/duplicate - для счетчиков
    const baseWhere: Prisma.ImportedOperationWhereInput = {
      importSessionId: sessionId,
      companyId,
    };

    // Where с фильтрами - для выборки операций
    const where: Prisma.ImportedOperationWhereInput = {
      ...baseWhere,
    };

    if (filters?.confirmed !== undefined) {
      where.confirmed = filters.confirmed;
    }

    if (filters?.matched !== undefined) {
      if (filters.matched) {
        where.matchedBy = { not: null };
      } else {
        where.matchedBy = null;
      }
    }

    if (filters?.duplicate !== undefined) {
      where.isDuplicate = filters.duplicate;
    }

    const [operations, total] = await Promise.all([
      prisma.importedOperation.findMany({
        where,
        include: {
          matchedArticle: { select: { id: true, name: true } },
          matchedCounterparty: { select: { id: true, name: true } },
          matchedAccount: { select: { id: true, name: true } },
          matchedDeal: { select: { id: true, name: true } },
          matchedDepartment: { select: { id: true, name: true } },
        },
        take: filters?.limit || 20,
        skip: filters?.offset || 0,
        // Сортируем сначала по наличию сопоставления (несопоставленные первыми),
        // затем по дате. Prisma не поддерживает NULLS FIRST напрямую,
        // но при сортировке по возрастанию NULL значения идут первыми
        orderBy: [
          { matchedBy: 'asc' }, // NULL значения (несопоставленные) будут первыми
          { date: 'desc' },
        ],
      }),
      prisma.importedOperation.count({ where }),
    ]);

    // Счетчики используют baseWhere (без фильтров matched/duplicate)
    // Это гарантирует глобальные значения для всей сессии
    const confirmedCount = await prisma.importedOperation.count({
      where: { ...baseWhere, confirmed: true },
    });

    const unmatchedCount = await prisma.importedOperation.count({
      where: { ...baseWhere, matchedBy: null },
    });

    const duplicatesCount = await prisma.importedOperation.count({
      where: { ...baseWhere, isDuplicate: true },
    });

    return {
      operations,
      total,
      confirmed: confirmedCount,
      unmatched: unmatchedCount,
      duplicates: duplicatesCount,
    };
  }

  /**
   * Получает все операции сессии без пагинации (для поиска похожих)
   */
  async getAllImportedOperations(
    sessionId: string,
    companyId: string
  ): Promise<{
    operations: Prisma.ImportedOperationGetPayload<{
      include: {
        matchedArticle: { select: { id: true; name: true } };
        matchedCounterparty: { select: { id: true; name: true } };
        matchedAccount: { select: { id: true; name: true } };
        matchedDeal: { select: { id: true; name: true } };
        matchedDepartment: { select: { id: true; name: true } };
      };
    }>[];
  }> {
    // Проверяем, что сессия принадлежит компании
    const session = await prisma.importSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new AppError('Import session not found', 404);
    }

    const operations = await prisma.importedOperation.findMany({
      where: {
        importSessionId: sessionId,
        companyId,
      },
      include: {
        matchedArticle: { select: { id: true, name: true } },
        matchedCounterparty: { select: { id: true, name: true } },
        matchedAccount: { select: { id: true, name: true } },
        matchedDeal: { select: { id: true, name: true } },
        matchedDepartment: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    return { operations };
  }

  /**
   * Обновляет черновик операции
   */
  async updateImportedOperation(
    id: string,
    companyId: string,
    data: {
      matchedArticleId?: string | null;
      matchedCounterpartyId?: string | null;
      matchedAccountId?: string | null;
      matchedDealId?: string | null;
      matchedDepartmentId?: string | null;
      currency?: string;
      repeat?: string;
      confirmed?: boolean;
      direction?: 'income' | 'expense' | 'transfer';
    }
  ): Promise<
    Prisma.ImportedOperationGetPayload<{
      include: {
        matchedArticle: { select: { id: true; name: true } };
        matchedCounterparty: { select: { id: true; name: true } };
        matchedAccount: { select: { id: true; name: true } };
        matchedDeal: { select: { id: true; name: true } };
        matchedDepartment: { select: { id: true; name: true } };
      };
    }>
  > {
    const operation = await prisma.importedOperation.findFirst({
      where: { id, companyId },
    });

    if (!operation) {
      throw new AppError('Imported operation not found', 404);
    }

    const updateData: Prisma.ImportedOperationUpdateInput = {};

    if (data.matchedArticleId !== undefined) {
      updateData.matchedArticle = data.matchedArticleId
        ? { connect: { id: data.matchedArticleId } }
        : { disconnect: true };
    }

    if (data.matchedCounterpartyId !== undefined) {
      updateData.matchedCounterparty = data.matchedCounterpartyId
        ? { connect: { id: data.matchedCounterpartyId } }
        : { disconnect: true };
    }

    if (data.matchedAccountId !== undefined) {
      updateData.matchedAccount = data.matchedAccountId
        ? { connect: { id: data.matchedAccountId } }
        : { disconnect: true };
    }

    if (data.matchedDealId !== undefined) {
      updateData.matchedDeal = data.matchedDealId
        ? { connect: { id: data.matchedDealId } }
        : { disconnect: true };
    }

    if (data.matchedDepartmentId !== undefined) {
      updateData.matchedDepartment = data.matchedDepartmentId
        ? { connect: { id: data.matchedDepartmentId } }
        : { disconnect: true };
    }

    if (data.currency !== undefined) {
      updateData.currency = data.currency;
    }

    if (data.repeat !== undefined) {
      updateData.repeat = data.repeat;
    }

    if (data.confirmed !== undefined) {
      updateData.confirmed = data.confirmed;
    }

    if (data.direction !== undefined) {
      updateData.direction = data.direction;
    }

    // Обновляем операцию
    const updatedOperation = await prisma.importedOperation.update({
      where: { id, companyId },
      data: updateData,
      include: {
        matchedArticle: { select: { id: true, name: true } },
        matchedCounterparty: { select: { id: true, name: true } },
        matchedAccount: { select: { id: true, name: true } },
        matchedDeal: { select: { id: true, name: true } },
        matchedDepartment: { select: { id: true, name: true } },
      },
    });

    // Проверяем, что операция полностью сопоставлена (контрагент, статья, счет, валюта)
    const isFullyMatched = !!(
      updatedOperation.matchedCounterpartyId &&
      updatedOperation.matchedArticleId &&
      updatedOperation.matchedAccountId &&
      updatedOperation.currency
    );

    let finalOperation = updatedOperation;

    // Обновляем matchedBy в зависимости от полного сопоставления
    if (isFullyMatched) {
      // Если операция полностью сопоставлена, но matchedBy нет, помечаем как manual
      // (если matchedBy уже есть от автосопоставления, оставляем его)
      if (!updatedOperation.matchedBy) {
        finalOperation = await prisma.importedOperation.update({
          where: { id, companyId },
          data: { matchedBy: 'manual' },
          include: {
            matchedArticle: { select: { id: true, name: true } },
            matchedCounterparty: { select: { id: true, name: true } },
            matchedAccount: { select: { id: true, name: true } },
            matchedDeal: { select: { id: true, name: true } },
            matchedDepartment: { select: { id: true, name: true } },
          },
        });
      }
    } else {
      // Если операция не полностью сопоставлена, сбрасываем matchedBy
      if (updatedOperation.matchedBy) {
        finalOperation = await prisma.importedOperation.update({
          where: { id, companyId },
          data: {
            matchedBy: null,
            matchedRule: { disconnect: true },
          },
          include: {
            matchedArticle: { select: { id: true, name: true } },
            matchedCounterparty: { select: { id: true, name: true } },
            matchedAccount: { select: { id: true, name: true } },
            matchedDeal: { select: { id: true, name: true } },
            matchedDepartment: { select: { id: true, name: true } },
          },
        });
      }
    }

    // Обновляем счетчики сессии, если изменились confirmed или processed
    // или если изменилось сопоставление (что может повлиять на статус сессии)
    const sessionId = finalOperation.importSessionId;
    const [confirmedCount, processedCount] = await Promise.all([
      prisma.importedOperation.count({
        where: { importSessionId: sessionId, companyId, confirmed: true },
      }),
      prisma.importedOperation.count({
        where: { importSessionId: sessionId, companyId, processed: true },
      }),
    ]);

    const session = await prisma.importSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (session) {
      await prisma.importSession.update({
        where: { id: sessionId, companyId },
        data: {
          confirmedCount,
          processedCount,
          // Обновляем статус сессии, если все операции обработаны
          status:
            processedCount === session.importedCount
              ? IMPORT_SESSION_STATUS.PROCESSED
              : confirmedCount > 0
                ? IMPORT_SESSION_STATUS.CONFIRMED
                : IMPORT_SESSION_STATUS.DRAFT,
        },
      });
    }

    return finalOperation;
  }

  /**
   * Массовое обновление черновиков
   */
  async bulkUpdateImportedOperations(
    sessionId: string,
    companyId: string,
    operationIds: string[],
    data: {
      matchedArticleId?: string | null;
      matchedCounterpartyId?: string | null;
      matchedAccountId?: string | null;
      matchedDealId?: string | null;
      matchedDepartmentId?: string | null;
      currency?: string;
      direction?: 'income' | 'expense' | 'transfer' | null;
      confirmed?: boolean;
    }
  ): Promise<{ updated: number }> {
    // Проверяем, что все операции принадлежат сессии и компании
    const operations = await prisma.importedOperation.findMany({
      where: {
        id: { in: operationIds },
        importSessionId: sessionId,
        companyId,
      },
    });

    if (operations.length !== operationIds.length) {
      throw new AppError('Some operations not found', 404);
    }

    // Для updateMany Prisma не поддерживает связи через connect/disconnect
    // Используем прямые ID полей
    const updateData: Prisma.ImportedOperationUpdateManyMutationInput & {
      matchedArticleId?: string | null;
      matchedCounterpartyId?: string | null;
      matchedAccountId?: string | null;
      matchedDealId?: string | null;
      matchedDepartmentId?: string | null;
    } = {};

    if (data.matchedArticleId !== undefined) {
      updateData.matchedArticleId = data.matchedArticleId;
      updateData.matchedBy = data.matchedArticleId ? 'manual' : null;
    }

    if (data.matchedCounterpartyId !== undefined) {
      updateData.matchedCounterpartyId = data.matchedCounterpartyId;
      if (!updateData.matchedBy) {
        updateData.matchedBy = data.matchedCounterpartyId ? 'manual' : null;
      }
    }

    if (data.matchedAccountId !== undefined) {
      updateData.matchedAccountId = data.matchedAccountId;
    }

    if (data.matchedDealId !== undefined) {
      updateData.matchedDealId = data.matchedDealId;
    }

    if (data.matchedDepartmentId !== undefined) {
      updateData.matchedDepartmentId = data.matchedDepartmentId;
    }

    if (data.currency !== undefined) {
      updateData.currency = data.currency;
    }

    if (data.direction !== undefined) {
      updateData.direction = data.direction;
    }

    if (data.confirmed !== undefined) {
      updateData.confirmed = data.confirmed;
    }

    const result = await prisma.importedOperation.updateMany({
      where: {
        id: { in: operationIds },
        importSessionId: sessionId,
        companyId,
      },
      data: updateData,
    });

    return { updated: result.count };
  }

  /**
   * Применяет правила маппинга к сессии
   */
  async applyRules(
    sessionId: string,
    companyId: string
  ): Promise<{
    applied: number;
    updated: number;
  }> {
    // Проверяем, что сессия принадлежит компании
    const session = await prisma.importSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new AppError('Import session not found', 404);
    }

    // Получаем все черновики сессии
    const operations = await prisma.importedOperation.findMany({
      where: { importSessionId: sessionId, companyId },
    });

    // Получаем ИНН компании
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { inn: true },
    });

    let updated = 0;

    // Применяем автосопоставление заново
    for (const op of operations) {
      if (op.confirmed || op.processed) {
        continue; // Пропускаем уже подтвержденные или обработанные
      }

      const doc: ParsedDocument = {
        date: op.date,
        number: op.number || undefined,
        amount: op.amount,
        payer: op.payer || undefined,
        payerInn: op.payerInn || undefined,
        payerAccount: op.payerAccount || undefined,
        receiver: op.receiver || undefined,
        receiverInn: op.receiverInn || undefined,
        receiverAccount: op.receiverAccount || undefined,
        purpose: op.description || undefined,
      };

      try {
        const matchingResult = await autoMatch(
          companyId,
          doc,
          company?.inn || null
        );

        // Проверяем, что операция полностью сопоставлена (контрагент, статья, счет, валюта)
        const isFullyMatched = !!(
          matchingResult.matchedCounterpartyId &&
          matchingResult.matchedArticleId &&
          matchingResult.matchedAccountId &&
          op.currency
        );

        const updateData: Prisma.ImportedOperationUpdateInput = {
          matchedBy: isFullyMatched ? matchingResult.matchedBy : null,
          direction:
            matchingResult.direction !== null &&
            matchingResult.direction !== undefined
              ? matchingResult.direction
              : op.direction,
        };

        if (isFullyMatched && matchingResult.matchedRuleId) {
          updateData.matchedRule = {
            connect: { id: matchingResult.matchedRuleId },
          };
        } else {
          updateData.matchedRule = { disconnect: true };
        }

        if (matchingResult.matchedArticleId) {
          updateData.matchedArticle = {
            connect: { id: matchingResult.matchedArticleId },
          };
        }
        if (matchingResult.matchedCounterpartyId) {
          updateData.matchedCounterparty = {
            connect: { id: matchingResult.matchedCounterpartyId },
          };
        }
        if (matchingResult.matchedAccountId) {
          updateData.matchedAccount = {
            connect: { id: matchingResult.matchedAccountId },
          };
        }

        await prisma.importedOperation.update({
          where: { id: op.id, companyId },
          data: updateData,
        });

        updated++;
      } catch (error: unknown) {
        // Логируем ошибку с деталями, но продолжаем обработку остальных
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error('Failed to apply rules to operation', {
          sessionId,
          companyId,
          operationId: op.id,
          error: errorMessage,
          stack: errorStack,
        });
      }
    }

    return { applied: operations.length, updated };
  }

  /**
   * Импортирует операции (создает реальные операции)
   */
  async importOperations(
    sessionId: string,
    companyId: string,
    userId: string,
    operationIds?: string[],
    saveRulesForIds?: string[]
  ): Promise<{
    imported: number;
    created: number;
    errors: number;
    sessionId: string;
  }> {
    // Проверяем, что сессия принадлежит компании
    const session = await prisma.importSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new AppError('Import session not found', 404);
    }

    // Получаем черновики для импорта
    const where: Prisma.ImportedOperationWhereInput = {
      importSessionId: sessionId,
      companyId,
      processed: false, // Импортируем только необработанные операции
    };

    if (operationIds && operationIds.length > 0) {
      where.id = { in: operationIds };
    } else {
      // Если не указаны конкретные ID, пропускаем дубликаты по умолчанию
      where.isDuplicate = false;
    }

    const operations = await prisma.importedOperation.findMany({
      where,
    });

    if (operations.length === 0) {
      throw new AppError('No operations to import', 400);
    }

    // Проверяем, что все операции полностью сопоставлены
    // Операция считается сопоставленной, если указаны: статья, счет и валюта
    const unmatchedOperations: string[] = [];
    for (const op of operations) {
      if (!op.direction) {
        unmatchedOperations.push(
          `Операция ${op.number || op.id}: не указан тип операции`
        );
        continue;
      }

      // Проверяем обязательные поля
      if (!op.matchedArticleId) {
        unmatchedOperations.push(
          `Операция ${op.number || op.id}: не указана статья`
        );
      }
      if (!op.matchedAccountId) {
        unmatchedOperations.push(
          `Операция ${op.number || op.id}: не указан счет`
        );
      }
      if (!op.currency) {
        unmatchedOperations.push(
          `Операция ${op.number || op.id}: не указана валюта`
        );
      }

      if (op.direction === 'transfer') {
        // Для переводов дополнительно нужны счета плательщика и получателя
        if (!op.payerAccount || !op.receiverAccount) {
          unmatchedOperations.push(
            `Операция ${op.number || op.id}: для перевода нужны счета плательщика и получателя`
          );
        }
      }
    }

    if (unmatchedOperations.length > 0) {
      throw new AppError(
        `Не все операции сопоставлены:\n${unmatchedOperations.join('\n')}`,
        400
      );
    }

    let created = 0;
    let errors = 0;

    // Используем батчинг для больших объемов (по 50 операций за раз)
    const BATCH_SIZE = 50;
    const batches = [];

    // Разбиваем операции на батчи
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      batches.push(operations.slice(i, i + BATCH_SIZE));
    }

    // Обрабатываем каждый батч в транзакции
    for (const batch of batches) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const op of batch) {
            try {
              // Проверяем обязательные поля
              if (!op.direction) {
                throw new AppError(`Operation ${op.id} has no direction`, 400);
              }

              if (
                op.direction !== 'transfer' &&
                (!op.matchedArticleId || !op.matchedAccountId)
              ) {
                throw new AppError(
                  `Operation ${op.id} is missing required fields`,
                  400
                );
              }

              if (
                op.direction === 'transfer' &&
                (!op.payerAccount || !op.receiverAccount)
              ) {
                throw new AppError(
                  `Operation ${op.id} is missing account information for transfer`,
                  400
                );
              }

              // Создаем операцию
              // Преобразуем данные в формат, ожидаемый operationsService.create
              const operationData: CreateOperationInput = {
                type: op.direction as 'income' | 'expense' | 'transfer',
                operationDate: op.date,
                amount: op.amount,
                currency: op.currency || 'RUB',
                description: op.description,
                repeat: op.repeat || 'none',
              } as CreateOperationInput;

              if (op.direction === 'transfer') {
                // Для переводов нужно найти счета по номерам
                const sourceAccount = op.payerAccount
                  ? await tx.account.findFirst({
                      where: {
                        companyId,
                        number: op.payerAccount,
                        isActive: true,
                      },
                    })
                  : null;

                const targetAccount = op.receiverAccount
                  ? await tx.account.findFirst({
                      where: {
                        companyId,
                        number: op.receiverAccount,
                        isActive: true,
                      },
                    })
                  : null;

                if (!sourceAccount || !targetAccount) {
                  throw new AppError(
                    `Cannot find accounts for transfer operation ${op.id}`,
                    400
                  );
                }

                operationData.sourceAccountId = sourceAccount.id;
                operationData.targetAccountId = targetAccount.id;
              } else {
                if (op.matchedAccountId) {
                  operationData.accountId = op.matchedAccountId;
                }
                if (op.matchedArticleId) {
                  operationData.articleId = op.matchedArticleId;
                }
              }

              if (op.matchedCounterpartyId) {
                operationData.counterpartyId = op.matchedCounterpartyId;
              }

              if (op.matchedDealId) {
                operationData.dealId = op.matchedDealId;
              }

              if (op.matchedDepartmentId) {
                operationData.departmentId = op.matchedDepartmentId;
              }

              // Создаем операцию через сервис
              try {
                await operationsService.create(companyId, operationData);
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                const errorStack =
                  error instanceof Error ? error.stack : undefined;

                logger.error(
                  'Failed to create operation via operationsService',
                  {
                    sessionId,
                    companyId,
                    operationId: op.id,
                    operationData,
                    error: errorMessage,
                    stack: errorStack,
                  }
                );

                // Пробрасываем ошибку дальше, чтобы она была обработана внешним try-catch
                throw error;
              }

              // Помечаем как обработанную
              await tx.importedOperation.update({
                where: { id: op.id, companyId },
                data: { processed: true },
              });

              // Сохраняем правила для этой операции, если она в списке saveRulesForIds
              if (saveRulesForIds && saveRulesForIds.includes(op.id)) {
                try {
                  // Сохраняем правила для всех сопоставленных полей
                  if (op.matchedCounterpartyId) {
                    const pattern =
                      op.direction === 'expense' ? op.receiver : op.payer;
                    if (pattern) {
                      await this.createMappingRule(companyId, userId, {
                        ruleType: 'contains',
                        pattern,
                        targetType: 'counterparty',
                        targetId: op.matchedCounterpartyId,
                        sourceField:
                          op.direction === 'expense' ? 'receiver' : 'payer',
                      });
                    }
                  }

                  if (op.matchedArticleId && op.description) {
                    await this.createMappingRule(companyId, userId, {
                      ruleType: 'contains',
                      pattern: op.description,
                      targetType: 'article',
                      targetId: op.matchedArticleId,
                      sourceField: 'description',
                    });
                  }

                  if (op.matchedAccountId && op.description) {
                    await this.createMappingRule(companyId, userId, {
                      ruleType: 'contains',
                      pattern: op.description,
                      targetType: 'account',
                      targetId: op.matchedAccountId,
                      sourceField: 'description',
                    });
                  }
                } catch (error: unknown) {
                  // Логируем ошибку, но не прерываем импорт
                  const errorMessage =
                    error instanceof Error ? error.message : String(error);
                  logger.error(`Failed to save rules for operation ${op.id}`, {
                    operationId: op.id,
                    error: errorMessage,
                  });
                }
              }

              created++;
            } catch (error: unknown) {
              errors++;
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              const errorStack =
                error instanceof Error ? error.stack : undefined;

              logger.error('Failed to import operation', {
                sessionId,
                companyId,
                operationId: op.id,
                operationNumber: op.number,
                operationDate: op.date,
                error: errorMessage,
                stack: errorStack,
              });
              // Продолжаем обработку остальных операций в батче
            }
          }
        });
      } catch (error: unknown) {
        // Логируем ошибку батча, но продолжаем обработку следующих батчей
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error('Failed to import batch', {
          sessionId,
          companyId,
          batchSize: batch.length,
          error: errorMessage,
          stack: errorStack,
        });
        // Помечаем все операции в батче как ошибки
        errors += batch.length;
      }
    }

    // Обновляем счетчики сессии
    const processedCount = await prisma.importedOperation.count({
      where: { importSessionId: sessionId, companyId, processed: true },
    });

    await prisma.importSession.update({
      where: { id: sessionId, companyId },
      data: {
        processedCount,
        status:
          processedCount === session.importedCount
            ? IMPORT_SESSION_STATUS.PROCESSED
            : IMPORT_SESSION_STATUS.CONFIRMED,
      },
    });

    return {
      imported: operations.length,
      created,
      errors,
      sessionId,
    };
  }

  /**
   * Удаляет сессию импорта
   */
  async deleteSession(
    sessionId: string,
    companyId: string
  ): Promise<{
    deleted: number;
  }> {
    const session = await prisma.importSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new AppError('Import session not found', 404);
    }

    // Удаляем все черновики (CASCADE через Prisma)
    const deletedCount = await prisma.importedOperation.count({
      where: { importSessionId: sessionId, companyId },
    });

    await prisma.importSession.delete({
      where: { id: sessionId, companyId },
    });

    return { deleted: deletedCount + 1 };
  }

  /**
   * Получает список правил маппинга
   */
  async getMappingRules(
    companyId: string,
    filters?: { targetType?: string; sourceField?: string }
  ): Promise<Prisma.MappingRuleGetPayload<Record<string, never>>[]> {
    const where: Prisma.MappingRuleWhereInput = { companyId };

    if (filters?.targetType) {
      where.targetType = filters.targetType;
    }

    if (filters?.sourceField) {
      where.sourceField = filters.sourceField;
    }

    return prisma.mappingRule.findMany({
      where,
      orderBy: { usageCount: 'desc' },
    });
  }

  /**
   * Создает правило маппинга
   */
  async createMappingRule(
    companyId: string,
    userId: string,
    data: {
      ruleType: 'contains' | 'equals' | 'regex' | 'alias';
      pattern: string;
      targetType: 'article' | 'counterparty' | 'account' | 'operationType';
      targetId?: string;
      targetName?: string;
      sourceField?: 'description' | 'receiver' | 'payer' | 'inn';
    }
  ): Promise<Prisma.MappingRuleGetPayload<Record<string, never>>> {
    return prisma.mappingRule.create({
      data: {
        companyId,
        userId,
        ruleType: data.ruleType,
        pattern: data.pattern,
        targetType: data.targetType,
        targetId: data.targetId || null,
        targetName: data.targetName || null,
        sourceField: data.sourceField || 'description',
      },
    });
  }

  /**
   * Обновляет правило маппинга
   */
  async updateMappingRule(
    id: string,
    companyId: string,
    data: Partial<{
      ruleType: string;
      pattern: string;
      targetType: string;
      targetId: string | null;
      targetName: string | null;
      sourceField: string;
    }>
  ): Promise<Prisma.MappingRuleGetPayload<Record<string, never>>> {
    const rule = await prisma.mappingRule.findFirst({
      where: { id, companyId },
    });

    if (!rule) {
      throw new AppError('Mapping rule not found', 404);
    }

    return prisma.mappingRule.update({
      where: { id, companyId },
      data,
    });
  }

  /**
   * Удаляет правило маппинга
   */
  async deleteMappingRule(
    id: string,
    companyId: string
  ): Promise<Prisma.MappingRuleGetPayload<Record<string, never>>> {
    const rule = await prisma.mappingRule.findFirst({
      where: { id, companyId },
    });

    if (!rule) {
      throw new AppError('Mapping rule not found', 404);
    }

    return prisma.mappingRule.delete({
      where: { id, companyId },
    });
  }

  /**
   * Получает историю импортов
   */
  async getImportSessions(
    companyId: string,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<{
    sessions: Prisma.ImportSessionGetPayload<Record<string, never>>[];
    total: number;
  }> {
    const where: Prisma.ImportSessionWhereInput = { companyId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters?.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters?.dateTo) {
        const dateTo = new Date(filters.dateTo);
        dateTo.setHours(23, 59, 59, 999);
        where.createdAt.lte = dateTo;
      }
    }

    const [sessions, total] = await Promise.all([
      prisma.importSession.findMany({
        where,
        take: filters?.limit || 20,
        skip: filters?.offset || 0,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.importSession.count({ where }),
    ]);

    return { sessions, total };
  }
}

export default new ImportsService();
