import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { validateRequired } from '../../utils/validation';

export interface CreateOperationDTO {
  type: string;
  operationDate: Date | string;
  amount: number;
  currency?: string;
  accountId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  articleId?: string;
  counterpartyId?: string;
  dealId?: string;
  departmentId?: string;
  description?: string;
  repeat?: string;
  recurrenceEndDate?: Date | string;
}

export interface OperationFilters {
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
  articleId?: string;
  dealId?: string;
  departmentId?: string;
  counterpartyId?: string;
  isConfirmed?: boolean;
}

export class OperationsService {
  async getAll(companyId: string, filters: OperationFilters) {
    const where: Record<string, unknown> = { companyId };

    if (filters.type) where.type = filters.type;
    if (filters.articleId) where.articleId = filters.articleId;
    if (filters.dealId) where.dealId = filters.dealId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.counterpartyId) where.counterpartyId = filters.counterpartyId;
    if (filters.isConfirmed !== undefined)
      where.isConfirmed = filters.isConfirmed;

    if (filters.dateFrom || filters.dateTo) {
      where.operationDate = {};
      if (filters.dateFrom)
        (where.operationDate as Record<string, unknown>).gte = filters.dateFrom;
      if (filters.dateTo)
        (where.operationDate as Record<string, unknown>).lte = filters.dateTo;
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
      },
      orderBy: { operationDate: 'desc' },
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
      },
    });

    if (!operation) {
      throw new AppError('Operation not found', 404);
    }

    return operation;
  }

  async create(companyId: string, data: CreateOperationDTO) {
    // Конвертируем operationDate из строки в Date если нужно
    const operationDate =
      data.operationDate instanceof Date
        ? data.operationDate
        : new Date(data.operationDate as string);

    // Проверяем что дата валидна
    if (isNaN(operationDate.getTime())) {
      throw new AppError('Invalid operationDate format', 400);
    }

    // Конвертируем recurrenceEndDate из строки в Date если нужно
    const recurrenceEndDate = data.recurrenceEndDate
      ? data.recurrenceEndDate instanceof Date
        ? data.recurrenceEndDate
        : new Date(data.recurrenceEndDate as string)
      : undefined;

    // Проверяем что recurrenceEndDate валидна если указана
    if (recurrenceEndDate && isNaN(recurrenceEndDate.getTime())) {
      throw new AppError('Invalid recurrenceEndDate format', 400);
    }

    validateRequired({
      type: data.type,
      operationDate,
      amount: data.amount,
    });

    const validTypes = ['income', 'expense', 'transfer'];
    if (!validTypes.includes(data.type)) {
      throw new AppError('Type must be income, expense, or transfer', 400);
    }

    // Вспомогательная функция для очистки строк
    const cleanString = (value: string | undefined | null): string | null => {
      if (!value || typeof value !== 'string') return null;
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };

    // Валидируем и очищаем обязательные поля
    let validatedAccountId: string | null = null;
    let validatedArticleId: string | null = null;
    let validatedSourceAccountId: string | null = null;
    let validatedTargetAccountId: string | null = null;

    // Validate based on type
    if (data.type === 'income' || data.type === 'expense') {
      // Проверяем что accountId и articleId не пустые строки или undefined
      validatedAccountId = cleanString(data.accountId);
      validatedArticleId = cleanString(data.articleId);
      if (!validatedAccountId || !validatedArticleId) {
        throw new AppError(
          'accountId and articleId are required for income/expense operations',
          400
        );
      }
    }

    if (data.type === 'transfer') {
      // Проверяем что sourceAccountId и targetAccountId не пустые строки или undefined
      validatedSourceAccountId = cleanString(data.sourceAccountId);
      validatedTargetAccountId = cleanString(data.targetAccountId);
      if (!validatedSourceAccountId || !validatedTargetAccountId) {
        throw new AppError(
          'sourceAccountId and targetAccountId are required for transfer operations',
          400
        );
      }
      if (validatedSourceAccountId === validatedTargetAccountId) {
        throw new AppError('Source and target accounts must be different', 400);
      }
    }

    // Очищаем пустые строки в опциональных полях и используем очищенные значения
    const cleanData: any = {
      type: data.type,
      operationDate,
      amount: data.amount,
      currency: data.currency || 'RUB',
      companyId,
      repeat: data.repeat || 'none',
      recurrenceEndDate,
    };

    // Добавляем поля в зависимости от типа операции (используем уже валидированные значения)
    if (data.type === 'income' || data.type === 'expense') {
      cleanData.accountId = validatedAccountId;
      cleanData.articleId = validatedArticleId;
    } else if (data.type === 'transfer') {
      cleanData.sourceAccountId = validatedSourceAccountId;
      cleanData.targetAccountId = validatedTargetAccountId;
    }

    // Опциональные поля
    cleanData.counterpartyId = cleanString(data.counterpartyId);
    cleanData.dealId = cleanString(data.dealId);
    cleanData.departmentId = cleanString(data.departmentId);
    cleanData.description = cleanString(data.description);

    return prisma.operation.create({
      data: cleanData,
    });
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<CreateOperationDTO>
  ) {
    await this.getById(id, companyId);

    return prisma.operation.update({
      where: { id },
      data,
    });
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
}

export default new OperationsService();
