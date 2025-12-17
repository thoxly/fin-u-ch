import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFirstRecurringOperations() {
  try {
    console.log(
      '🔧 Исправление первых дочерних операций повторяющихся шаблонов...\n'
    );

    // Найти все шаблоны
    const templates = await prisma.operation.findMany({
      where: {
        isTemplate: true,
        repeat: { not: 'none' },
      },
    });

    console.log(`📋 Найдено шаблонов: ${templates.length}\n`);

    let fixed = 0;

    for (const template of templates) {
      // Найти первую дочернюю операцию (на дату шаблона)
      const firstChild = await prisma.operation.findFirst({
        where: {
          recurrenceParentId: template.id,
          operationDate: template.operationDate,
        },
      });

      if (firstChild) {
        if (!firstChild.isConfirmed) {
          console.log(
            `✅ Подтверждаю первую операцию для шаблона "${template.description}"`
          );
          console.log(`   ID операции: ${firstChild.id}`);
          console.log(`   Дата: ${firstChild.operationDate.toISOString()}`);

          await prisma.operation.update({
            where: { id: firstChild.id },
            data: { isConfirmed: true },
          });

          fixed++;
        } else {
          console.log(
            `ℹ️  Операция для шаблона "${template.description}" уже подтверждена`
          );
        }
      } else {
        console.log(
          `⚠️  Не найдена первая операция для шаблона "${template.description}"`
        );
        console.log(`   Дата шаблона: ${template.operationDate.toISOString()}`);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Исправлено операций: ${fixed}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixFirstRecurringOperations();
