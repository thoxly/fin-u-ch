import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

/**
 * Удаляет пользователя по ID (вместе с компанией)
 * Копия логики из DemoUserService для обеспечения независимости воркера
 */
async function deleteUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true, email: true },
  });

  if (!user) {
    logger.warn(`Cleanup: User ${userId} not found`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 0. Удаляем всех пользователей компании
    const companyUsers = await tx.user.findMany({
      where: { companyId: user.companyId },
      select: { id: true },
    });

    for (const companyUser of companyUsers) {
      // Логи аудита
      await tx.auditLog.deleteMany({ where: { userId: companyUser.id } });
      // Правила маппинга
      await tx.mappingRule.deleteMany({ where: { userId: companyUser.id } });
      // Сессии импорта
      const userSessions = await tx.importSession.findMany({
        where: { userId: companyUser.id },
        select: { id: true },
      });

      if (userSessions.length > 0) {
        const sessionIds = userSessions.map((s) => s.id);
        await tx.importedOperation.deleteMany({
          where: { importSessionId: { in: sessionIds } },
        });
        await tx.importSession.deleteMany({
          where: { userId: companyUser.id },
        });
      }

      // Пользователь
      await tx.user.delete({ where: { id: companyUser.id } });
    }

    // 1. Связанные данные компании
    const cid = user.companyId;
    await tx.operation.deleteMany({ where: { companyId: cid } });
    await tx.account.deleteMany({ where: { companyId: cid } });
    await tx.article.deleteMany({ where: { companyId: cid } });
    await tx.counterparty.deleteMany({ where: { companyId: cid } });
    await tx.deal.deleteMany({ where: { companyId: cid } });
    await tx.department.deleteMany({ where: { companyId: cid } });

    // Роли
    await tx.role.deleteMany({ where: { companyId: cid } });

    // Подписка
    await tx.subscription.deleteMany({ where: { companyId: cid } });

    // 2. Компания
    await tx.company.delete({ where: { id: cid } });
  });

  logger.info('Demo user cleanup: Deleted user and company', {
    userId: user.id,
    email: user.email,
  });
}

/**
 * Очищает старых демо-пользователей
 * @param maxAgeHours Время жизни аккаунтов в часах
 */
export async function cleanupExpiredDemoUsers(
  maxAgeHours: number = 24
): Promise<number> {
  const threshold = new Date();
  threshold.setHours(threshold.getHours() - maxAgeHours);

  const expiredUsers = await prisma.user.findMany({
    where: {
      email: { startsWith: 'demo_' },
      createdAt: { lt: threshold },
    },
    select: { id: true, email: true },
  });

  if (expiredUsers.length === 0) {
    return 0;
  }

  logger.info(`Found ${expiredUsers.length} expired demo users`);

  let deletedCount = 0;
  for (const user of expiredUsers) {
    try {
      await deleteUser(user.id);
      deletedCount++;
    } catch (error) {
      logger.error(`Failed to delete expired demo user ${user.id}`, { error });
    }
  }

  return deletedCount;
}
