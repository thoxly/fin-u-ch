import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { jobCounter, jobDuration, jobLastSuccess } from '../config/metrics';

/**
 * Помечает компании как удаленные (soft delete)
 * Использует raw SQL для массового обновления - быстрее чем Prisma ORM
 * @param companyIds Массив ID компаний для пометки как удаленных
 */
async function markCompaniesForDeletion(
  companyIds: string[]
): Promise<number> {
  if (companyIds.length === 0) return 0;

  try {
    // Используем raw SQL для массового обновления - в 10-100 раз быстрее
    // Используем Prisma.$queryRaw для правильной работы с массивами UUID
    const placeholders = companyIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await prisma.$executeRawUnsafe(
      `UPDATE companies 
       SET "deletedAt" = NOW() 
       WHERE id IN (${placeholders}) 
       AND "deletedAt" IS NULL`,
      ...companyIds
    );

    logger.debug(`Marked ${result} companies for deletion`, {
      companyIdsCount: companyIds.length,
      markedCount: result,
    });

    return result as number;
  } catch (error: any) {
    logger.error('Failed to mark companies for deletion', {
      error: error.message,
      companyIdsCount: companyIds.length,
    });
    throw error;
  }
}

// Флаг для отслеживания выполнения job (защита от параллельных запусков)
let isCleanupRunning = false;

/**
 * Очищает старых демо-пользователей (soft delete)
 * Помечает компании как удаленные вместо физического удаления
 * @param maxAgeHours Время жизни аккаунтов в часах
 * @param maxUsersPerRun Максимальное количество пользователей для обработки за один запуск (0 = без лимита)
 */
export async function cleanupExpiredDemoUsers(
  maxAgeHours: number = 24,
  maxUsersPerRun: number = 100
): Promise<number> {
  const jobName = 'cleanup_demo_users';
  const startTime = Date.now();

  // Защита от параллельных запусков
  if (isCleanupRunning) {
    logger.warn(
      'Cleanup job is already running, skipping this execution to avoid conflicts'
    );
    return 0;
  }

  isCleanupRunning = true;

  try {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - maxAgeHours);

    // Находим истекших демо-пользователей и их компании
    // Исключаем уже помеченные как удаленные компании
    const expiredUsers = await prisma.user.findMany({
      where: {
        email: { startsWith: 'demo_' },
        createdAt: { lt: threshold },
        company: {
          deletedAt: null, // Только компании, которые еще не помечены как удаленные
        },
      },
      select: {
        id: true,
        email: true,
        companyId: true,
      },
      take: maxUsersPerRun > 0 ? maxUsersPerRun : undefined,
    });

    if (expiredUsers.length === 0) {
      // Record metrics even if no users to delete
      const duration = (Date.now() - startTime) / 1000;
      jobDuration.observe({ job_name: jobName }, duration);
      jobCounter.inc({ job_name: jobName, status: 'success' });
      jobLastSuccess.set({ job_name: jobName }, Date.now() / 1000);
      return 0;
    }

    logger.info(`Found ${expiredUsers.length} expired demo users`, {
      total: expiredUsers.length,
      maxUsersPerRun,
    });

    // Собираем уникальные companyId (один пользователь = одна компания для демо)
    const companyIds = Array.from(
      new Set(expiredUsers.map((user) => user.companyId))
    );

    // Помечаем компании как удаленные (soft delete) - БЫСТРО, без блокировок
    const markedCount = await markCompaniesForDeletion(companyIds);

    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDuration.observe({ job_name: jobName }, duration);
    jobCounter.inc({ job_name: jobName, status: 'success' });
    jobLastSuccess.set({ job_name: jobName }, Date.now() / 1000);

    logger.info('Cleanup completed (soft delete)', {
      markedCount,
      totalFound: expiredUsers.length,
      companyIdsCount: companyIds.length,
      duration: `${duration.toFixed(2)}s`,
    });

    return markedCount;
  } catch (error) {
    logger.error('Error in cleanupExpiredDemoUsers:', error);

    // Record error metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDuration.observe({ job_name: jobName }, duration);
    jobCounter.inc({ job_name: jobName, status: 'error' });

    throw error;
  } finally {
    // Сбрасываем флаг выполнения
    isCleanupRunning = false;
  }
}

/**
 * Физически удаляет компании, помеченные как удаленные (hard delete)
 * Выполняется в фоновом режиме отдельным job
 * @param minAgeHours Минимальный возраст пометки для удаления (по умолчанию 1 час)
 * @param batchSize Размер батча для удаления (по умолчанию 5)
 */
export async function hardDeleteMarkedCompanies(
  minAgeHours: number = 1,
  batchSize: number = 5
): Promise<number> {
  const jobName = 'hard_delete_marked_companies';
  const startTime = Date.now();

  try {
    // Находим компании, помеченные для удаления более minAgeHours назад
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - minAgeHours);

    const companiesToDelete = await prisma.company.findMany({
      where: {
        deletedAt: { not: null, lt: threshold },
      },
      select: { id: true },
      take: batchSize,
    });

    if (companiesToDelete.length === 0) {
      const duration = (Date.now() - startTime) / 1000;
      jobDuration.observe({ job_name: jobName }, duration);
      jobCounter.inc({ job_name: jobName, status: 'success' });
      return 0;
    }

    const companyIds = companiesToDelete.map((c) => c.id);

    logger.info(`Hard deleting ${companyIds.length} marked companies`, {
      companyIdsCount: companyIds.length,
      batchSize,
    });

    // Последовательное удаление для избежания блокировок
    let deletedCount = 0;
    let errorCount = 0;

    for (const companyId of companyIds) {
      try {
        await prisma.$transaction(
          async (tx) => {
            // Используем raw SQL для быстрого удаления audit_logs
            await tx.$executeRawUnsafe(
              `DELETE FROM audit_logs WHERE "companyId" = $1`,
              companyId
            );

            // Удаляем компанию (каскадно удалит остальное через onDelete: Cascade)
            await tx.$executeRawUnsafe(
              `DELETE FROM companies WHERE id = $1`,
              companyId
            );
          },
          {
            timeout: 300000, // 5 минут
            maxWait: 30000, // 30 секунд
          }
        );

        deletedCount++;
        logger.debug(`Hard deleted company ${companyId}`);

        // Задержка между удалениями для снижения нагрузки
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error: any) {
        errorCount++;
        logger.error(`Failed to hard delete company ${companyId}`, {
          error: error.message,
          errorCode: error.code,
          companyId,
        });
      }
    }

    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDuration.observe({ job_name: jobName }, duration);
    jobCounter.inc({ job_name: jobName, status: 'success' });

    logger.info('Hard delete completed', {
      deletedCount,
      errorCount,
      totalFound: companyIds.length,
      duration: `${duration.toFixed(2)}s`,
    });

    return deletedCount;
  } catch (error) {
    logger.error('Error in hardDeleteMarkedCompanies:', error);

    // Record error metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDuration.observe({ job_name: jobName }, duration);
    jobCounter.inc({ job_name: jobName, status: 'error' });

    throw error;
  }
}
