import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { formatZodErrors } from '../../utils/validation';
import {
  CreateOperationSchema,
  UpdateOperationSchema,
  type CreateOperationInput,
} from '@fin-u-ch/shared';
import articlesService from '../catalogs/articles/articles.service';
import logger from '../../config/logger';
import { invalidateReportCache } from '../reports/utils/cache';

// Keep for backward compatibility with tests
export type CreateOperationDTO = CreateOperationInput;

export interface OperationFilters {
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
  articleId?: string;
  dealId?: string;
  departmentId?: string;
  counterpartyId?: string;
  accountId?: string;
  isConfirmed?: boolean;
  isTemplate?: boolean;
  limit?: number;
  offset?: number;
}

// Вспомогательная функция для проверки принадлежности счетов компании
async function validateAccountsOwnership(
  companyId: string,
  accountIds: (string | null | undefined)[]
): Promise<void> {
  // Фильтруем только валидные ID
  const validAccountIds = accountIds.filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );

  if (validAccountIds.length === 0) {
    return; // Нет счетов для проверки
  }

  // Проверяем, что все счета существуют и принадлежат компании
  const accounts = await prisma.account.findMany({
    where: {
      id: { in: validAccountIds },
      companyId,
    },
    select: { id: true },
  });

  // Если количество найденных счетов не совпадает с запрошенными, значит есть недействительные
  if (accounts.length !== validAccountIds.length) {
    const foundIds = new Set(accounts.map((acc) => acc.id));
    const invalidIds = validAccountIds.filter((id) => !foundIds.has(id));
    throw new AppError(
      `Invalid or unauthorized accounts: ${invalidIds.join(', ')}`,
      403
    );
  }
}

export class OperationsService {
  async getAll(companyId: string, filters: OperationFilters) {
    const where: Record<string, unknown> = { companyId };

    // По умолчанию исключаем шаблоны из списка операций
    // Если isTemplate явно указан, используем его значение
    if (filters.isTemplate !== undefined) {
      where.isTemplate = filters.isTemplate;
    } else {
      where.isTemplate = false;
    }

    if (filters.type) where.type = filters.type;
    if (filters.articleId) where.articleId = filters.articleId;
    if (filters.dealId) where.dealId = filters.dealId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.counterpartyId) where.counterpartyId = filters.counterpartyId;
    if (filters.isConfirmed !== undefined)
      where.isConfirmed = filters.isConfirmed;

    // Фильтр по счету: для income/expense проверяем accountId,
    // для transfer проверяем sourceAccountId или targetAccountId
    if (filters.accountId) {
      if (filters.type === 'transfer') {
        // Для transfer операций используем OR для проверки обоих счетов
        // OR должен быть на верхнем уровне, но мы объединяем его с другими условиями
        const accountCondition = {
          OR: [
            { sourceAccountId: filters.accountId },
            { targetAccountId: filters.accountId },
          ],
        };
        // Объединяем с существующими условиями через AND
        where.AND = where.AND
          ? [...(where.AND as unknown[]), accountCondition]
          : [accountCondition];
      } else if (
        !filters.type ||
        filters.type === 'income' ||
        filters.type === 'expense'
      ) {
        // Для income/expense операций проверяем accountId
        where.accountId = filters.accountId;
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      where.operationDate = {};
      if (filters.dateFrom)
        (where.operationDate as Record<string, unknown>).gte = filters.dateFrom;
      if (filters.dateTo)
        (where.operationDate as Record<string, unknown>).lte = filters.dateTo;
    }

    // Validate pagination parameters and set defaults
    const take = filters.limit ?? 50; // Default limit
    const skip = filters.offset ?? 0; // Default offset

    if (take < 1 || take > 200) {
      throw new AppError('limit must be between 1 and 200', 400);
    }

    if (skip < 0) {
      throw new AppError('offset must be non-negative', 400);
    }

    return prisma.operation.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        sourceAccount: { select: { id: true, name: true } },
        targetAccount: { select: { id: true, name: true } },
        article: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        recurrenceParent: {
          select: { id: true, repeat: true, operationDate: true },
        },
      },
      orderBy: { operationDate: 'desc' },
      take,
      skip,
    });
  }

  async getById(id: string, companyId: string) {
    const operation = await prisma.operation.findFirst({
      where: { id, companyId },
      include: {
        account: { select: { id: true, name: true } },
        sourceAccount: { select: { id: true, name: true } },
        targetAccount: { select: { id: true, name: true } },
        article: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        recurrenceParent: {
          select: { id: true, repeat: true, operationDate: true },
        },
      },
    });

    if (!operation) {
      throw new AppError('Operation not found', 404);
    }

    return operation;
  }

  async create(companyId: string, data: CreateOperationDTO) {
    logger.debug('Creating operation', {
      companyId,
      operationType: data.type,
      amount: data.amount,
      hasRepeat: !!data.repeat && data.repeat !== 'none',
    });

    // Validate using Zod schema
    const validationResult = CreateOperationSchema.safeParse(data);

    if (!validationResult.success) {
      const errorMessage = formatZodErrors(validationResult.error);
      logger.warn('Operation validation failed', {
        companyId,
        error: errorMessage,
      });
      throw new AppError(`Ошибка валидации: ${errorMessage}`, 400);
    }

    const validatedData = validationResult.data;

    // Validate that all accounts belong to the company
    await validateAccountsOwnership(companyId, [
      validatedData.accountId,
      validatedData.sourceAccountId,
      validatedData.targetAccountId,
    ]);

    // Валидация: операции можно создавать только с листовыми статьями (не имеющими дочерних)
    if (validatedData.articleId) {
      const isLeaf = await articlesService.isLeafArticle(
        validatedData.articleId,
        companyId
      );
      if (!isLeaf) {
        logger.warn('Attempt to create operation with non-leaf article', {
          companyId,
          articleId: validatedData.articleId,
        });
        throw new AppError(
          'Нельзя создать операцию с родительской статьей. Выберите дочернюю статью или статью без дочерних элементов.',
          400
        );
      }
    }

    // Если операция повторяющаяся, создаем шаблон и первую дочернюю операцию
    if (validatedData.repeat && validatedData.repeat !== 'none') {
      logger.debug('Creating recurring operation template', {
        companyId,
        repeat: validatedData.repeat,
      });

      const template = await prisma.$transaction(async (tx) => {
        // Создаем шаблон (isTemplate: true)
        const template = await tx.operation.create({
          data: {
            ...validatedData,
            companyId,
            isTemplate: true,
            // Шаблон не должен иметь дату операции, используем дату начала повторов
            operationDate: validatedData.operationDate,
          },
        });

        // Создаем первую дочернюю операцию на дату создания шаблона
        await tx.operation.create({
          data: {
            companyId: template.companyId,
            type: template.type,
            operationDate: validatedData.operationDate,
            amount: template.amount,
            currency: template.currency,
            accountId: template.accountId,
            sourceAccountId: template.sourceAccountId,
            targetAccountId: template.targetAccountId,
            articleId: template.articleId,
            counterpartyId: template.counterpartyId,
            dealId: template.dealId,
            departmentId: template.departmentId,
            description: template.description,
            repeat: 'none', // Дочерняя операция не повторяется
            recurrenceParentId: template.id,
            recurrenceEndDate: null,
            isConfirmed: true, // Первая операция сразу подтверждается (создана пользователем)
            isTemplate: false, // Реальная операция
          },
        });

        logger.info('Recurring operation template created successfully', {
          companyId,
          templateId: template.id,
          repeat: validatedData.repeat,
        });

        return template;
      });

      // Инвалидируем кэш отчетов после успешного создания повторяющейся операции
      await invalidateReportCache(companyId);

      return template;
    }

    // Обычная операция (не повторяющаяся)
    const operation = await prisma.operation.create({
      data: {
        ...validatedData,
        companyId,
        isTemplate: false,
      },
    });

    logger.info('Operation created successfully', {
      companyId,
      operationId: operation.id,
      operationType: operation.type,
      amount: operation.amount,
    });

    // Инвалидируем кэш отчетов после создания операции
    await invalidateReportCache(companyId);

    return operation;
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<CreateOperationInput>
  ) {
    logger.debug('Updating operation', {
      companyId,
      operationId: id,
      fieldsToUpdate: Object.keys(data),
    });

    await this.getById(id, companyId);

    // Validate using Zod schema (partial validation for updates)
    if (Object.keys(data).length > 0) {
      const validationResult = UpdateOperationSchema.safeParse(data);

      if (!validationResult.success) {
        const errorMessage = formatZodErrors(validationResult.error);
        logger.warn('Operation update validation failed', {
          companyId,
          operationId: id,
          error: errorMessage,
        });
        throw new AppError(`Ошибка валидации: ${errorMessage}`, 400);
      }

      const validatedData = validationResult.data;

      // Validate that all accounts (if provided) belong to the company
      await validateAccountsOwnership(companyId, [
        validatedData.accountId,
        validatedData.sourceAccountId,
        validatedData.targetAccountId,
      ]);

      // Валидация: операции можно обновлять только с листовыми статьями (не имеющими дочерних)
      if (validatedData.articleId !== undefined) {
        const isLeaf = await articlesService.isLeafArticle(
          validatedData.articleId,
          companyId
        );
        if (!isLeaf) {
          logger.warn('Attempt to update operation with non-leaf article', {
            companyId,
            operationId: id,
            articleId: validatedData.articleId,
          });
          throw new AppError(
            'Нельзя использовать родительскую статью в операции. Выберите дочернюю статью или статью без дочерних элементов.',
            400
          );
        }
      }

      const updated = await prisma.operation.update({
        where: { id },
        data: validatedData,
      });

      logger.info('Operation updated successfully', {
        companyId,
        operationId: id,
        fieldsUpdated: Object.keys(validatedData),
      });

      // Инвалидируем кэш отчетов после обновления операции
      await invalidateReportCache(companyId);

      return updated;
    }

    return prisma.operation.findUnique({ where: { id } });
  }

  async delete(id: string, companyId: string) {
    logger.debug('Deleting operation', {
      companyId,
      operationId: id,
    });

    await this.getById(id, companyId);

    const deleted = await prisma.operation.delete({
      where: { id },
    });

    logger.info('Operation deleted successfully', {
      companyId,
      operationId: id,
    });

    // Инвалидируем кэш отчетов после удаления операции
    await invalidateReportCache(companyId);

    return deleted;
  }

  async confirmOperation(id: string, companyId: string) {
    logger.debug('Confirming operation', {
      companyId,
      operationId: id,
    });

    await this.getById(id, companyId);

    const confirmed = await prisma.operation.update({
      where: { id, companyId },
      data: { isConfirmed: true },
    });

    logger.info('Operation confirmed successfully', {
      companyId,
      operationId: id,
    });

    // Инвалидируем кэш отчетов после подтверждения операции
    await invalidateReportCache(companyId);

    return confirmed;
  }

  async bulkDelete(companyId: string, ids: string[]) {
    logger.debug('Bulk deleting operations', {
      companyId,
      operationsCount: ids.length,
    });

    if (!Array.isArray(ids) || ids.length === 0) {
      logger.warn('Bulk delete with invalid ids array', {
        companyId,
        ids,
      });
      throw new AppError('ids must be a non-empty array', 400);
    }

    // Validate that all IDs are strings and not empty
    const validIds = ids.filter(
      (id) => typeof id === 'string' && id.length > 0
    );
    if (validIds.length !== ids.length) {
      logger.warn('Bulk delete with invalid ids', {
        companyId,
        totalIds: ids.length,
        validIds: validIds.length,
      });
      throw new AppError('All ids must be non-empty strings', 400);
    }

    // Critical security: Validate that all operations belong to the user's company
    // This prevents data leakage between tenants
    const operations = await prisma.operation.findMany({
      where: {
        id: { in: validIds },
      },
      select: { id: true, companyId: true },
    });

    // Check if all operations belong to the company
    const invalidOperations = operations.filter(
      (op) => op.companyId !== companyId
    );
    if (invalidOperations.length > 0) {
      logger.warn(
        'Bulk delete attempt with operations from different company',
        {
          companyId,
          invalidOperationsCount: invalidOperations.length,
          invalidOperationIds: invalidOperations.map((op) => op.id),
        }
      );
      throw new AppError('Some operations do not belong to your company', 403);
    }

    // Use transaction to ensure atomicity - all deletes succeed or none
    const result = await prisma.$transaction(async (tx) => {
      return tx.operation.deleteMany({
        where: {
          companyId,
          id: { in: validIds },
        },
      });
    });

    logger.info('Operations bulk deleted successfully', {
      companyId,
      deletedCount: result.count,
      requestedCount: validIds.length,
    });

    // Инвалидируем кэш отчетов после массового удаления операций
    await invalidateReportCache(companyId);

    return result;
  }
}

export default new OperationsService();
