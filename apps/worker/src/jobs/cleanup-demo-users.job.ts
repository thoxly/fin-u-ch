import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { jobCounter, jobDuration, jobLastSuccess } from '../config/metrics';

/**
 * Удаляет пользователя по ID (вместе с компанией)
 * Использует каскадное удаление для оптимизации производительности
 * @param userId ID пользователя для удаления
 * @param maxRetries Максимальное количество попыток при ошибках
 */
async function deleteUser(
  userId: string,
  maxRetries: number = 3
): Promise<void> {
  // Проверяем существование пользователя перед удалением
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true, email: true },
  });

  if (!user) {
    logger.warn(`Cleanup: User ${userId} not found (already deleted?)`);
    return;
  }

  const companyId = user.companyId;

  // Retry логика с экспоненциальной задержкой
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await prisma.$transaction(
        async (tx) => {
          // 1. Удаляем AuditLog вручную (ссылается на User БЕЗ onDelete: Cascade)
          // Это нужно сделать перед удалением User, чтобы избежать foreign key constraint ошибки
          await tx.auditLog.deleteMany({ where: { companyId } });

          // 2. Удаляем Company - это автоматически удалит каскадно:
          //    - User (удалит EmailToken, UserRole каскадно)
          //    - Role (удалит RolePermission каскадно)
          //    - Account, Article, Operation, PlanItem, Budget, Deal, Department, Counterparty
          //    - ImportSession (удалит ImportedOperation каскадно)
          //    - MappingRule, Subscription, etc.
          await tx.company.delete({ where: { id: companyId } });
        },
        {
          timeout: 300000, // 5 минут - достаточно для больших объемов данных
          maxWait: 30000, // 30 секунд ожидания начала транзакции
        }
      );

      logger.info('Demo user cleanup: Deleted user and company', {
        userId: user.id,
        email: user.email,
        companyId,
        attempt: attempt + 1,
      });
      return; // Успешно удалено
    } catch (error: any) {
      lastError = error;

      // Если пользователь уже удален (P2025 = Record not found)
      if (error.code === 'P2025') {
        logger.warn(`User ${userId} or company ${companyId} already deleted`, {
          userId,
          companyId,
        });
        return;
      }

      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === maxRetries - 1) {
        logger.error(
          `Failed to delete user ${userId} after ${maxRetries} attempts`,
          {
            error,
            userId,
            companyId,
            attempts: maxRetries,
          }
        );
        throw error;
      }

      // Экспоненциальная задержка: 1s, 2s, 4s
      const delay = 1000 * Math.pow(2, attempt);
      logger.warn(
        `Error deleting user ${userId} (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms`,
        {
          error: error.message,
          errorCode: error.code,
          userId,
          companyId,
        }
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Не должно сюда дойти, но на всякий случай
  if (lastError) {
    throw lastError;
  }
}

// Флаг для отслеживания выполнения job (защита от параллельных запусков)
let isCleanupRunning = false;

/**
 * Очищает старых демо-пользователей
 * @param maxAgeHours Время жизни аккаунтов в часах
 * @param batchSize Размер батча для удаления (по умолчанию 10)
 * @param maxUsersPerRun Максимальное количество пользователей для удаления за один запуск (0 = без лимита)
 */
export async function cleanupExpiredDemoUsers(
  maxAgeHours: number = 24,
  batchSize: number = 10,
  maxUsersPerRun: number = 0
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

    const expiredUsers = await prisma.user.findMany({
      where: {
        email: { startsWith: 'demo_' },
        createdAt: { lt: threshold },
      },
      select: { id: true, email: true },
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
      batchSize,
      maxUsersPerRun,
    });

    let deletedCount = 0;
    let errorCount = 0;

    // Батчинг: удаляем пользователей батчами для оптимизации
    for (let i = 0; i < expiredUsers.length; i += batchSize) {
      const batch = expiredUsers.slice(i, i + batchSize);
      logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}`, {
        batchSize: batch.length,
        totalBatches: Math.ceil(expiredUsers.length / batchSize),
      });

      // Удаляем пользователей в батче параллельно (но с ограничением)
      const batchResults = await Promise.allSettled(
        batch.map((user) => deleteUser(user.id))
      );

      // Подсчитываем результаты
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          deletedCount++;
        } else {
          errorCount++;
          logger.error(`Failed to delete expired demo user ${batch[j].id}`, {
            error: result.reason,
            userId: batch[j].id,
            email: batch[j].email,
          });
        }
      }

      // Небольшая задержка между батчами, чтобы не перегружать БД
      if (i + batchSize < expiredUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDuration.observe({ job_name: jobName }, duration);
    jobCounter.inc({ job_name: jobName, status: 'success' });
    jobLastSuccess.set({ job_name: jobName }, Date.now() / 1000);

    logger.info('Cleanup completed', {
      deletedCount,
      errorCount,
      totalFound: expiredUsers.length,
      duration: `${duration.toFixed(2)}s`,
    });

    return deletedCount;
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
