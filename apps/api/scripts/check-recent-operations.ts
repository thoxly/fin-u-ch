import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentOperations() {
  try {
    console.log('🔍 Проверка последних созданных операций...\n');

    // Найти все операции, созданные сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const operations = await prisma.operation.findMany({
      where: {
        createdAt: {
          gte: today,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Операций создано сегодня: ${operations.length}\n`);

    operations.forEach((op, idx) => {
      console.log(
        `\n${idx + 1}. ${op.isTemplate ? '📄 ШАБЛОН' : '📝 ОПЕРАЦИЯ'} ${op.id.substring(0, 8)}...`
      );
      console.log(`   Описание: ${op.description}`);
      console.log(`   Сумма: ${op.amount}`);
      console.log(`   Дата операции: ${op.operationDate.toISOString()}`);
      console.log(`   Тип: ${op.type}`);
      console.log(`   isTemplate: ${op.isTemplate}`);
      console.log(`   isConfirmed: ${op.isConfirmed}`);
      console.log(`   repeat: ${op.repeat}`);
      console.log(`   recurrenceParentId: ${op.recurrenceParentId || 'null'}`);
      console.log(`   Создан: ${op.createdAt.toLocaleString('ru-RU')}`);
    });

    // Проверим логи воркера
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 АНАЛИЗ:');

    const templates = operations.filter((op) => op.isTemplate);
    const children = operations.filter((op) => op.recurrenceParentId);
    const regular = operations.filter(
      (op) => !op.isTemplate && !op.recurrenceParentId
    );

    console.log(`   Шаблонов: ${templates.length}`);
    console.log(`   Дочерних операций: ${children.length}`);
    console.log(`   Обычных операций: ${regular.length}`);

    if (templates.length > 0 && children.length === 0) {
      console.log('\n⚠️  ПРОБЛЕМА: Есть шаблоны, но нет дочерних операций!');
      console.log(
        '   При создании шаблона должна автоматически создаваться первая дочерняя операция.'
      );
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentOperations();
