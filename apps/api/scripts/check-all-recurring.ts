import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllRecurring() {
  try {
    console.log('🔍 Проверка ВСЕХ операций с repeat != none...\n');

    const recurring = await prisma.operation.findMany({
      where: {
        repeat: { not: 'none' },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📋 Найдено операций с repeat != none: ${recurring.length}\n`);

    for (const op of recurring) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(
        `${op.isTemplate ? '📄 ШАБЛОН' : '📝 ОПЕРАЦИЯ'}: ${op.description || '(без описания)'}`
      );
      console.log(`   ID: ${op.id}`);
      console.log(`   Сумма: ${op.amount}`);
      console.log(`   repeat: ${op.repeat}`);
      console.log(`   isTemplate: ${op.isTemplate}`);
      console.log(`   isConfirmed: ${op.isConfirmed}`);
      console.log(`   Дата операции: ${op.operationDate.toISOString()}`);
      console.log(`   Создана: ${op.createdAt.toLocaleString('ru-RU')}`);
      console.log('');
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllRecurring();
