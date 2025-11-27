import { Prisma } from '@prisma/client';
import prisma from '../../../config/db';
import logger from '../../../config/logger';
import { AppError } from '../../../middlewares/error';
import { CreateOperationSchema, ParsedDocument } from '@fin-u-ch/shared';
import { createOperationHash } from '@fin-u-ch/shared/lib/operationHash';
import { formatZodErrors } from '../../../utils/validation';
import { autoMatch } from './matching.service';
import { invalidateReportCache } from '../../reports/utils/cache';
import { BatchProcessor } from '../utils/batch-processor';
import mappingRulesService from './mapping-rules.service';
import sessionService, { IMPORT_SESSION_STATUS } from './session.service';

/**
 * Service for importing operations from imported_operations to operations table
 */
export class OperationImportService {
  private batchProcessor = new BatchProcessor<
    Prisma.ImportedOperationGetPayload<Record<string, never>>,
    { success: boolean; operationId?: string; error?: string }
  >(50);

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
    const session = await sessionService.getSession(sessionId, companyId);

    // Получаем черновики для импорта
    const where: Prisma.ImportedOperationWhereInput = {
      importSessionId: sessionId,
      companyId,
      processed: false,
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

    // Валидация полноты сопоставления
    this.validateOperationsForImport(operations);

    let created = 0;
    let errors = 0;

    // Обрабатываем операции батчами
    await this.batchProcessor.processBatches(
      operations,
      async (batch, _batchNumber) => {
        const results = await this.processBatch(
          batch,
          companyId,
          userId,
          saveRulesForIds
        );

        // Подсчитываем успешные и неуспешные операции
        for (const result of results) {
          if (result.success) {
            created++;
          } else {
            errors++;
          }
        }

        return results;
      },
      {
        context: `Import operations for session ${sessionId}`,
        continueOnError: true,
        onBatchError: (batchNumber, error) => {
          logger.error('Batch import failed', {
            sessionId,
            companyId,
            batchNumber,
            error,
          });
        },
      }
    );

    // Обновляем счетчики сессии (включая статус)
    await sessionService.updateSessionCounters(sessionId, companyId);

    // Инвалидируем кэш отчетов после успешного импорта операций
    if (created > 0) {
      await invalidateReportCache(companyId);
    }

    return {
      imported: operations.length,
      created,
      errors,
      sessionId,
    };
  }

  /**
   * Валидирует операции перед импортом
   */
  private validateOperationsForImport(
    operations: Prisma.ImportedOperationGetPayload<Record<string, never>>[]
  ): void {
    const unmatchedOperations: string[] = [];

    for (const op of operations) {
      if (!op.direction) {
        unmatchedOperations.push(
          `Операция ${op.number || op.id}: не указан тип операции`
        );
        continue;
      }

      // Валюта обязательна для всех операций
      if (!op.currency) {
        unmatchedOperations.push(
          `Операция ${op.number || op.id}: не указана валюта`
        );
      }

      if (op.direction === 'transfer') {
        // Для переводов нужны счета плательщика и получателя
        if (!op.payerAccount || !op.receiverAccount) {
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
  }

  /**
   * Обрабатывает батч операций
   */
  private async processBatch(
    batch: Prisma.ImportedOperationGetPayload<Record<string, never>>[],
    companyId: string,
    userId: string,
    saveRulesForIds?: string[]
  ): Promise<{ success: boolean; operationId?: string; error?: string }[]> {
    const results: {
      success: boolean;
      operationId?: string;
      error?: string;
    }[] = [];

    try {
      await prisma.$transaction(async (tx) => {
        // Предзагружаем все счета для transfer операций
        const accountsMap = await this.preloadAccounts(batch, companyId, tx);

        for (const op of batch) {
          try {
            // Валидация обязательных полей
            this.validateOperation(op);

            // Подготавливаем данные операции
            const operationData = await this.prepareOperationData(
              op,
              accountsMap
            );

            // Валидируем через Zod
            const validationResult =
              CreateOperationSchema.safeParse(operationData);

            if (!validationResult.success) {
              const errorMessage = formatZodErrors(validationResult.error);
              logger.error('Operation validation failed', {
                operationId: op.id,
                operationData,
                validationErrors: validationResult.error.errors,
              });
              throw new AppError(
                `Validation error for operation ${op.id}: ${errorMessage}`,
                400
              );
            }

            const validatedData = validationResult.data;

            // Создаем hash из исходных данных
            const sourceHash = createOperationHash({
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
            });

            // Создаем операцию
            await tx.operation.create({
              data: {
                ...validatedData,
                companyId,
                isTemplate: false,
                isConfirmed: true,
                sourceHash,
              },
            });

            // Помечаем как обработанную
            await tx.importedOperation.update({
              where: { id: op.id, companyId },
              data: { processed: true },
            });

            // Сохраняем правила если нужно
            if (saveRulesForIds && saveRulesForIds.includes(op.id)) {
              await mappingRulesService.saveRulesForOperation(
                tx,
                companyId,
                userId,
                op
              );
            }

            results.push({ success: true, operationId: op.id });
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;

            logger.error('Failed to import operation', {
              companyId,
              operationId: op.id,
              operationNumber: op.number,
              operationDate: op.date,
              error: errorMessage,
              stack: errorStack,
            });

            results.push({ success: false, error: errorMessage });
            // Продолжаем обработку остальных операций в батче
          }
        }
      });
    } catch (error: unknown) {
      // Если транзакция упала, все операции в батче считаются ошибочными
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Transaction failed for batch', {
        companyId,
        batchSize: batch.length,
        error: errorMessage,
      });
      // Добавляем ошибки для всех операций в батче
      for (const _op of batch) {
        results.push({ success: false, error: errorMessage });
      }
    }

    return results;
  }

  /**
   * Предзагружает счета для transfer операций
   */
  private async preloadAccounts(
    batch: Prisma.ImportedOperationGetPayload<Record<string, never>>[],
    companyId: string,
    tx: Prisma.TransactionClient
  ): Promise<Map<string, { id: string; number: string }>> {
    const transferOperations = batch.filter(
      (op) => op.direction === 'transfer'
    );
    const accountNumbers = new Set<string>();

    for (const op of transferOperations) {
      if (op.payerAccount) accountNumbers.add(op.payerAccount);
      if (op.receiverAccount) accountNumbers.add(op.receiverAccount);
    }

    const accountsMap = new Map<string, { id: string; number: string }>();

    if (accountNumbers.size > 0) {
      const accounts = await tx.account.findMany({
        where: {
          companyId,
          number: { in: Array.from(accountNumbers) },
          isActive: true,
        },
        select: { id: true, number: true },
      });

      for (const account of accounts) {
        if (account.number) {
          accountsMap.set(account.number, {
            id: account.id,
            number: account.number,
          });
        }
      }
    }

    return accountsMap;
  }

  /**
   * Валидирует одну операцию
   */
  private validateOperation(
    op: Prisma.ImportedOperationGetPayload<Record<string, never>>
  ): void {
    if (!op.direction) {
      throw new AppError(`Operation ${op.id} has no direction`, 400);
    }

    if (
      op.direction !== 'transfer' &&
      (!op.matchedArticleId || !op.matchedAccountId)
    ) {
      throw new AppError(`Operation ${op.id} is missing required fields`, 400);
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
  }

  /**
   * Подготавливает данные операции для создания
   */
  private async prepareOperationData(
    op: Prisma.ImportedOperationGetPayload<Record<string, never>>,
    accountsMap: Map<string, { id: string; number: string }>
  ): Promise<Record<string, unknown>> {
    const operationData: Record<string, unknown> = {
      type: op.direction as 'income' | 'expense' | 'transfer',
      operationDate: op.date,
      amount: op.amount,
      currency: op.currency || 'RUB',
      description: op.description,
      repeat: op.repeat || 'none',
    };

    if (op.direction === 'transfer') {
      const sourceAccount = op.payerAccount
        ? accountsMap.get(op.payerAccount)
        : null;
      const targetAccount = op.receiverAccount
        ? accountsMap.get(op.receiverAccount)
        : null;

      if (!sourceAccount || !targetAccount) {
        const missingAccounts: string[] = [];
        if (!sourceAccount && op.payerAccount) {
          missingAccounts.push(`счет плательщика: ${op.payerAccount}`);
        }
        if (!targetAccount && op.receiverAccount) {
          missingAccounts.push(`счет получателя: ${op.receiverAccount}`);
        }
        throw new AppError(
          `Операция ${op.number || op.id}: не найдены счета для перевода. ${missingAccounts.length > 0 ? `Не найдены: ${missingAccounts.join(', ')}` : 'Счета не указаны'}`,
          400
        );
      }

      operationData.sourceAccountId = sourceAccount.id;
      operationData.targetAccountId = targetAccount.id;
    } else {
      if (!op.matchedAccountId) {
        throw new AppError(
          `Operation ${op.id} is missing required accountId for income/expense operation`,
          400
        );
      }
      if (!op.matchedArticleId) {
        throw new AppError(
          `Operation ${op.id} is missing required articleId for income/expense operation`,
          400
        );
      }
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

    return operationData;
  }

  /**
   * Применяет правила маппинга к сессии
   * Оптимизированная версия без N+1 проблемы
   */
  async applyRules(
    sessionId: string,
    companyId: string
  ): Promise<{
    applied: number;
    updated: number;
  }> {
    // Проверяем, что сессия принадлежит компании
    await sessionService.getSession(sessionId, companyId);

    // Получаем все черновики сессии
    const operations = await prisma.importedOperation.findMany({
      where: {
        importSessionId: sessionId,
        companyId,
        confirmed: false, // Применяем только к неподтвержденным
        processed: false, // Только к необработанным
      },
    });

    if (operations.length === 0) {
      return { applied: 0, updated: 0 };
    }

    // Получаем ИНН компании один раз
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { inn: true },
    });

    let updated = 0;

    // Применяем автосопоставление батчами для оптимизации
    const batchProcessor = new BatchProcessor<
      Prisma.ImportedOperationGetPayload<Record<string, never>>,
      boolean
    >(50);

    await batchProcessor.processBatches(
      operations,
      async (batch) => {
        const results: boolean[] = [];

        for (const op of batch) {
          try {
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

            const matchingResult = await autoMatch(
              companyId,
              doc,
              company?.inn || null
            );

            // Проверяем полное сопоставление (статья, счет, валюта)
            // Контрагент не обязателен, как в обычной форме
            const isFullyMatched = !!(
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
              updateData.mapping_rule = {
                connect: { id: matchingResult.matchedRuleId },
              };
            } else {
              updateData.mapping_rule = { disconnect: true };
            }

            if (matchingResult.matchedArticleId) {
              updateData.article = {
                connect: { id: matchingResult.matchedArticleId },
              };
            }
            if (matchingResult.matchedCounterpartyId) {
              updateData.counterparty = {
                connect: { id: matchingResult.matchedCounterpartyId },
              };
            }
            if (matchingResult.matchedAccountId) {
              updateData.account = {
                connect: { id: matchingResult.matchedAccountId },
              };
            }

            await prisma.importedOperation.update({
              where: { id: op.id, companyId },
              data: updateData,
            });

            updated++;
            results.push(true);
          } catch (error: unknown) {
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
            results.push(false);
          }
        }

        return results;
      },
      {
        context: `Apply rules for session ${sessionId}`,
        continueOnError: true,
      }
    );

    return { applied: operations.length, updated };
  }
}

export default new OperationImportService();
