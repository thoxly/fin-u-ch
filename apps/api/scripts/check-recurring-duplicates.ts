import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  try {
    console.log('🔍 Проверка дубликатов повторяющихся операций...\n');

    // Найти все шаблоны
    const templates = await prisma.operation.findMany({
      where: {
        isTemplate: true,
        repeat: { not: 'none' },
      },
      select: {
        id: true,
        description: true,
        amount: true,
        operationDate: true,
        repeat: true,
      },
    });

    console.log(`📋 Найдено шаблонов: ${templates.length}\n`);

    for (const template of templates) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📄 Шаблон: ${template.description}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   Сумма: ${template.amount}`);
      console.log(`   Периодичность: ${template.repeat}`);
      console.log(`   Дата: ${template.operationDate.toISOString()}`);

      // Найти все дочерние операции
      const children = await prisma.operation.findMany({
        where: {
          recurrenceParentId: template.id,
          isTemplate: false,
        },
        orderBy: {
          operationDate: 'asc',
        },
        select: {
          id: true,
          operationDate: true,
          amount: true,
          description: true,
          createdAt: true,
        },
      });

      console.log(`\n   ✅ Создано операций: ${children.length}`);

      // Проверка на дубликаты по дате
      const dateGroups = new Map<string, typeof children>();
      for (const child of children) {
        const dateKey = child.operationDate.toISOString().split('T')[0];
        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, []);
        }
        dateGroups.get(dateKey)!.push(child);
      }

      // Найти дубликаты
      let hasDuplicates = false;
      for (const [date, ops] of dateGroups.entries()) {
        if (ops.length > 1) {
          if (!hasDuplicates) {
            console.log(`\n   ⚠️  НАЙДЕНЫ ДУБЛИКАТЫ:`);
            hasDuplicates = true;
          }
          console.log(`\n   🔴 Дата: ${date} - ${ops.length} операций:`);
          ops.forEach((op, idx) => {
            console.log(
              `      ${idx + 1}. ID: ${op.id.substring(0, 8)}... Создана: ${op.createdAt.toLocaleString('ru-RU')}`
            );
          });
        }
      }

      if (!hasDuplicates && children.length > 0) {
        console.log(`   ✅ Дубликатов не найдено`);
        console.log(`\n   Даты операций:`);
        children.forEach((child, idx) => {
          console.log(
            `      ${idx + 1}. ${child.operationDate.toISOString().split('T')[0]} (${child.createdAt.toLocaleString('ru-RU')})`
          );
        });
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
