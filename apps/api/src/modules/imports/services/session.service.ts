import { Prisma } from '@prisma/client';
import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';
import { ImportFilters } from '@fin-u-ch/shared';
import logger from '../../../config/logger';

/**
 * Import session status constants
 */
export const IMPORT_SESSION_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PROCESSED: 'processed',
} as const;

/**
 * Transforms Prisma ImportedOperation with relations to match frontend format
 */
function transformImportedOperation(op: any): any {
  const { article, counterparty, account, deal, department, ...rest } = op;
  return {
    ...rest,
    matchedArticle: article ?? null,
    matchedCounterparty: counterparty ?? null,
    matchedAccount: account ?? null,
    matchedDeal: deal ?? null,
    matchedDepartment: department ?? null,
  };
}

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
    importedCount: number,
    companyAccountNumber?: string
  ): Promise<Prisma.ImportSessionGetPayload<Record<string, never>>> {
    return prisma.importSession.create({
      data: {
        companyId,
        userId,
        fileName,
        status: IMPORT_SESSION_STATUS.DRAFT,
        importedCount,
        ...(companyAccountNumber !== undefined && { companyAccountNumber }),
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
    await this.getSession(sessionId, companyId);

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
    operations: ReturnType<typeof transformImportedOperation>[];
    total: number;
    confirmed: number;
    unmatched: number;
    duplicates: number;
    companyAccountNumber?: string;
  }> {
    // Проверяем, что сессия принадлежит компании
    const session = await this.getSession(sessionId, companyId);

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
      (where as any).isDuplicate = filters.duplicate;
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

    // Счетчики используют baseWhere (без фильтров matched/duplicate)
    const confirmedCount = await prisma.importedOperation.count({
      where: { ...baseWhere, confirmed: true },
    });

    const unmatchedCount = await prisma.importedOperation.count({
      where: { ...baseWhere, matchedBy: null },
    });

    const duplicatesCount = await prisma.importedOperation.count({
      where: { ...baseWhere, isDuplicate: true } as any,
    });

    return {
      operations: operations.map(transformImportedOperation),
      total,
      confirmed: confirmedCount,
      unmatched: unmatchedCount,
      duplicates: duplicatesCount,
      companyAccountNumber: (session as any).companyAccountNumber || undefined,
    };
  }

  /**
   * Получает все операции сессии без пагинации (для поиска похожих)
   * Возвращает только необработанные операции, так как только они могут быть обновлены
   */
  async getAllImportedOperations(
    sessionId: string,
    companyId: string
  ): Promise<{
    operations: ReturnType<typeof transformImportedOperation>[];
  }> {
    // Проверяем, что сессия принадлежит компании
    await this.getSession(sessionId, companyId);

    // Возвращаем только необработанные операции, так как только их можно обновить
    const operations = await prisma.importedOperation.findMany({
      where: {
        importSessionId: sessionId,
        companyId,
        processed: false, // Только необработанные операции
      },
      include: {
        article: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      } as any,
      orderBy: { date: 'desc' },
    });

    return { operations: operations.map(transformImportedOperation) };
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
  ): Promise<ReturnType<typeof transformImportedOperation>> {
    const operation = await prisma.importedOperation.findFirst({
      where: { id, companyId },
    });

    if (!operation) {
      throw new AppError('Imported operation not found', 404);
    }

    const updateData: Prisma.ImportedOperationUpdateInput = {};

    if (data.matchedArticleId !== undefined) {
      (updateData as any).article = data.matchedArticleId
        ? { connect: { id: data.matchedArticleId } }
        : { disconnect: true };
    }

    if (data.matchedCounterpartyId !== undefined) {
      (updateData as any).counterparty = data.matchedCounterpartyId
        ? { connect: { id: data.matchedCounterpartyId } }
        : { disconnect: true };
    }

    if (data.matchedAccountId !== undefined) {
      (updateData as any).account = data.matchedAccountId
        ? { connect: { id: data.matchedAccountId } }
        : { disconnect: true };
    }

    if (data.matchedDealId !== undefined) {
      (updateData as any).deal = data.matchedDealId
        ? { connect: { id: data.matchedDealId } }
        : { disconnect: true };
    }

    if (data.matchedDepartmentId !== undefined) {
      (updateData as any).department = data.matchedDepartmentId
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

    let finalOperation = updatedOperation;

    // Обновляем matchedBy
    if (isFullyMatched && !updatedOperation.matchedBy) {
      finalOperation = (await prisma.importedOperation.update({
        where: { id, companyId },
        data: { matchedBy: 'manual' },
        include: {
          article: { select: { id: true, name: true } },
          counterparty: { select: { id: true, name: true } },
          account: { select: { id: true, name: true } },
          deal: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        } as any,
      })) as unknown as typeof updatedOperation;
    } else if (!isFullyMatched && updatedOperation.matchedBy) {
      finalOperation = (await prisma.importedOperation.update({
        where: { id, companyId },
        data: {
          matchedBy: null,
          matchedRuleId: null,
        },
        include: {
          article: { select: { id: true, name: true } },
          counterparty: { select: { id: true, name: true } },
          account: { select: { id: true, name: true } },
          deal: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        } as any,
      })) as unknown as typeof updatedOperation;
    }

    // Обновляем счетчики сессии
    await this.updateSessionCounters(finalOperation.importSessionId, companyId);

    return transformImportedOperation(finalOperation);
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
      select: {
        id: true,
        processed: true,
        lockedFields: true,
      } as any,
    });

    if (!operations || operations.length !== operationIds.length) {
      // Находим отсутствующие ID для более информативной ошибки
      const foundIds = new Set<string>(operations?.map((op) => op.id) || []);
      const missingIds = operationIds.filter((id: string) => !foundIds.has(id));

      logger.error('Bulk update failed: some operations not found', {
        sessionId,
        companyId,
        requestedCount: operationIds.length,
        foundCount: operations?.length || 0,
        missingIds: missingIds.slice(0, 5), // Показываем первые 5 для диагностики
      });

      throw new AppError(
        `Some operations not found or already processed (${missingIds.length} missing)`,
        404
      );
    }

    // Проверяем, что ни одна из операций не обработана
    const processedOps = operations.filter((op) => op.processed);
    if (processedOps.length > 0) {
      logger.warn('Attempting to update processed operations', {
        sessionId,
        processedCount: processedOps.length,
      });
      throw new AppError(
        `Cannot update processed operations (${processedOps.length} already processed)`,
        400
      );
    }

    // Обновляем каждую операцию отдельно, чтобы учитывать lockedFields
    let updated = 0;
    for (const operation of operations) {
      // Парсим заблокированные поля
      let lockedFields: string[] = [];
      try {
        lockedFields = (operation as any).lockedFields
          ? JSON.parse((operation as any).lockedFields)
          : [];
      } catch {
        lockedFields = [];
      }

      // Формируем данные для обновления, исключая заблокированные поля
      const updateData: Prisma.ImportedOperationUpdateInput = {};

      if (
        data.matchedArticleId !== undefined &&
        !lockedFields.includes('matchedArticleId')
      ) {
        (updateData as any).article = data.matchedArticleId
          ? { connect: { id: data.matchedArticleId } }
          : { disconnect: true };
        updateData.matchedBy = data.matchedArticleId ? 'manual' : null;
      }

      if (
        data.matchedCounterpartyId !== undefined &&
        !lockedFields.includes('matchedCounterpartyId')
      ) {
        (updateData as any).counterparty = data.matchedCounterpartyId
          ? { connect: { id: data.matchedCounterpartyId } }
          : { disconnect: true };
        if (!updateData.matchedBy) {
          updateData.matchedBy = data.matchedCounterpartyId ? 'manual' : null;
        }
      }

      if (
        data.matchedAccountId !== undefined &&
        !lockedFields.includes('matchedAccountId')
      ) {
        (updateData as any).account = data.matchedAccountId
          ? { connect: { id: data.matchedAccountId } }
          : { disconnect: true };
      }

      if (
        data.matchedDealId !== undefined &&
        !lockedFields.includes('matchedDealId')
      ) {
        (updateData as any).deal = data.matchedDealId
          ? { connect: { id: data.matchedDealId } }
          : { disconnect: true };
      }

      if (
        data.matchedDepartmentId !== undefined &&
        !lockedFields.includes('matchedDepartmentId')
      ) {
        (updateData as any).department = data.matchedDepartmentId
          ? { connect: { id: data.matchedDepartmentId } }
          : { disconnect: true };
      }

      if (data.currency !== undefined && !lockedFields.includes('currency')) {
        updateData.currency = data.currency;
      }

      if (data.direction !== undefined && !lockedFields.includes('direction')) {
        updateData.direction = data.direction;
      }

      if (data.confirmed !== undefined && !lockedFields.includes('confirmed')) {
        updateData.confirmed = data.confirmed;
      }

      // Обновляем только если есть что обновлять
      if (Object.keys(updateData).length > 0) {
        await prisma.importedOperation.update({
          where: { id: operation.id },
          data: updateData,
        });
        updated++;
      }
    }

    // Обновляем счетчики сессии после массового обновления
    if (updated > 0) {
      await this.updateSessionCounters(sessionId, companyId);
    }

    return { updated };
  }
}

export default new SessionService();
