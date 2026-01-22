import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { formatZodErrors } from '../../utils/validation';
import {
  CreateOperationSchema,
  UpdateOperationSchema,
  type CreateOperationInput,
  type UpdateOperationInput,
} from '@fin-u-ch/shared';
import currencyService from '../currency/currency.service';
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
  repeat?: string; // Фильтр по полю repeat (например, 'none' для исключения повторяющихся)
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

// Вспомогательная функция для получения базовой валюты компании
async function getCompanyBaseCurrency(companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currencyBase: true },
  });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  return company.currencyBase || 'RUB';
}

// Вспомогательная функция для конвертации операции в базовую валюту
async function convertOperationToBase(
  amount: number,
  currency: string,
  baseCurrency: string,
  operationDate: Date
): Promise<{
  amount: number;
  currency: string;
  originalAmount: number | null;
  originalCurrency: string | null;
}> {
  // Если валюта уже базовая, не конвертируем
  if (currency === baseCurrency) {
    return {
      amount,
      currency,
      originalAmount: null,
      originalCurrency: null,
    };
  }

  try {
    // Пытаемся получить курс на дату операции
    let convertedAmount: number;
    try {
      convertedAmount = await currencyService.convertToBase(
        amount,
        currency,
        baseCurrency,
        operationDate
      );
    } catch (error) {
      // Если не удалось получить курс на дату операции, пробуем вчерашний день
      logger.warn(
        'Failed to get currency rate for operation date, trying yesterday',
        {
          operationDate,
          currency,
          baseCurrency,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );

      const yesterday = new Date(operationDate);
      yesterday.setDate(yesterday.getDate() - 1);

      try {
        convertedAmount = await currencyService.convertToBase(
          amount,
          currency,
          baseCurrency,
          yesterday
        );
      } catch (yesterdayError) {
        // Если и вчерашний курс недоступен, используем текущий
        logger.warn(
          'Failed to get currency rate for yesterday, using current rate',
          {
            operationDate,
            currency,
            baseCurrency,
            error:
              yesterdayError instanceof Error
                ? yesterdayError.message
                : 'Unknown error',
          }
        );
        convertedAmount = await currencyService.convertToBase(
          amount,
          currency,
          baseCurrency
        );
      }
    }

    return {
      amount: convertedAmount,
      currency: baseCurrency,
      originalAmount: amount,
      originalCurrency: currency,
    };
  } catch (error) {
    logger.error('Failed to convert operation to base currency', {
      amount,
      currency,
      baseCurrency,
      operationDate,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // В случае ошибки сохраняем оригинальные значения
    return {
      amount,
      currency,
      originalAmount: null,
      originalCurrency: null,
    };
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

    // Фильтр по полю repeat
    // Если указан 'none', фильтруем только операции без повторения
    // Если указано 'not_none', фильтруем только операции с повторением (repeat !== 'none')
    // Если указано другое значение, фильтруем по конкретному значению
    if (filters.repeat !== undefined) {
      if (filters.repeat === 'not_none') {
        where.repeat = { not: 'none' };
      } else if (filters.repeat === 'none') {
        where.repeat = 'none';
      } else {
        where.repeat = filters.repeat;
      }
    }

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

    // Получаем операции и общее количество параллельно для оптимизации
    const [operations, total] = await Promise.all([
      prisma.operation.findMany({
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
      }),
      prisma.operation.count({ where }),
    ]);

    // Возвращаем данные с метаданными пагинации
    return {
      data: operations,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + take < total,
        totalPages: Math.ceil(total / take),
        currentPage: Math.floor(skip / take) + 1,
      },
    };
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
      const errorMessage = formatZodErrors(validationResult.error);
      throw new AppError(`Ошибка валидации: ${errorMessage}`, 400);
    }

    const validatedData = validationResult.data;

    // Validate that all accounts belong to the company
    await validateAccountsOwnership(companyId, [
      validatedData.accountId,
      validatedData.sourceAccountId,
      validatedData.targetAccountId,
    ]);

    // Получаем базовую валюту компании
    const baseCurrency = await getCompanyBaseCurrency(companyId);

    // Конвертируем операцию в базовую валюту
    const converted = await convertOperationToBase(
      validatedData.amount,
      validatedData.currency,
      baseCurrency,
      validatedData.operationDate instanceof Date
        ? validatedData.operationDate
        : new Date(validatedData.operationDate)
    );

    // Если операция повторяющаяся, создаем шаблон и первую дочернюю операцию
    if (validatedData.repeat && validatedData.repeat !== 'none') {
      const template = await prisma.$transaction(async (tx) => {
        // Создаем шаблон (isTemplate: true)
        const template = await tx.operation.create({
          data: {
            ...validatedData,
            amount: converted.amount,
            currency: converted.currency,
            originalAmount: converted.originalAmount,
            originalCurrency: converted.originalCurrency,
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
            originalAmount: template.originalAmount,
            originalCurrency: template.originalCurrency,
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

        return template;
      });

      // Инвалидируем кэш отчетов после создания повторяющейся операции
      await invalidateReportCache(companyId);

      return template;
    }

    // Обычная операция (не повторяющаяся)
    const operation = await prisma.operation.create({
      data: {
        ...validatedData,
        amount: converted.amount,
        currency: converted.currency,
        originalAmount: converted.originalAmount,
        originalCurrency: converted.originalCurrency,
        companyId,
        isTemplate: false,
      },
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
    const existingOperation = await this.getById(id, companyId);

    // Validate using Zod schema (partial validation for updates)
    if (Object.keys(data).length > 0) {
      const validationResult = UpdateOperationSchema.safeParse(data);

      if (!validationResult.success) {
        const errorMessage = formatZodErrors(validationResult.error);
        throw new AppError(`Ошибка валидации: ${errorMessage}`, 400);
      }

      const validatedData = validationResult.data;

      // Validate that all accounts (if provided) belong to the company
      await validateAccountsOwnership(companyId, [
        validatedData.accountId,
        validatedData.sourceAccountId,
        validatedData.targetAccountId,
      ]);

      // Если изменяется amount или currency, нужно пересчитать в базовую валюту
      const updateData: Partial<CreateOperationInput> & {
        originalAmount?: number | null;
        originalCurrency?: string | null;
      } = { ...validatedData };

      if (
        validatedData.amount !== undefined ||
        validatedData.currency !== undefined
      ) {
        const baseCurrency = await getCompanyBaseCurrency(companyId);
        const amount = validatedData.amount ?? existingOperation.amount;
        const currency = validatedData.currency ?? existingOperation.currency;
        const operationDate =
          validatedData.operationDate instanceof Date
            ? validatedData.operationDate
            : validatedData.operationDate
              ? new Date(validatedData.operationDate)
              : existingOperation.operationDate;

        const converted = await convertOperationToBase(
          amount,
          currency,
          baseCurrency,
          operationDate instanceof Date
            ? operationDate
            : new Date(operationDate)
        );

        updateData.amount = converted.amount;
        updateData.currency = converted.currency;
        updateData.originalAmount = converted.originalAmount;
        updateData.originalCurrency = converted.originalCurrency;
      }

      const updated = await prisma.operation.update({
        where: { id },
        data: updateData,
      });

      // Инвалидируем кэш отчетов после обновления операции
      await invalidateReportCache(companyId);

      return updated;
    }

    return prisma.operation.findUnique({ where: { id } });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    const deleted = await prisma.operation.delete({
      where: { id },
    });

    // Инвалидируем кэш отчетов после удаления операции
    await invalidateReportCache(companyId);

    return deleted;
  }

  async confirmOperation(id: string, companyId: string) {
    await this.getById(id, companyId);

    const confirmed = await prisma.operation.update({
      where: { id, companyId },
      data: { isConfirmed: true },
    });

    // Инвалидируем кэш отчетов после подтверждения операции
    await invalidateReportCache(companyId);

    return confirmed;
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
    const result = await prisma.$transaction(async (tx) => {
      return tx.operation.deleteMany({
        where: {
          companyId,
          id: { in: validIds },
        },
      });
    });

    // Инвалидируем кэш отчетов после массового удаления операций
    if (result.count > 0) {
      await invalidateReportCache(companyId);
    }

    return result;
  }
}

export default new OperationsService();
