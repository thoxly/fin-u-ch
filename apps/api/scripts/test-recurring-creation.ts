import { PrismaClient } from '@prisma/client';
import { OperationsService } from '../src/modules/operations/operations.service';

const prisma = new PrismaClient();

async function testRecurringCreation() {
  try {
    console.log('🧪 Тестирование создания повторяющейся операции...\n');

    const operationsService = new OperationsService();

    // Найти компанию
    const company = await prisma.company.findFirst();
    if (!company) {
      console.error('❌ Компания не найдена');
      return;
    }

    console.log(`✅ Найдена компания: ${company.id} - ${company.name}`);

    // Найти счет
    const account = await prisma.account.findFirst({
      where: { companyId: company.id },
    });

    if (!account) {
      console.error('❌ Счет не найден');
      return;
    }

    console.log(`✅ Найден счет: ${account.id} - ${account.name}`);

    // Найти статью
    const article = await prisma.article.findFirst({
      where: { companyId: company.id },
    });

    if (!article) {
      console.error('❌ Статья не найдена');
      return;
    }

    console.log(`✅ Найдена статья: ${article.id} - ${article.name}\n`);

    // Создать тестовую повторяющуюся операцию
    console.log('📝 Создаю тестовую повторяющуюся операцию...');

    const result = await operationsService.create(company.id, {
      type: 'expense',
      operationDate: new Date(),
      amount: 99999,
      currency: 'RUB',
      accountId: account.id,
      articleId: article.id,
      description: 'ТЕСТ: Повторяющаяся операция',
      repeat: 'weekly',
      recurrenceEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 дней
      isConfirmed: false,
    });

    console.log(`\n✅ Операция создана: ${result.id}`);
    console.log(`   isTemplate: ${result.isTemplate}`);
    console.log(`   repeat: ${result.repeat}`);

    // Проверить, создались ли дочерние операции
    const children = await prisma.operation.findMany({
      where: {
        recurrenceParentId: result.id,
      },
    });

    console.log(`\n📊 Дочерних операций: ${children.length}`);

    if (children.length === 0) {
      console.log(
        '\n⚠️  ПРОБЛЕМА ПОДТВЕРЖДЕНА: Дочерняя операция не создалась!'
      );
      console.log(
        '   При создании шаблона должна была создаться первая дочерняя операция.'
      );
    } else {
      console.log('\n✅ Дочерние операции созданы:');
      children.forEach((child, idx) => {
        console.log(
          `   ${idx + 1}. ${child.id} - ${child.operationDate.toISOString()}`
        );
      });
    }

    // Удалить тестовые данные
    console.log('\n🧹 Удаляю тестовые данные...');
    await prisma.operation.deleteMany({
      where: {
        OR: [{ id: result.id }, { recurrenceParentId: result.id }],
      },
    });
    console.log('✅ Тестовые данные удалены');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRecurringCreation();
