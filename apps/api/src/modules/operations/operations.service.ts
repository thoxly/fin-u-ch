import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import {
  CreateOperationSchema,
  UpdateOperationSchema,
  type CreateOperationInput,
  type UpdateOperationInput,
} from '@fin-u-ch/shared';

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
    // Validate using Zod schema
    const validationResult = CreateOperationSchema.safeParse(data);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(
        (err: { path: (string | number)[]; message: string }) => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        }
      );
      throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
    }

    const validatedData = validationResult.data;

    // Если операция повторяющаяся, создаем шаблон и первую дочернюю операцию
    if (validatedData.repeat && validatedData.repeat !== 'none') {
      return prisma.$transaction(async (tx) => {
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
        const firstChild = await tx.operation.create({
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
            isConfirmed: false, // Требует подтверждения
            isTemplate: false, // Реальная операция
          },
        });

        return template;
      });
    }

    // Обычная операция (не повторяющаяся)
    return prisma.operation.create({
      data: {
        ...validatedData,
        companyId,
        isTemplate: false,
      },
    });
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<CreateOperationInput>
  ) {
    await this.getById(id, companyId);

    // Validate using Zod schema (partial validation for updates)
    if (Object.keys(data).length > 0) {
      const validationResult = UpdateOperationSchema.safeParse(data);

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(
          (err: { path: (string | number)[]; message: string }) => {
            const path = err.path.join('.');
            return `${path}: ${err.message}`;
          }
        );
        throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
      }

      const validatedData = validationResult.data;
      return prisma.operation.update({
        where: { id },
        data: validatedData,
      });
    }

    return prisma.operation.findUnique({ where: { id } });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    return prisma.operation.delete({
      where: { id },
    });
  }

  async confirmOperation(id: string, companyId: string) {
    await this.getById(id, companyId);

    return prisma.operation.update({
      where: { id, companyId },
      data: { isConfirmed: true },
    });
  }

  async bulkDelete(companyId: string, ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('ids must be a non-empty array', 400);
    }

    // Validate that all IDs are strings and not empty
    const validIds = ids.filter(
      (id) => typeof id === 'string' && id.length > 0
    );
    if (validIds.length !== ids.length) {
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
      throw new AppError('Some operations do not belong to your company', 403);
    }

    // Use transaction to ensure atomicity - all deletes succeed or none
    return prisma.$transaction(async (tx) => {
      return tx.operation.deleteMany({
        where: {
          companyId,
          id: { in: validIds },
        },
      });
    });
  }
}

export default new OperationsService();
