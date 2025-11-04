import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { validateRequired } from '../../utils/validation';

export interface CreateOperationDTO {
  type: string;
  operationDate: Date;
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
  recurrenceEndDate?: Date;
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
    validateRequired({
      type: data.type,
      operationDate: data.operationDate,
      amount: data.amount,
    });

    const validTypes = ['income', 'expense', 'transfer'];
    if (!validTypes.includes(data.type)) {
      throw new AppError('Type must be income, expense, or transfer', 400);
    }

    // Validate based on type
    if (data.type === 'income' || data.type === 'expense') {
      if (!data.accountId || !data.articleId) {
        throw new AppError(
          'accountId and articleId are required for income/expense operations',
          400
        );
      }
    }

    if (data.type === 'transfer') {
      if (!data.sourceAccountId || !data.targetAccountId) {
        throw new AppError(
          'sourceAccountId and targetAccountId are required for transfer operations',
          400
        );
      }
      if (data.sourceAccountId === data.targetAccountId) {
        throw new AppError('Source and target accounts must be different', 400);
      }
    }

    return prisma.operation.create({
      data: {
        ...data,
        companyId,
      },
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
