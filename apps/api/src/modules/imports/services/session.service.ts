import { Prisma } from '@prisma/client';
import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';
import { ImportFilters } from '@fin-u-ch/shared';

/**
 * Import session status constants
 */
export const IMPORT_SESSION_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PROCESSED: 'processed',
} as const;

/**
 * Service for managing import sessions
 */
export class SessionService {
  /**
   * Создает сессию импорта
   */
  async createSession(
    companyId: string,
    userId: string,
    fileName: string,
    importedCount: number
  ): Promise<Prisma.ImportSessionGetPayload<Record<string, never>>> {
    return prisma.importSession.create({
      data: {
        companyId,
        userId,
        fileName,
        status: IMPORT_SESSION_STATUS.DRAFT,
        importedCount,
      },
    });
  }

  /**
   * Получает сессию импорта
   */
  async getSession(
    sessionId: string,
    companyId: string
  ): Promise<Prisma.ImportSessionGetPayload<Record<string, never>>> {
    const session = await prisma.importSession.findFirst({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new AppError('Import session not found', 404);
    }

    return session;
  }

  /**
   * Обновляет счетчики сессии
   */
  async updateSessionCounters(
    sessionId: string,
    companyId: string
  ): Promise<void> {
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
          status:
            processedCount === session.importedCount
              ? IMPORT_SESSION_STATUS.PROCESSED
              : confirmedCount > 0
                ? IMPORT_SESSION_STATUS.CONFIRMED
                : IMPORT_SESSION_STATUS.DRAFT,
        },
      });
    }
  }

  /**
   * Удаляет сессию импорта
   */
  async deleteSession(
    sessionId: string,
    companyId: string
  ): Promise<{ deleted: number }> {
    const session = await this.getSession(sessionId, companyId);

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
    await this.getSession(sessionId, companyId);

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
        orderBy: [
          { matchedBy: 'asc' }, // NULL значения (несопоставленные) будут первыми
          { date: 'desc' },
        ],
      }),
      prisma.importedOperation.count({ where }),
    ]);

    // Счетчики используют baseWhere (без фильтров matched/duplicate)
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
    await this.getSession(sessionId, companyId);

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

    // Проверяем, что операция полностью сопоставлена
    const isFullyMatched = !!(
      updatedOperation.matchedCounterpartyId &&
      updatedOperation.matchedArticleId &&
      updatedOperation.matchedAccountId &&
      updatedOperation.currency
    );

    let finalOperation = updatedOperation;

    // Обновляем matchedBy
    if (isFullyMatched && !updatedOperation.matchedBy) {
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
    } else if (!isFullyMatched && updatedOperation.matchedBy) {
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

    // Обновляем счетчики сессии
    await this.updateSessionCounters(finalOperation.importSessionId, companyId);

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

    if (!operations || operations.length !== operationIds.length) {
      throw new AppError('Some operations not found', 404);
    }

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
}

export default new SessionService();
