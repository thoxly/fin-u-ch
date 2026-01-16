import prisma from '../../config/db';
import logger from '../../config/logger';
import { AppError } from '../../middlewares/error';
import {
  parseClientBankExchange,
  ParsedDocument,
  ParsedFile,
} from './parsers/clientBankExchange.parser';
import { autoMatch } from './services/matching.service';
import {
  ImportFilters,
  UploadStatementResult,
  ImportOperationsResult,
  ApplyRulesResult,
} from '@fin-u-ch/shared';
import { invalidateReportCache } from '../reports/utils/cache';
import duplicateDetectionService from './services/duplicate-detection.service';
import sessionService from './services/session.service';
import mappingRulesService from './services/mapping-rules.service';
import operationImportService from './services/operation-import.service';
import { BatchProcessor } from './utils/batch-processor';
import { Prisma } from '@prisma/client';
import { withSpan } from '../../utils/tracing';

/**
 * Transforms Prisma ImportedOperation with relations to match frontend format
 */
function transformImportedOperation(op: any): any {
  const { article, counterparty, account, deal, department, ...rest } = op;
  return {
    ...rest,
    matchedArticle: article,
    matchedCounterparty: counterparty,
    matchedAccount: account,
    matchedDeal: deal,
    matchedDepartment: department,
  };
}

/**
 * TODO: Написать integration тесты для всех endpoints
 * Файл тестов: apps/api/src/modules/imports/__tests__/imports.integration.test.ts
 * См. ТЗ: раздел "Тестирование" → "Integration тесты"
 */
export class ImportsService {
  /**
   * Загружает файл выписки, парсит и создает сессию импорта
   */
  async uploadStatement(
    companyId: string,
    userId: string,
    fileName: string,
    fileBuffer: Buffer
  ) {
    logger.info('[ЗАГРУЗКА ФАЙЛА] Начало загрузки банковской выписки', {
      companyId,
      userId,
      fileName,
      fileSize: fileBuffer.length,
    });

    // Валидация размера файла (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > maxSize) {
      throw new AppError('File size exceeds 10MB limit', 400);
    }

    // Парсинг файла
    const parsedFile = await withSpan('imports.parse_file', async (span) => {
      const result = await this.parseFile(fileName, fileBuffer);
      span.setAttribute('file.name', fileName);
      span.setAttribute('file.size', fileBuffer.length);
      span.setAttribute('documents.count', result.documents.length);
      return result;
    });
    const documents = parsedFile.documents;
    const companyAccountNumber = parsedFile.companyAccountNumber;
    const parseStats = parsedFile.stats;

    // Валидация количества операций
    if (documents.length > 5000) {
      throw new AppError(
        `File contains too many operations (${documents.length}). Maximum allowed is 5000.`,
        400
      );
    }

    // Получаем информацию о компании
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { inn: true },
    });

    // Проверка дубликатов по хэшу (быстрая проверка)
    const { duplicatesCount } = await withSpan(
      'imports.check_duplicates',
      async (span) => {
        const result = await duplicateDetectionService.checkDuplicatesByHash(
          companyId,
          documents
        );
        span.setAttribute('duplicates.count', result.duplicatesCount);
        return result;
      }
    );

    // Создаем сессию импорта
    const importSession = await sessionService.createSession(
      companyId,
      userId,
      fileName,
      documents.length,
      companyAccountNumber
    );

    logger.info('Import session created', {
      sessionId: importSession.id,
      fileName,
      companyId,
      documentsCount: documents.length,
    });

    // Создаем черновики операций батчами
    logger.info('[ЗАГРУЗКА ФАЙЛА] Начало создания операций из документов', {
      sessionId: importSession.id,
      documentsCount: documents.length,
      companyAccountNumber,
    });

    const importedOperations = await withSpan(
      'imports.create_operations',
      async (span) => {
        const result = await this.createImportedOperations(
          importSession.id,
          companyId,
          documents,
          company?.inn || null,
          companyAccountNumber
        );
        span.setAttribute('operations.created', result.length);
        return result;
      }
    );

    logger.info('[ЗАГРУЗКА ФАЙЛА] Завершено создание операций', {
      sessionId: importSession.id,
      createdCount: importedOperations.length,
    });

    logger.info('Upload statement processing completed', {
      sessionId: importSession.id,
      fileName,
      companyId,
      importedCount: importedOperations.length,
      duplicatesCount,
    });

    return {
      sessionId: importSession.id,
      importedCount: importedOperations.length,
      duplicatesCount,
      fileName: importSession.fileName,
      companyAccountNumber,
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
   * Парсит файл выписки
   */
  private async parseFile(
    fileName: string,
    fileBuffer: Buffer
  ): Promise<ParsedFile> {
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

      const parsedFile = parseClientBankExchange(fileBuffer);

      logger.info('File parsed successfully', {
        fileName,
        documentsCount: parsedFile.documents.length,
        companyAccountNumber: parsedFile.companyAccountNumber,
      });

      return parsedFile;
    } catch (error: any) {
      // Логируем ошибку парсинга с деталями
      logger.error('File parsing failed', {
        fileName,
        error: error.message,
        stack: error.stack,
      });

      // Если это уже AppError, передаем как есть (с детальной информацией)
      if (error instanceof AppError) {
        throw error;
      }
      // Иначе оборачиваем в AppError с детальным сообщением
      throw new AppError(
        error?.message || `Failed to parse file: ${String(error)}`,
        400
      );
    }
  }

  /**
   * Создает импортированные операции из документов
   */
  private async createImportedOperations(
    sessionId: string,
    companyId: string,
    documents: ParsedDocument[],
    companyInn: string | null,
    companyAccountNumber?: string
  ) {
    // Получаем информацию о компании
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { inn: true },
    });

    // Применяем автосопоставление и создаем черновики операций
    // Используем батчинг для больших файлов (по 50 операций за раз)
    // Уменьшен размер батча для предотвращения таймаутов транзакций
    const importedOperations: Prisma.ImportedOperationGetPayload<
      Record<string, never>
    >[] = [];
    const BATCH_SIZE = 50;
    const batches = [];

    // Разбиваем документы на батчи
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      batches.push(documents.slice(i, i + BATCH_SIZE));
    }

    // Обрабатываем каждый батч в транзакции
    for (const batch of batches) {
      try {
        // Увеличиваем таймаут транзакции до 5 минут для обработки больших батчей с автосопоставлением
        // maxWait - время ожидания начала транзакции (30 секунд)
        // timeout - максимальное время выполнения транзакции (5 минут)
        // Для файлов с несколькими тысячами операций требуется больше времени
        await prisma.$transaction(
          async (tx) => {
            for (const doc of batch) {
              try {
                // Автосопоставление
                logger.debug(
                  '[ЗАГРУЗКА ФАЙЛА] Начало автосопоставления для операции',
                  {
                    sessionId,
                    document: {
                      date: doc.date,
                      number: doc.number,
                      amount: doc.amount,
                      purpose: doc.purpose,
                      payer: doc.payer,
                      receiver: doc.receiver,
                    },
                  }
                );

                const matchingResult = await autoMatch(
                  companyId,
                  doc,
                  company?.inn || companyInn || null,
                  companyAccountNumber
                );

                // Логируем результат автосопоставления при создании операции
                if (matchingResult.matchedRuleId) {
                  logger.info(
                    '[ЗАГРУЗКА ФАЙЛА] ✅ Правило применено при загрузке файла',
                    {
                      sessionId,
                      ruleId: matchingResult.matchedRuleId,
                      matchedBy: matchingResult.matchedBy,
                      direction: matchingResult.direction,
                      matchedArticleId: matchingResult.matchedArticleId,
                      matchedCounterpartyId:
                        matchingResult.matchedCounterpartyId,
                      matchedAccountId: matchingResult.matchedAccountId,
                      document: {
                        date: doc.date,
                        number: doc.number,
                        amount: doc.amount,
                        purpose: doc.purpose,
                      },
                    }
                  );
                } else {
                  logger.debug(
                    '[ЗАГРУЗКА ФАЙЛА] Результат автосопоставления (без правил)',
                    {
                      sessionId,
                      matchedBy: matchingResult.matchedBy || null,
                      direction: matchingResult.direction || null,
                      matchedArticleId: matchingResult.matchedArticleId || null,
                      matchedCounterpartyId:
                        matchingResult.matchedCounterpartyId || null,
                      matchedAccountId: matchingResult.matchedAccountId || null,
                      document: {
                        date: doc.date,
                        number: doc.number,
                        purpose: doc.purpose,
                      },
                    }
                  );
                }

                // Проверяем, что операция полностью сопоставлена (статья, счет, валюта)
                // Валюта по умолчанию RUB, но для полного сопоставления нужны все поля
                const isFullyMatched = !!(
                  matchingResult.matchedArticleId &&
                  matchingResult.matchedAccountId &&
                  matchingResult.direction // направление обязательно
                );

                // Создаем черновик операции
                const operationData = {
                  importSessionId: sessionId,
                  companyId,
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
                  matchedArticleId: matchingResult.matchedArticleId,
                  matchedCounterpartyId: matchingResult.matchedCounterpartyId,
                  matchedAccountId: matchingResult.matchedAccountId,
                  currency: 'RUB', // По умолчанию RUB
                  // Устанавливаем matchedBy только если операция полностью сопоставлена
                  matchedBy: isFullyMatched ? matchingResult.matchedBy : null,
                  matchedRuleId: isFullyMatched
                    ? matchingResult.matchedRuleId
                    : null,
                  confirmed: false,
                  processed: false,
                  draft: true,
                };

                const importedOp = await tx.importedOperation.create({
                  data: operationData,
                });

                importedOperations.push(importedOp);
              } catch (error: any) {
                // Логируем ошибку с деталями, но продолжаем обработку остальных операций в батче
                logger.error('Failed to process document during import', {
                  sessionId,
                  document: {
                    date: doc.date,
                    amount: doc.amount,
                    number: doc.number,
                    purpose: doc.purpose,
                  },
                  error: error?.message || String(error),
                  stack: error?.stack,
                });
              }
            }
          },
          {
            maxWait: 30000, // 30 секунд ожидания начала транзакции
            timeout: 300000, // 5 минут на выполнение транзакции (для больших файлов с несколькими тысячами операций)
          }
        );
      } catch (error: any) {
        // Логируем ошибку батча, но продолжаем обработку следующих батчей
        logger.error('Failed to process batch during import', {
          sessionId,
          batchSize: batch.length,
          error: error?.message || String(error),
          stack: error?.stack,
        });
      }
    }

    return importedOperations;
  }

  /**
   * Получает список черновиков операций из сессии
   */
  async getImportedOperations(
    sessionId: string,
    companyId: string,
    filters?: ImportFilters
  ) {
    // Проверяем, что сессия принадлежит компании
    const session = await prisma.importSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new AppError('Import session not found', 404);
    }

    const where: any = {
      importSessionId: sessionId,
      companyId,
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

    if (filters?.processed !== undefined) {
      where.processed = filters.processed;
    }

    const [operations, total] = await Promise.all([
      prisma.importedOperation.findMany({
        where,
        include: {
          article: { select: { id: true, name: true } },
          counterparty: { select: { id: true, name: true } },
          account: { select: { id: true, name: true } },
          deal: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        } as any,
        take: filters?.limit || 20,
        skip: filters?.offset || 0,
      }),
      prisma.importedOperation.count({ where }),
    ]);

    const confirmedCount = await prisma.importedOperation.count({
      where: { ...where, confirmed: true },
    });

    const unmatchedCount = await prisma.importedOperation.count({
      where: { ...where, matchedBy: null },
    });

    return {
      operations: operations.map(transformImportedOperation),
      total,
      confirmed: confirmedCount,
      unmatched: unmatchedCount,
    };
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
  ) {
    const operation = await prisma.importedOperation.findFirst({
      where: { id, companyId },
    });

    if (!operation) {
      throw new AppError('Imported operation not found', 404);
    }

    const updateData: any = {};

    if (data.matchedArticleId !== undefined) {
      updateData.matchedArticleId = data.matchedArticleId;
    }

    if (data.matchedCounterpartyId !== undefined) {
      updateData.matchedCounterpartyId = data.matchedCounterpartyId;
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
    } else if (!operation.currency) {
      // Если валюта не указана в обновлении и не установлена в операции, устанавливаем 'RUB' по умолчанию
      updateData.currency = 'RUB';
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
      where: { id },
      data: updateData,
      include: {
        article: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      } as any,
    });

    // Проверяем, что операция полностью сопоставлена (статья, счет, валюта)
    // Контрагент не обязателен, как в обычной форме
    const isFullyMatched = !!(
      updatedOperation.matchedArticleId &&
      updatedOperation.matchedAccountId &&
      updatedOperation.currency
    );

    // Обновляем matchedBy в зависимости от полного сопоставления
    if (isFullyMatched) {
      // Если операция полностью сопоставлена, но matchedBy нет, помечаем как manual
      // (если matchedBy уже есть от автосопоставления, оставляем его)
      if (!updatedOperation.matchedBy) {
        const finalOperation = await prisma.importedOperation.update({
          where: { id },
          data: { matchedBy: 'manual' },
          include: {
            article: { select: { id: true, name: true } },
            counterparty: { select: { id: true, name: true } },
            account: { select: { id: true, name: true } },
            deal: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          } as any,
        });
        return transformImportedOperation(finalOperation);
      }
    } else {
      // Если операция не полностью сопоставлена, сбрасываем matchedBy
      if (updatedOperation.matchedBy) {
        const finalOperation = await prisma.importedOperation.update({
          where: { id },
          data: { matchedBy: null, matchedRuleId: null },
          include: {
            article: { select: { id: true, name: true } },
            counterparty: { select: { id: true, name: true } },
            account: { select: { id: true, name: true } },
            deal: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          } as any,
        });
        return transformImportedOperation(finalOperation);
      }
    }

    return transformImportedOperation(updatedOperation);
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
      confirmed?: boolean;
    }
  ) {
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

    const updateData: any = {};

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
  async applyRules(sessionId: string, companyId: string) {
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

        // Проверяем, что операция полностью сопоставлена (статья, счет, валюта)
        // Контрагент не обязателен, как в обычной форме
        const isFullyMatched = !!(
          matchingResult.matchedArticleId &&
          matchingResult.matchedAccountId &&
          op.currency
        );

        await prisma.importedOperation.update({
          where: { id: op.id },
          data: {
            matchedArticleId: matchingResult.matchedArticleId,
            matchedCounterpartyId: matchingResult.matchedCounterpartyId,
            matchedAccountId: matchingResult.matchedAccountId,
            // Устанавливаем matchedBy только если операция полностью сопоставлена
            matchedBy: isFullyMatched ? matchingResult.matchedBy : null,
            matchedRuleId: isFullyMatched ? matchingResult.matchedRuleId : null,
            // Используем новое значение direction, если оно определено, иначе сохраняем старое
            direction:
              matchingResult.direction !== null &&
              matchingResult.direction !== undefined
                ? matchingResult.direction
                : op.direction,
          },
        });

        updated++;
      } catch (error: any) {
        // Логируем ошибку с деталями, но продолжаем обработку остальных
        logger.error('Failed to apply rules to operation', {
          sessionId,
          companyId,
          operationId: op.id,
          error: error?.message || String(error),
          stack: error?.stack,
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
  ) {
    logger.info('Starting import operations', {
      sessionId,
      companyId,
      userId,
      operationIds: operationIds?.length || 0,
      saveRulesForIds: saveRulesForIds?.length || 0,
    });

    // Проверяем, что сессия принадлежит компании
    const session = await prisma.importSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new AppError('Import session not found', 404);
    }

    // Получаем черновики для импорта
    const where: any = {
      importSessionId: sessionId,
      companyId,
      processed: false, // Импортируем только необработанные операции
    };

    if (operationIds && operationIds.length > 0) {
      where.id = { in: operationIds };
    }

    const operations = await prisma.importedOperation.findMany({
      where,
    });

    logger.info('Operations found for import', {
      sessionId,
      companyId,
      operationsCount: operations.length,
      transferOperations: operations
        .filter((op) => op.direction === 'transfer')
        .map((op) => ({
          id: op.id,
          number: op.number,
          payerAccount: op.payerAccount,
          receiverAccount: op.receiverAccount,
          direction: op.direction,
        })),
    });

    if (operations.length === 0) {
      throw new AppError('No operations to import', 400);
    }

    // Проверяем, что все операции полностью сопоставлены
    // Операция считается сопоставленной, если указаны: статья, счет и валюта
    // Для переводов (transfer) статья и счет не обязательны, нужны только payerAccount и receiverAccount
    // Валюта по умолчанию 'RUB', как на фронтенде
    logger.info('Validating operations before import', {
      sessionId,
      companyId,
      operationsCount: operations.length,
      transferOperationsCount: operations.filter(
        (op) => op.direction === 'transfer'
      ).length,
    });

    const unmatchedOperations: string[] = [];
    for (const op of operations) {
      // Логируем данные операции для переводов
      if (op.direction === 'transfer') {
        logger.info('Validating transfer operation', {
          operationId: op.id,
          operationNumber: op.number,
          direction: op.direction,
          payerAccount: op.payerAccount,
          receiverAccount: op.receiverAccount,
          currency: op.currency,
          date: op.date,
          amount: op.amount,
          description: op.description,
        });
      }

      if (!op.direction) {
        unmatchedOperations.push(
          `Операция ${op.number || op.id}: не указан тип операции`
        );
        continue;
      }

      // Валюта по умолчанию 'RUB', как на фронтенде (checkOperationMatched)
      // Если валюта не указана в БД, она будет установлена в 'RUB' при создании операции
      // Но проверяем, что валюта есть (может быть null в старых данных)
      if (!op.currency) {
        // Устанавливаем валюту по умолчанию для операции
        op.currency = 'RUB';
      }

      if (op.direction === 'transfer') {
        // Для переводов нужны счета плательщика и получателя
        if (!op.payerAccount || !op.receiverAccount) {
          logger.warn('Transfer operation missing account numbers', {
            operationId: op.id,
            operationNumber: op.number,
            payerAccount: op.payerAccount,
            receiverAccount: op.receiverAccount,
          });
          unmatchedOperations.push(
            `Операция ${op.number || op.id}: для перевода нужны счета плательщика и получателя`
          );
        }
      } else {
        // Для income/expense нужны статья и счет
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
    const errorMessages: string[] = []; // Собираем детальные сообщения об ошибках

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
        // Увеличиваем таймаут транзакции до 5 минут для обработки больших батчей
        // maxWait - время ожидания начала транзакции (30 секунд)
        // timeout - максимальное время выполнения транзакции (5 минут)
        // Для файлов с несколькими тысячами операций требуется больше времени
        await prisma.$transaction(
          async (tx) => {
            for (const op of batch) {
              try {
                // Логируем начало обработки операции
                logger.info('Processing operation for import', {
                  operationId: op.id,
                  operationNumber: op.number,
                  direction: op.direction,
                  date: op.date,
                  amount: op.amount,
                  companyId,
                });

                // Проверяем обязательные поля
                if (!op.direction) {
                  throw new AppError(
                    `Operation ${op.id} has no direction`,
                    400
                  );
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
                  logger.warn('Transfer operation missing account numbers', {
                    operationId: op.id,
                    operationNumber: op.number,
                    payerAccount: op.payerAccount,
                    receiverAccount: op.receiverAccount,
                  });
                  throw new AppError(
                    `Operation ${op.id} is missing account information for transfer`,
                    400
                  );
                }

                // Создаем операцию
                const operationData: any = {
                  type: op.direction,
                  operationDate: op.date,
                  amount: op.amount,
                  currency: op.currency || 'RUB',
                  description: op.description,
                  repeat: op.repeat || 'none',
                };

                if (op.direction === 'transfer') {
                  // Логируем данные перевода
                  logger.info('Processing transfer operation', {
                    operationId: op.id,
                    operationNumber: op.number,
                    payerAccount: op.payerAccount,
                    receiverAccount: op.receiverAccount,
                    companyId,
                  });

                  // Для переводов нужно найти счета по номерам
                  // Если счет не найден по номеру, используем выбранный счет (matchedAccountId) как fallback
                  let sourceAccount = op.payerAccount
                    ? await tx.account.findFirst({
                        where: {
                          companyId,
                          number: op.payerAccount,
                          isActive: true,
                        },
                      })
                    : null;

                  let targetAccount = op.receiverAccount
                    ? await tx.account.findFirst({
                        where: {
                          companyId,
                          number: op.receiverAccount,
                          isActive: true,
                        },
                      })
                    : null;

                  // Если счет не найден по номеру, используем выбранный счет как fallback
                  // Но только для одного недостающего счета, чтобы избежать одинаковых счетов
                  const matchedAccount = op.matchedAccountId
                    ? await tx.account.findFirst({
                        where: {
                          id: op.matchedAccountId,
                          companyId,
                          isActive: true,
                        },
                      })
                    : null;

                  // Используем выбранный счет только если один счет найден, а другой нет
                  // и выбранный счет отличается от найденного
                  if (matchedAccount) {
                    if (
                      !sourceAccount &&
                      targetAccount &&
                      targetAccount.id !== matchedAccount.id
                    ) {
                      // sourceAccount не найден, targetAccount найден и отличается от выбранного
                      sourceAccount = matchedAccount;
                      logger.info(
                        'Using matchedAccountId as fallback for source account',
                        {
                          operationId: op.id,
                          operationNumber: op.number,
                          matchedAccountId: op.matchedAccountId,
                        }
                      );
                    } else if (
                      !targetAccount &&
                      sourceAccount &&
                      sourceAccount.id !== matchedAccount.id
                    ) {
                      // targetAccount не найден, sourceAccount найден и отличается от выбранного
                      targetAccount = matchedAccount;
                      logger.info(
                        'Using matchedAccountId as fallback for target account',
                        {
                          operationId: op.id,
                          operationNumber: op.number,
                          matchedAccountId: op.matchedAccountId,
                        }
                      );
                    }
                  }

                  // Логируем результаты поиска счетов
                  logger.info('Account lookup results for transfer', {
                    operationId: op.id,
                    operationNumber: op.number,
                    payerAccount: op.payerAccount,
                    receiverAccount: op.receiverAccount,
                    matchedAccountId: op.matchedAccountId,
                    sourceAccountFound: !!sourceAccount,
                    sourceAccountId: sourceAccount?.id,
                    targetAccountFound: !!targetAccount,
                    targetAccountId: targetAccount?.id,
                  });

                  if (!sourceAccount || !targetAccount) {
                    const missingAccounts: string[] = [];
                    if (!sourceAccount) {
                      if (op.payerAccount) {
                        missingAccounts.push(
                          `счет плательщика: ${op.payerAccount}`
                        );
                      } else {
                        missingAccounts.push('счет плательщика не указан');
                      }
                    }
                    if (!targetAccount) {
                      if (op.receiverAccount) {
                        missingAccounts.push(
                          `счет получателя: ${op.receiverAccount}`
                        );
                      } else {
                        missingAccounts.push('счет получателя не указан');
                      }
                    }

                    // Логируем детали ошибки
                    logger.error('Transfer operation: accounts not found', {
                      operationId: op.id,
                      operationNumber: op.number,
                      payerAccount: op.payerAccount,
                      receiverAccount: op.receiverAccount,
                      matchedAccountId: op.matchedAccountId,
                      sourceAccountFound: !!sourceAccount,
                      targetAccountFound: !!targetAccount,
                      missingAccounts,
                      companyId,
                    });

                    // Формируем понятное сообщение об ошибке
                    let errorMessage = `Операция ${op.number || op.id}: не найдены счета для перевода. `;
                    if (missingAccounts.length > 0) {
                      errorMessage += `Не найдены: ${missingAccounts.join(', ')}. `;
                    }

                    // Если оба счета не найдены, объясняем что нужно
                    if (!sourceAccount && !targetAccount) {
                      errorMessage +=
                        'Для перевода нужны два разных счета. Добавьте счета с указанными номерами в справочник или убедитесь, что хотя бы один из счетов найден по номеру из выписки.';
                    } else {
                      errorMessage +=
                        'Выберите счет в таблице (он будет использован для недостающего счета) или добавьте счет с указанным номером в справочник.';
                    }

                    throw new AppError(errorMessage, 400);
                  }

                  // Проверяем, что счета разные
                  if (sourceAccount.id === targetAccount.id) {
                    throw new AppError(
                      `Операция ${op.number || op.id}: счета плательщика и получателя не могут быть одинаковыми для перевода. Для перевода нужны два разных счета.`,
                      400
                    );
                  }

                  operationData.sourceAccountId = sourceAccount.id;
                  operationData.targetAccountId = targetAccount.id;

                  logger.info('Transfer operation data prepared', {
                    operationId: op.id,
                    operationNumber: op.number,
                    sourceAccountId: sourceAccount.id,
                    targetAccountId: targetAccount.id,
                    operationData,
                  });
                } else {
                  operationData.accountId = op.matchedAccountId;
                  operationData.articleId = op.matchedArticleId;
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

                // Логируем данные перед созданием операции
                logger.info('Creating operation', {
                  operationId: op.id,
                  operationNumber: op.number,
                  direction: op.direction,
                  operationData,
                  companyId,
                });

                // Создаем операцию через prisma напрямую
                const createdOperation = await tx.operation.create({
                  data: {
                    ...operationData,
                    companyId,
                    isTemplate: false,
                    isConfirmed: true,
                  },
                });

                logger.info('Operation created successfully', {
                  operationId: op.id,
                  operationNumber: op.number,
                  createdOperationId: createdOperation.id,
                  direction: op.direction,
                });

                // Помечаем как обработанную
                await tx.importedOperation.update({
                  where: { id: op.id },
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
                  } catch (error: any) {
                    // Логируем ошибку, но не прерываем импорт
                    console.error(
                      `Failed to save rules for operation ${op.id}:`,
                      error.message
                    );
                  }
                }

                created++;
              } catch (error: any) {
                errors++;
                const errorMessage = error?.message || String(error);

                // Сохраняем детальное сообщение об ошибке
                errorMessages.push(
                  `Операция ${op.number || op.id}: ${errorMessage}`
                );

                logger.error('Failed to import operation', {
                  sessionId,
                  companyId,
                  operationId: op.id,
                  operationNumber: op.number,
                  operationDate: op.date,
                  error: errorMessage,
                  stack: error?.stack,
                });
                // Продолжаем обработку остальных операций в батче
              }
            }
          },
          {
            maxWait: 30000, // 30 секунд ожидания начала транзакции
            timeout: 300000, // 5 минут на выполнение транзакции (для больших файлов с несколькими тысячами операций)
          }
        );
      } catch (error: any) {
        // Логируем ошибку батча, но продолжаем обработку следующих батчей
        const errorMessage = error?.message || String(error);
        logger.error('Failed to import batch', {
          sessionId,
          companyId,
          batchSize: batch.length,
          error: errorMessage,
          stack: error?.stack,
        });

        // Помечаем все операции в батче как ошибки и сохраняем сообщение
        errors += batch.length;
        for (const op of batch) {
          errorMessages.push(`Операция ${op.number || op.id}: ${errorMessage}`);
        }
      }
    }

    // Обновляем счетчики сессии
    const processedCount = await prisma.importedOperation.count({
      where: { importSessionId: sessionId, companyId, processed: true },
    });

    await prisma.importSession.update({
      where: { id: sessionId },
      data: {
        processedCount,
        status:
          processedCount === session.importedCount ? 'processed' : 'confirmed',
      },
    });

    return {
      imported: operations.length,
      created,
      errors,
      sessionId,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    };
  }

  /**
   * Удаляет сессию импорта
   */
  async deleteSession(sessionId: string, companyId: string) {
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
      where: { id: sessionId },
    });

    return { deleted: deletedCount + 1 };
  }

  /**
   * Получает список правил маппинга
   */
  async getMappingRules(
    companyId: string,
    filters?: { targetType?: string; sourceField?: string }
  ) {
    const where: any = { companyId };

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
  ) {
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
  ) {
    const rule = await prisma.mappingRule.findFirst({
      where: { id, companyId },
    });

    if (!rule) {
      throw new AppError('Mapping rule not found', 404);
    }

    return prisma.mappingRule.update({
      where: { id },
      data,
    });
  }

  /**
   * Удаляет правило маппинга
   */
  async deleteMappingRule(id: string, companyId: string) {
    const rule = await prisma.mappingRule.findFirst({
      where: { id, companyId },
    });

    if (!rule) {
      throw new AppError('Mapping rule not found', 404);
    }

    return prisma.mappingRule.delete({
      where: { id },
    });
  }

  /**
   * Получает информацию о сессии импорта
   */
  async getImportSession(sessionId: string, companyId: string) {
    const session = await sessionService.getSession(sessionId, companyId);

    // Получаем количество обработанных операций
    const processedCount = await prisma.importedOperation.count({
      where: { importSessionId: sessionId, companyId },
    });

    return {
      id: session.id,
      fileName: session.fileName,
      status: session.status,
      importedCount: session.importedCount,
      processedCount,
      confirmedCount: session.confirmedCount,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  /**
   * Получает историю импортов
   */
  async getImportSessions(
    companyId: string,
    filters?: { status?: string; limit?: number; offset?: number }
  ) {
    const where: any = { companyId };

    if (filters?.status) {
      where.status = filters.status;
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

  /**
   * Получает общее количество импортированных операций (processed) для компании
   */
  async getTotalImportedOperationsCount(companyId: string): Promise<number> {
    return prisma.importedOperation.count({
      where: {
        companyId,
        processed: true,
      },
    });
  }
}

export default new ImportsService();
