/**
 * Скрипт для миграции старых повторяющихся операций в шаблоны
 * Устанавливает isTemplate = true для операций с repeat != 'none' и recurrenceParentId = null
 */

import prisma from '../src/config/db';
import logger from '../src/config/logger';

async function migrateRecurringToTemplates() {
  logger.info('Начинаем миграцию повторяющихся операций в шаблоны...');

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

    logger.info(`Найдено ${operationsToMigrate.length} операций для миграции`);

    if (operationsToMigrate.length === 0) {
      logger.info('Нет операций для миграции');
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

    logger.info(`Успешно обновлено ${result.count} операций`);
    logger.info('Миграция завершена');

    // Выводим информацию об обновленных операциях
    for (const op of operationsToMigrate) {
      logger.info(
        `  - ID: ${op.id}, Company: ${op.companyId}, Repeat: ${op.repeat}, Amount: ${op.amount}`
      );
    }
  } catch (error) {
    logger.error('Ошибка при миграции:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем миграцию
migrateRecurringToTemplates()
  .then(() => {
    logger.info('✅ Миграция успешно завершена');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Ошибка миграции:', error);
    process.exit(1);
  });
