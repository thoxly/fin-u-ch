/**
 * Скрипт для миграции старых повторяющихся операций в шаблоны
 * Устанавливает isTemplate = true для операций с repeat != 'none' и recurrenceParentId = null
 */

import prisma from '../src/config/db';

async function migrateRecurringToTemplates() {
  console.log('Начинаем миграцию повторяющихся операций в шаблоны...');

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

    console.log(`Найдено ${operationsToMigrate.length} операций для миграции`);

    if (operationsToMigrate.length === 0) {
      console.log('Нет операций для миграции');
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

    console.log(`Успешно обновлено ${result.count} операций`);
    console.log('Миграция завершена');

    // Выводим информацию об обновленных операциях
    for (const op of operationsToMigrate) {
      console.log(
        `  - ID: ${op.id}, Company: ${op.companyId}, Repeat: ${op.repeat}, Amount: ${op.amount}`
      );
    }
  } catch (error) {
    console.error('Ошибка при миграции:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем миграцию
migrateRecurringToTemplates()
  .then(() => {
    console.log('✅ Миграция успешно завершена');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  });
