import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllOperations() {
  try {
    console.log('🔍 Проверка всех операций связанных с повторяющимися...\n');

    // Найти шаблон
    const template = await prisma.operation.findFirst({
      where: {
        id: '5e7178bc-2c92-4bba-8ddd-85be36d09edd',
      },
    });

    if (!template) {
      console.log('❌ Шаблон не найден');
      return;
    }

    console.log('📄 ШАБЛОН:');
    console.log(`   ID: ${template.id}`);
    console.log(`   Описание: ${template.description}`);
    console.log(`   Сумма: ${template.amount}`);
    console.log(`   Дата операции: ${template.operationDate.toISOString()}`);
    console.log(`   Периодичность: ${template.repeat}`);
    console.log(`   isTemplate: ${template.isTemplate}`);
    console.log(`   Создан: ${template.createdAt.toISOString()}`);
    console.log(`   Обновлен: ${template.updatedAt.toISOString()}`);

    // Найти ВСЕ операции с такой же суммой и описанием
    const similarOps = await prisma.operation.findMany({
      where: {
        amount: 15352,
        description: 'Уплата налога на прибыль',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(
      `\n📊 ВСЕГО ОПЕРАЦИЙ С ТАКИМИ ПАРАМЕТРАМИ: ${similarOps.length}\n`
    );

    similarOps.forEach((op, idx) => {
      console.log(`\n${idx + 1}. Операция ${op.id.substring(0, 8)}...`);
      console.log(`   Описание: ${op.description}`);
      console.log(`   Сумма: ${op.amount}`);
      console.log(`   Дата операции: ${op.operationDate.toISOString()}`);
      console.log(`   Тип: ${op.type}`);
      console.log(`   isTemplate: ${op.isTemplate}`);
      console.log(`   isConfirmed: ${op.isConfirmed}`);
      console.log(`   repeat: ${op.repeat}`);
      console.log(`   recurrenceParentId: ${op.recurrenceParentId || 'null'}`);
      console.log(`   Создан: ${op.createdAt.toLocaleString('ru-RU')}`);
      console.log(`   Обновлен: ${op.updatedAt.toLocaleString('ru-RU')}`);
    });

    // Найти операции с recurrenceParentId
    const childOps = await prisma.operation.findMany({
      where: {
        recurrenceParentId: template.id,
      },
    });

    console.log(
      `\n\n📌 ДОЧЕРНИХ ОПЕРАЦИЙ (с recurrenceParentId): ${childOps.length}`
    );

    if (childOps.length > 0) {
      childOps.forEach((op, idx) => {
        console.log(
          `\n${idx + 1}. ${op.id.substring(0, 8)}... - Дата: ${op.operationDate.toISOString()}`
        );
      });
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllOperations();
