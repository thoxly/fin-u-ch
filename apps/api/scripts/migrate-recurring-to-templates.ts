/**
 * Скрипт для миграции старых повторяющихся операций в шаблоны
 * Устанавливает isTemplate = true для операций с repeat != 'none' и recurrenceParentId = null
 */

import prisma from '../src/config/db';
import logger from '../src/config/logger';

async function migrateRecurringToTemplates() {
  logger.info('Starting migration of recurring operations to templates...');

  try {
    // Находим все операции, которые должны быть шаблонами
    const operationsToMigrate = await prisma.operation.findMany({
      where: {
        repeat: { not: 'none' },
        recurrenceParentId: null,
        isTemplate: false,
      },
      select: {
        id: true,
        companyId: true,
        repeat: true,
        operationDate: true,
        amount: true,
      },
    });

    logger.info(`Found ${operationsToMigrate.length} operations to migrate`);

    if (operationsToMigrate.length === 0) {
      logger.info('No operations to migrate');
      return;
    }

    // Обновляем операции
    const result = await prisma.operation.updateMany({
      where: {
        id: { in: operationsToMigrate.map((op) => op.id) },
      },
      data: {
        isTemplate: true,
      },
    });

    logger.info(`Successfully updated ${result.count} operations`);
    logger.info('Migration completed');

    // Выводим информацию об обновленных операциях
    for (const op of operationsToMigrate) {
      logger.debug('Migrated operation', {
        operationId: op.id,
        companyId: op.companyId,
        repeat: op.repeat,
        amount: op.amount,
      });
    }
  } catch (error) {
    logger.error('Migration error', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем миграцию
migrateRecurringToTemplates()
  .then(() => {
    logger.info('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Migration failed', { error });
    process.exit(1);
  });
