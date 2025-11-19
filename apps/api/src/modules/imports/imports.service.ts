import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import logger from '../../config/logger';
import { AppError } from '../../middlewares/error';
import {
  parseClientBankExchange,
  ParsedFile,
  ParsedDocument,
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

/**
 * Main imports service - orchestrates the import process
 *
 * Responsibilities:
 * - File upload and parsing
 * - Orchestration of sub-services
 * - High-level business logic
 */
export class ImportsService {
  private batchProcessor = new BatchProcessor<
    ParsedDocument,
    Prisma.ImportedOperationGetPayload<Record<string, never>>
  >(100);

  /**
   * Загружает файл выписки, парсит и создает сессию импорта
   */
  async uploadStatement(
    companyId: string,
    userId: string,
    fileName: string,
    fileBuffer: Buffer
  ): Promise<UploadStatementResult> {
    // Валидация размера файла (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (fileBuffer.length > maxSize) {
      throw new AppError('File size exceeds 10MB limit', 400);
    }

    // Парсинг файла
    const parsedFile = await this.parseFile(fileName, fileBuffer);
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
    const { duplicatesCount } = await this.checkDuplicatesByHash(
      companyId,
      documents
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
    const importedOperations = await this.createImportedOperations(
      importSession.id,
      companyId,
      documents,
      company?.inn || null,
      companyAccountNumber
    );

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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('File parsing failed', {
        fileName,
        error: errorMessage,
        stack: errorStack,
      });

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        errorMessage || `Failed to parse file: ${String(error)}`,
        400
      );
    }
  }

  /**
   * Проверяет дубликаты по хэшу (быстрая проверка)
   */
  private async checkDuplicatesByHash(
    companyId: string,
    documents: ParsedDocument[]
  ): Promise<{ uniqueDocuments: ParsedDocument[]; duplicatesCount: number }> {
    if (documents.length === 0) {
      return { uniqueDocuments: [], duplicatesCount: 0 };
    }

    // Собираем хэши
    const hashes = documents
      .map((doc) => doc.hash)
      .filter((hash): hash is string => hash !== null && hash !== undefined);

    logger.debug('Checking duplicates by hash', {
      hashesCount: hashes.length,
    });

    // Ищем существующие операции с такими хэшами
    const existingOperations = await prisma.operation.findMany({
      where: {
        companyId,
        sourceHash: {
          in: hashes.length > 0 ? hashes : [],
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
        .filter((hash): hash is string => hash !== null && hash !== undefined)
    );

    // Разделяем на уникальные и дубликаты
    const duplicates: ParsedDocument[] = [];
    const uniqueDocuments: ParsedDocument[] = [];

    for (const doc of documents) {
      if (doc.hash && existingHashes.has(doc.hash)) {
        duplicates.push(doc);
      } else {
        uniqueDocuments.push(doc);
      }
    }

    logger.info('Duplicate check by hash completed', {
      totalDocuments: documents.length,
      duplicatesCount: duplicates.length,
      uniqueDocumentsCount: uniqueDocuments.length,
    });

    return {
      uniqueDocuments,
      duplicatesCount: duplicates.length,
    };
  }

  /**
   * Создает черновики операций батчами
   */
  private async createImportedOperations(
    sessionId: string,
    companyId: string,
    documents: ParsedDocument[],
    companyInn: string | null,
    companyAccountNumber?: string
  ): Promise<Prisma.ImportedOperationGetPayload<Record<string, never>>[]> {
    // Verify the import session belongs to the company (security check)
    const session = await prisma.importSession.findFirst({
      where: { id: sessionId, companyId },
      select: { id: true },
    });

    if (!session) {
      throw new AppError(
        'Import session not found or does not belong to company',
        404
      );
    }

    const importedOperations: Prisma.ImportedOperationGetPayload<
      Record<string, never>
    >[] = [];

    await this.batchProcessor.processBatches(
      documents,
      async (batch, batchNumber) => {
        const batchResults: Prisma.ImportedOperationGetPayload<
          Record<string, never>
        >[] = [];

        try {
          await prisma.$transaction(async (tx) => {
            // Security: Verify session belongs to company within transaction (defense in depth)
            const sessionCheck = await tx.importSession.findFirst({
              where: { id: sessionId, companyId },
              select: { id: true },
            });
            if (!sessionCheck) {
              throw new AppError('Import session validation failed', 403);
            }

            for (const doc of batch) {
              try {
                // Проверка дубликата
                const duplicateCheck =
                  await duplicateDetectionService.detectDuplicate(
                    companyId,
                    doc
                  );

                // Автосопоставление
                const matchingResult = await autoMatch(
                  companyId,
                  doc,
                  companyInn,
                  companyAccountNumber
                );

                // Проверка полного сопоставления
                const isFullyMatched = !!(
                  matchingResult.matchedArticleId &&
                  matchingResult.matchedAccountId &&
                  matchingResult.direction
                );

                // Создаем черновик
                const operationData: Prisma.ImportedOperationCreateInput = {
                  importSession: { connect: { id: sessionId } },
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
                  currency: 'RUB',
                  matchedBy: isFullyMatched ? matchingResult.matchedBy : null,
                  isDuplicate: duplicateCheck.isDuplicate,
                  duplicateOfId: duplicateCheck.duplicateOfId || null,
                  confirmed: false,
                  processed: false,
                  draft: true,
                };

                // Добавляем связи
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

                batchResults.push(importedOp);
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                const errorStack =
                  error instanceof Error ? error.stack : undefined;

                logger.error('Failed to process document during import', {
                  sessionId,
                  batchNumber,
                  document: {
                    date: doc.date,
                    amount: doc.amount,
                    number: doc.number,
                  },
                  error: errorMessage,
                  stack: errorStack,
                });
              }
            }
          });

          importedOperations.push(...batchResults);
          logger.debug('Batch processed successfully', {
            sessionId,
            batchNumber,
            batchSize: batch.length,
            totalProcessed: importedOperations.length,
          });
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error('Failed to process batch during import', {
            sessionId,
            batchNumber,
            error: errorMessage,
          });
        }

        return batchResults;
      },
      {
        context: `Upload statement session ${sessionId}`,
        continueOnError: true,
      }
    );

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
    return sessionService.getImportedOperations(sessionId, companyId, filters);
  }

  /**
   * Получает все операции сессии без пагинации
   */
  async getAllImportedOperations(sessionId: string, companyId: string) {
    return sessionService.getAllImportedOperations(sessionId, companyId);
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
    return sessionService.updateImportedOperation(id, companyId, data);
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
  ) {
    return sessionService.bulkUpdateImportedOperations(
      sessionId,
      companyId,
      operationIds,
      data
    );
  }

  /**
   * Применяет правила маппинга к сессии
   */
  async applyRules(
    sessionId: string,
    companyId: string
  ): Promise<ApplyRulesResult> {
    return operationImportService.applyRules(sessionId, companyId);
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
  ): Promise<ImportOperationsResult> {
    return operationImportService.importOperations(
      sessionId,
      companyId,
      userId,
      operationIds,
      saveRulesForIds
    );
  }

  /**
   * Удаляет сессию импорта
   */
  async deleteSession(sessionId: string, companyId: string) {
    const result = await sessionService.deleteSession(sessionId, companyId);
    // Инвалидируем кэш отчетов после удаления сессии импорта
    await invalidateReportCache(companyId);
    return result;
  }

  /**
   * Получает список правил маппинга
   */
  async getMappingRules(
    companyId: string,
    filters?: { targetType?: string; sourceField?: string }
  ) {
    return mappingRulesService.getMappingRules(companyId, filters);
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
    return mappingRulesService.createMappingRule(companyId, userId, data);
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
    return mappingRulesService.updateMappingRule(id, companyId, data);
  }

  /**
   * Удаляет правило маппинга
   */
  async deleteMappingRule(id: string, companyId: string) {
    return mappingRulesService.deleteMappingRule(id, companyId);
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
  ) {
    return sessionService.getImportSessions(companyId, filters);
  }
}

export default new ImportsService();
