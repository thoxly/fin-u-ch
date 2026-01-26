import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { jobCounter, jobDuration, jobLastSuccess } from '../config/metrics';

/**
 * Помечает компании как удаленные (soft delete)
 * Использует raw SQL для массового обновления - быстрее чем Prisma ORM
 * @param companyIds Массив ID компаний для пометки как удаленных
 */
async function markCompaniesForDeletion(companyIds: string[]): Promise<number> {
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
    const companyIds: string[] = Array.from(
      new Set(expiredUsers.map((user: { companyId: string }) => user.companyId))
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

// Флаг для отслеживания выполнения hard delete job (защита от параллельных запусков)
let isHardDeleteRunning = false;

/**
 * Оптимизированное удаление компании через Raw SQL
 * Удаляет данные в правильном порядке для минимизации блокировок
 * @param companyId ID компании для удаления
 */
async function deleteCompanyOptimized(companyId: string): Promise<void> {
  // Используем raw SQL для быстрого удаления в правильном порядке
  // Порядок важен: сначала удаляем дочерние таблицы с большим объемом данных

  // 1. Удаляем таблицы с большим объемом данных (используем индексы для скорости)
  await prisma.$executeRawUnsafe(
    `DELETE FROM imported_operations WHERE "companyId" = $1`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM operations WHERE "companyId" = $1`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM audit_logs WHERE "companyId" = $1`,
    companyId
  );

  // 2. Удаляем связанные таблицы среднего размера
  await prisma.$executeRawUnsafe(
    `DELETE FROM plan_items WHERE "companyId" = $1`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM import_sessions WHERE "companyId" = $1`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM mapping_rules WHERE "companyId" = $1`,
    companyId
  );

  // 3. Удаляем справочники
  await prisma.$executeRawUnsafe(
    `DELETE FROM accounts WHERE "companyId" = $1`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM articles WHERE "companyId" = $1`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM counterparties WHERE "companyId" = $1`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM budgets WHERE "companyId" = $1`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM deals WHERE "companyId" = $1`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM departments WHERE "companyId" = $1`,
    companyId
  );

  // 4. Удаляем роли и разрешения (сначала дочерние)
  await prisma.$executeRawUnsafe(
    `DELETE FROM role_permissions WHERE "roleId" IN (
      SELECT id FROM roles WHERE "companyId" = $1
    )`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM user_roles WHERE "roleId" IN (
      SELECT id FROM roles WHERE "companyId" = $1
    )`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM roles WHERE "companyId" = $1`,
    companyId
  );

  // 5. Удаляем подписки
  await prisma.$executeRawUnsafe(
    `DELETE FROM subscriptions WHERE "companyId" = $1`,
    companyId
  );

  // 6. Удаляем пользователей и связанные данные
  await prisma.$executeRawUnsafe(
    `DELETE FROM email_tokens WHERE "userId" IN (
      SELECT id FROM users WHERE "companyId" = $1
    )`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM user_roles WHERE "userId" IN (
      SELECT id FROM users WHERE "companyId" = $1
    )`,
    companyId
  );

  await prisma.$executeRawUnsafe(
    `DELETE FROM users WHERE "companyId" = $1`,
    companyId
  );

  // 7. Финально удаляем компанию
  await prisma.$executeRawUnsafe(
    `DELETE FROM companies WHERE id = $1`,
    companyId
  );
}

/**
 * Физически удаляет компании, помеченные как удаленные (hard delete)
 * ОПТИМИЗИРОВАННАЯ ВЕРСИЯ с использованием Raw SQL и правильного порядка удаления
 * @param minAgeHours Минимальный возраст пометки для удаления (по умолчанию 1 час)
 * @param batchSize Размер батча для удаления (по умолчанию 10, увеличено для оптимизации)
 * @param maxConcurrent Максимальное количество параллельных удалений (по умолчанию 2)
 */
export async function hardDeleteMarkedCompanies(
  minAgeHours: number = 1,
  batchSize: number = 10, // Увеличено с 5 до 10
  maxConcurrent: number = 2 // Параллельное удаление для ускорения
): Promise<number> {
  const jobName = 'hard_delete_marked_companies';
  const startTime = Date.now();

  // БЛОКИРОВКА: Если предыдущий батч еще выполняется, пропускаем запуск
  if (isHardDeleteRunning) {
    logger.warn(
      'Hard delete job is already running, skipping this execution to avoid overloading database'
    );
    return 0;
  }

  isHardDeleteRunning = true;

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

    const companyIds = companiesToDelete.map((c: { id: string }) => c.id);

    logger.info(
      `Hard deleting ${companyIds.length} marked companies (optimized)`,
      {
        companyIdsCount: companyIds.length,
        batchSize,
        maxConcurrent,
      }
    );

    let deletedCount = 0;
    let errorCount = 0;

    // Удаляем компании батчами с ограничением параллелизма
    for (let i = 0; i < companyIds.length; i += maxConcurrent) {
      const batch = companyIds.slice(i, i + maxConcurrent);

      const results = await Promise.allSettled(
        batch.map(async (companyId: string) => {
          try {
            const deleteStartTime = Date.now();

            // Используем оптимизированное удаление
            await deleteCompanyOptimized(companyId);

            const deleteDuration = (Date.now() - deleteStartTime) / 1000;
            logger.debug(
              `Hard deleted company ${companyId} in ${deleteDuration.toFixed(2)}s`
            );

            return { companyId, success: true };
          } catch (error: any) {
            logger.error(`Failed to hard delete company ${companyId}`, {
              error: error.message,
              errorCode: error.code,
              companyId,
            });
            throw error;
          }
        })
      );

      // Подсчитываем результаты
      for (const result of results) {
        if (result.status === 'fulfilled') {
          deletedCount++;
        } else {
          errorCount++;
        }
      }

      // Небольшая задержка между батчами для снижения нагрузки на БД
      if (i + maxConcurrent < companyIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Уменьшено с 200ms до 100ms
      }
    }

    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDuration.observe({ job_name: jobName }, duration);
    jobCounter.inc({ job_name: jobName, status: 'success' });

    logger.info('Hard delete completed (optimized)', {
      deletedCount,
      errorCount,
      totalFound: companyIds.length,
      duration: `${duration.toFixed(2)}s`,
      avgTimePerCompany: `${(duration / companyIds.length).toFixed(2)}s`,
    });

    return deletedCount;
  } catch (error) {
    logger.error('Error in hardDeleteMarkedCompanies:', error);

    // Record error metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDuration.observe({ job_name: jobName }, duration);
    jobCounter.inc({ job_name: jobName, status: 'error' });

    throw error;
  } finally {
    // Сбрасываем флаг выполнения - важно для разблокировки следующего запуска
    isHardDeleteRunning = false;
  }
}
