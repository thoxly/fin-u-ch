import prisma from '../../config/db';
import logger from '../../config/logger';
import { AppError } from '../../middlewares/error';
import { parseClientBankExchange, ParsedDocument, ParsedFile } from './parsers/clientBankExchange.parser';
import { autoMatch } from './services/matching.service';
import operationsService from '../operations/operations.service';
import articlesService from '../catalogs/articles/articles.service';
import counterpartiesService from '../catalogs/counterparties/counterparties.service';

export interface ImportFilters {
  confirmed?: boolean;
  matched?: boolean;
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
   * Загружает файл выписки, парсит и создает сессию импорта
   */
  async uploadStatement(
    companyId: string,
    userId: string,
    fileName: string,
    fileBuffer: Buffer
  ) {
    // Валидация размера файла (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > maxSize) {
      throw new AppError('File size exceeds 10MB limit', 400);
    }

    // Парсинг файла
    let parsedFile: ParsedFile;
    try {
      // Логируем начало парсинга
      const filePreview = fileBuffer.slice(0, 500).toString('utf8').replace(/\0/g, '');
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

    const documents = parsedFile.documents;
    const companyAccountNumber = parsedFile.companyAccountNumber;

    // Валидация количества операций (максимум 1000)
    if (documents.length > 1000) {
      throw new AppError('File contains more than 1000 operations', 400);
    }

    // Если документов нет, но ошибка не была выброшена парсером,
    // значит файл корректный, но пустой
    if (documents.length === 0) {
      throw new AppError(
        'File contains no valid operations. Please check that the file contains payment orders (Платежное поручение) with required fields (Дата, Сумма).',
        400
      );
    }

    // Получаем ИНН компании
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { inn: true },
    });

    // Создаем сессию импорта
    const session = await prisma.importSession.create({
      data: {
        companyId,
        userId,
        fileName,
        status: 'draft',
        importedCount: documents.length,
      },
    });

    // Применяем автосопоставление и создаем черновики операций
    // Используем батчинг для больших файлов (по 100 операций за раз)
    const importedOperations = [];
    const BATCH_SIZE = 100;
    const batches = [];

    // Разбиваем документы на батчи
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      batches.push(documents.slice(i, i + BATCH_SIZE));
    }

    // Обрабатываем каждый батч в транзакции
    for (const batch of batches) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const doc of batch) {
            try {
              // Автосопоставление
              const matchingResult = await autoMatch(companyId, doc, company?.inn || null, companyAccountNumber);

              // Проверяем, что операция полностью сопоставлена (статья, счет, валюта)
              // Валюта по умолчанию RUB, но для полного сопоставления нужны все поля
              const isFullyMatched = !!(
                matchingResult.matchedArticleId &&
                matchingResult.matchedAccountId &&
                matchingResult.direction // направление обязательно
              );

              // Создаем черновик операции
              const operationData = {
                importSessionId: session.id,
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
                matchedRuleId: isFullyMatched ? matchingResult.matchedRuleId : null,
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
                fileName,
                sessionId: session.id,
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
        });
      } catch (error: any) {
        // Логируем ошибку батча, но продолжаем обработку следующих батчей
        logger.error('Failed to process batch during import', {
          fileName,
          sessionId: session.id,
          batchSize: batch.length,
          error: error?.message || String(error),
          stack: error?.stack,
        });
      }
    }

    return {
      sessionId: session.id,
      importedCount: importedOperations.length,
      fileName: session.fileName,
    };
  }

  /**
   * Получает список черновиков операций из сессии
   */
  async getImportedOperations(sessionId: string, companyId: string, filters?: ImportFilters) {
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
        orderBy: { date: 'desc' },
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
      operations,
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

    // Обновляем matchedBy в зависимости от полного сопоставления
    if (isFullyMatched) {
      // Если операция полностью сопоставлена, но matchedBy нет, помечаем как manual
      // (если matchedBy уже есть от автосопоставления, оставляем его)
      if (!updatedOperation.matchedBy) {
        const finalOperation = await prisma.importedOperation.update({
          where: { id },
          data: { matchedBy: 'manual' },
          include: {
            matchedArticle: { select: { id: true, name: true } },
            matchedCounterparty: { select: { id: true, name: true } },
            matchedAccount: { select: { id: true, name: true } },
            matchedDeal: { select: { id: true, name: true } },
            matchedDepartment: { select: { id: true, name: true } },
          },
        });
        return finalOperation;
      }
    } else {
      // Если операция не полностью сопоставлена, сбрасываем matchedBy
      if (updatedOperation.matchedBy) {
        const finalOperation = await prisma.importedOperation.update({
          where: { id },
          data: { matchedBy: null, matchedRuleId: null },
          include: {
            matchedArticle: { select: { id: true, name: true } },
            matchedCounterparty: { select: { id: true, name: true } },
            matchedAccount: { select: { id: true, name: true } },
            matchedDeal: { select: { id: true, name: true } },
            matchedDepartment: { select: { id: true, name: true } },
          },
        });
        return finalOperation;
      }
    }

    return updatedOperation;
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
        const matchingResult = await autoMatch(companyId, doc, company?.inn || null);

        // Проверяем, что операция полностью сопоставлена (контрагент, статья, счет, валюта)
        const isFullyMatched = !!(
          matchingResult.matchedCounterpartyId &&
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
            direction: matchingResult.direction !== null && matchingResult.direction !== undefined 
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

    if (operations.length === 0) {
      throw new AppError('No operations to import', 400);
    }

    // Проверяем, что все операции полностью сопоставлены
    // Операция считается сопоставленной, если указаны: статья, счет и валюта
    const unmatchedOperations: string[] = [];
    for (const op of operations) {
      if (!op.direction) {
        unmatchedOperations.push(`Операция ${op.number || op.id}: не указан тип операции`);
        continue;
      }

      // Проверяем обязательные поля
      if (!op.matchedArticleId) {
        unmatchedOperations.push(`Операция ${op.number || op.id}: не указана статья`);
      }
      if (!op.matchedAccountId) {
        unmatchedOperations.push(`Операция ${op.number || op.id}: не указан счет`);
      }
      if (!op.currency) {
        unmatchedOperations.push(`Операция ${op.number || op.id}: не указана валюта`);
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

        if (op.direction !== 'transfer' && (!op.matchedArticleId || !op.matchedAccountId)) {
          throw new AppError(`Operation ${op.id} is missing required fields`, 400);
        }

        if (op.direction === 'transfer' && (!op.payerAccount || !op.receiverAccount)) {
          throw new AppError(`Operation ${op.id} is missing account information for transfer`, 400);
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
          // Для переводов нужно найти счета по номерам
          const sourceAccount = op.payerAccount
            ? await prisma.account.findFirst({
                where: { companyId, number: op.payerAccount, isActive: true },
              })
            : null;

          const targetAccount = op.receiverAccount
            ? await prisma.account.findFirst({
                where: { companyId, number: op.receiverAccount, isActive: true },
              })
            : null;

          if (!sourceAccount || !targetAccount) {
            throw new AppError(`Cannot find accounts for transfer operation ${op.id}`, 400);
          }

          operationData.sourceAccountId = sourceAccount.id;
          operationData.targetAccountId = targetAccount.id;
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

        // Создаем операцию через сервис
        await operationsService.create(companyId, operationData);

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
              const pattern = op.direction === 'expense' ? op.receiver : op.payer;
              if (pattern) {
                await this.createMappingRule(companyId, userId, {
                  ruleType: 'contains',
                  pattern,
                  targetType: 'counterparty',
                  targetId: op.matchedCounterpartyId,
                  sourceField: op.direction === 'expense' ? 'receiver' : 'payer',
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
            console.error(`Failed to save rules for operation ${op.id}:`, error.message);
          }
        }

            created++;
          } catch (error: any) {
            errors++;
            logger.error('Failed to import operation', {
              sessionId,
              companyId,
              operationId: op.id,
              operationNumber: op.number,
              operationDate: op.date,
              error: error?.message || String(error),
              stack: error?.stack,
            });
            // Продолжаем обработку остальных операций в батче
          }
        }
      });
      } catch (error: any) {
        // Логируем ошибку батча, но продолжаем обработку следующих батчей
        logger.error('Failed to import batch', {
          sessionId,
          companyId,
          batchSize: batch.length,
          error: error?.message || String(error),
          stack: error?.stack,
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
      where: { id: sessionId },
      data: {
        processedCount,
        status: processedCount === session.importedCount ? 'processed' : 'confirmed',
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
}

export default new ImportsService();

