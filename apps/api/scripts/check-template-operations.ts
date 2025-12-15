import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTemplateOperations() {
  try {
    console.log('🔍 Проверка всех операций и шаблонов...\n');

    // Найти все шаблоны
    const templates = await prisma.operation.findMany({
      where: {
        isTemplate: true,
        repeat: { not: 'none' },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📋 Найдено шаблонов: ${templates.length}\n`);

    for (const template of templates) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📄 ШАБЛОН: ${template.description || '(без описания)'}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Сумма: ${template.amount}`);
      console.log(`   Периодичность: ${template.repeat}`);
      console.log(`   Дата: ${template.operationDate.toISOString()}`);
      console.log(`   Создан: ${template.createdAt.toLocaleString('ru-RU')}`);

      // Найти все дочерние операции
      const children = await prisma.operation.findMany({
        where: {
          recurrenceParentId: template.id,
        },
        orderBy: {
          operationDate: 'asc',
        },
      });

      console.log(`\n   ✅ Дочерних операций: ${children.length}`);

      if (children.length > 0) {
        children.forEach((child, idx) => {
          console.log(
            `      ${idx + 1}. ${child.operationDate.toISOString().split('T')[0]} - isConfirmed: ${child.isConfirmed} (создана: ${child.createdAt.toLocaleString('ru-RU')})`
          );
        });
      }

      console.log('');
    }

    // Проверим, сколько операций показывается в API (isTemplate=false)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 ОПЕРАЦИИ (НЕ ШАБЛОНЫ):\n`);

    const operations = await prisma.operation.findMany({
      where: {
        isTemplate: false,
        amount: { in: [15352, 11] }, // Проверим эти две суммы
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log(
      `Найдено операций с суммой 15352 или 11: ${operations.length}\n`
    );

    operations.forEach((op, idx) => {
      console.log(`${idx + 1}. ${op.id.substring(0, 8)}...`);
      console.log(`   Описание: ${op.description}`);
      console.log(`   Сумма: ${op.amount}`);
      console.log(`   Дата: ${op.operationDate.toISOString().split('T')[0]}`);
      console.log(`   isTemplate: ${op.isTemplate}`);
      console.log(`   isConfirmed: ${op.isConfirmed}`);
      console.log(`   recurrenceParentId: ${op.recurrenceParentId || 'null'}`);
      console.log(`   Создана: ${op.createdAt.toLocaleString('ru-RU')}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplateOperations();
