import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedInitialData } from '../src/modules/auth/seed-initial-data';

const prisma = new PrismaClient();

async function createDemoUser() {
  try {
    console.log('🚀 Creating demo user with sample data for 2025...');

    // 1. Создаем компанию
    const company = await prisma.company.create({
      data: {
        name: 'Демо Компания ООО',
        currencyBase: 'RUB',
      },
    });

    console.log('✅ Company created:', company.id);

    // 2. Создаем демо-пользователя
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email: 'demo@example.com',
        passwordHash: hashedPassword,
        isActive: true,
      },
    });

    console.log('✅ Demo user created:', user.email);

    // 3. Создаем начальные справочники
    await seedInitialData(prisma, company.id);
    console.log('✅ Initial data seeded');

    // 4. Создаем дополнительные данные за 2025 год
    await createSampleOperations(prisma, company.id);
    await createSamplePlans(prisma, company.id);
    await createSampleSalaries(prisma, company.id);

    console.log('🎉 Demo user created successfully!');
    console.log('📧 Email: demo@example.com');
    console.log('🔑 Password: demo123');
    console.log('📊 Sample data for 2025 added');
  } catch (error) {
    console.error('❌ Error creating demo user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createSampleOperations(prisma: PrismaClient, companyId: string) {
  console.log('📝 Creating sample operations for 2025...');

  // Получаем нужные ID
  const accounts = await prisma.account.findMany({ where: { companyId } });
  const articles = await prisma.article.findMany({ where: { companyId } });
  const counterparties = await prisma.counterparty.findMany({
    where: { companyId },
  });
  const deals = await prisma.deal.findMany({ where: { companyId } });

  const mainAccount = accounts.find(
    (a) => a.name === 'Расчетный счет в банке'
  )!;
  const cashAccount = accounts.find((a) => a.name === 'Касса')!;

  const revenueArticle = articles.find((a) => a.name === 'Выручка от продаж')!;
  const salaryArticle = articles.find((a) => a.name === 'Зарплата')!;
  const rentArticle = articles.find((a) => a.name === 'Аренда офиса')!;
  const utilitiesArticle = articles.find(
    (a) => a.name === 'Коммунальные услуги'
  )!;
  const marketingArticle = articles.find(
    (a) => a.name === 'Реклама и маркетинг'
  )!;
  const cogsArticle = articles.find((a) => a.name === 'Закупка товаров')!;
  const taxArticle = articles.find((a) => a.name === 'Налог на прибыль')!;
  const equipmentArticle = articles.find(
    (a) => a.name === 'Покупка оборудования'
  )!;
  const loanArticle = articles.find((a) => a.name === 'Проценты по кредитам')!;

  const customer = counterparties.find((c) => c.name === 'ООО "Клиент-1"')!;
  const supplier = counterparties.find((c) => c.name === 'ООО "Поставщик-1"')!;
  const employee = counterparties.find(
    (c) => c.name === 'Иванов Иван Иванович'
  )!;
  const gov = counterparties.find((c) => c.name === 'ФНС России')!;
  const bank = counterparties.find((c) => c.name === 'ООО "Банк"')!;

  const deal = deals.find((d) => d.name === 'Проект А')!;

  // Операции за 2025 год (помесячно)
  const operations = [];

  // Январь 2025
  operations.push(
    // Доходы
    {
      type: 'income',
      date: '2025-01-15',
      amount: 150000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-01-25',
      amount: 80000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },

    // Расходы
    {
      type: 'expense',
      date: '2025-01-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-01-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-01-12',
      amount: 8000,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-01-20',
      amount: 15000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-01-28',
      amount: 30000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-01-30',
      amount: 12000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    }
  );

  // Февраль 2025
  operations.push(
    {
      type: 'income',
      date: '2025-02-10',
      amount: 180000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-02-20',
      amount: 95000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },

    {
      type: 'expense',
      date: '2025-02-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-02-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-02-12',
      amount: 7500,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-02-15',
      amount: 20000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-02-25',
      amount: 40000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-02-28',
      amount: 15000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    }
  );

  // Март 2025
  operations.push(
    {
      type: 'income',
      date: '2025-03-05',
      amount: 200000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-03-18',
      amount: 120000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },

    {
      type: 'expense',
      date: '2025-03-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-03-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-03-12',
      amount: 9000,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-03-20',
      amount: 25000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-03-25',
      amount: 50000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-03-28',
      amount: 18000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    },
    // Инвестиционная деятельность
    {
      type: 'expense',
      date: '2025-03-15',
      amount: 100000,
      account: mainAccount,
      article: equipmentArticle,
      counterparty: supplier,
    }
  );

  // Апрель 2025
  operations.push(
    {
      type: 'income',
      date: '2025-04-08',
      amount: 160000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-04-22',
      amount: 110000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },

    {
      type: 'expense',
      date: '2025-04-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-04-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-04-12',
      amount: 8500,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-04-18',
      amount: 18000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-04-25',
      amount: 35000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-04-30',
      amount: 14000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    },
    // Финансовая деятельность
    {
      type: 'expense',
      date: '2025-04-15',
      amount: 15000,
      account: mainAccount,
      article: loanArticle,
      counterparty: bank,
    }
  );

  // Май 2025
  operations.push(
    {
      type: 'income',
      date: '2025-05-12',
      amount: 190000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-05-25',
      amount: 130000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },

    {
      type: 'expense',
      date: '2025-05-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-05-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-05-12',
      amount: 9500,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-05-20',
      amount: 22000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-05-28',
      amount: 45000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-05-30',
      amount: 16000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    },
    {
      type: 'expense',
      date: '2025-05-15',
      amount: 15000,
      account: mainAccount,
      article: loanArticle,
      counterparty: bank,
    }
  );

  // Переводы между счетами
  operations.push(
    {
      type: 'transfer',
      date: '2025-01-15',
      amount: 10000,
      sourceAccount: mainAccount,
      targetAccount: cashAccount,
    },
    {
      type: 'transfer',
      date: '2025-02-15',
      amount: 5000,
      sourceAccount: mainAccount,
      targetAccount: cashAccount,
    },
    {
      type: 'transfer',
      date: '2025-03-15',
      amount: 15000,
      sourceAccount: mainAccount,
      targetAccount: cashAccount,
    }
  );

  // Создаем операции в базе
  for (const op of operations) {
    await prisma.operation.create({
      data: {
        companyId,
        type: op.type,
        operationDate: new Date(op.date),
        amount: op.amount,
        currency: 'RUB',
        accountId: op.account?.id,
        sourceAccountId: op.sourceAccount?.id,
        targetAccountId: op.targetAccount?.id,
        articleId: op.article?.id,
        counterpartyId: op.counterparty?.id,
        dealId: op.deal?.id,
        description: `Sample operation for ${op.date}`,
      },
    });
  }

  console.log(`✅ Created ${operations.length} sample operations`);
}

async function createSamplePlans(prisma: PrismaClient, companyId: string) {
  console.log('📋 Creating sample plans for 2025...');

  const articles = await prisma.article.findMany({ where: { companyId } });
  const accounts = await prisma.account.findMany({ where: { companyId } });
  const counterparties = await prisma.counterparty.findMany({
    where: { companyId },
  });

  const mainAccount = accounts.find(
    (a) => a.name === 'Расчетный счет в банке'
  )!;
  const salaryArticle = articles.find((a) => a.name === 'Зарплата')!;
  const rentArticle = articles.find((a) => a.name === 'Аренда офиса')!;
  const utilitiesArticle = articles.find(
    (a) => a.name === 'Коммунальные услуги'
  )!;
  const marketingArticle = articles.find(
    (a) => a.name === 'Реклама и маркетинг'
  )!;
  const cogsArticle = articles.find((a) => a.name === 'Закупка товаров')!;
  const taxArticle = articles.find((a) => a.name === 'Налог на прибыль')!;
  const revenueArticle = articles.find((a) => a.name === 'Выручка от продаж')!;

  const employee = counterparties.find(
    (c) => c.name === 'Иванов Иван Иванович'
  )!;
  const supplier = counterparties.find((c) => c.name === 'ООО "Поставщик-1"')!;
  const gov = counterparties.find((c) => c.name === 'ФНС России')!;
  const customer = counterparties.find((c) => c.name === 'ООО "Клиент-1"')!;

  const plans = [
    // Ежемесячные планы
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 50000,
      article: salaryArticle,
      account: mainAccount,
      counterparty: employee,
      repeat: 'monthly',
      description: 'Ежемесячная зарплата',
    },
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 25000,
      article: rentArticle,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'monthly',
      description: 'Ежемесячная аренда офиса',
    },
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 10000,
      article: utilitiesArticle,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'monthly',
      description: 'Ежемесячные коммунальные услуги',
    },
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 20000,
      article: marketingArticle,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'monthly',
      description: 'Ежемесячный маркетинг',
    },
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 40000,
      article: cogsArticle,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'monthly',
      description: 'Ежемесячные закупки товаров',
    },
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 15000,
      article: taxArticle,
      account: mainAccount,
      counterparty: gov,
      repeat: 'monthly',
      description: 'Ежемесячные налоги',
    },
    {
      type: 'income',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 150000,
      article: revenueArticle,
      account: mainAccount,
      counterparty: customer,
      repeat: 'monthly',
      description: 'Ежемесячная выручка',
    },
    // Квартальные планы
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 50000,
      article: taxArticle,
      account: mainAccount,
      counterparty: gov,
      repeat: 'quarterly',
      description: 'Квартальные налоги',
    },
    // Годовые планы
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 200000,
      article: articles.find((a) => a.name === 'Покупка оборудования')!,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'annual',
      description: 'Годовые инвестиции в оборудование',
    },
  ];

  for (const plan of plans) {
    await prisma.planItem.create({
      data: {
        companyId,
        type: plan.type,
        startDate: new Date(plan.startDate),
        endDate: new Date(plan.endDate),
        amount: plan.amount,
        currency: 'RUB',
        articleId: plan.article.id,
        accountId: plan.account.id,
        repeat: plan.repeat,
        status: 'active',
        description: plan.description,
      },
    });
  }

  console.log(`✅ Created ${plans.length} sample plans`);
}

async function createSampleSalaries(prisma: PrismaClient, companyId: string) {
  console.log('💰 Creating sample salary rules...');

  const counterparties = await prisma.counterparty.findMany({
    where: { companyId },
  });
  const departments = await prisma.department.findMany({
    where: { companyId },
  });

  const employee = counterparties.find(
    (c) => c.name === 'Иванов Иван Иванович'
  )!;
  const salesDept = departments.find((d) => d.name === 'Отдел продаж')!;

  await prisma.salary.create({
    data: {
      companyId,
      employeeCounterpartyId: employee.id,
      departmentId: salesDept.id,
      baseWage: 50000,
      contributionsPct: 30,
      incomeTaxPct: 13,
      periodicity: 'monthly',
      effectiveFrom: new Date('2025-01-01'),
      effectiveTo: new Date('2025-12-31'),
    },
  });

  console.log('✅ Created sample salary rule');
}

// Запуск скрипта
if (require.main === module) {
  createDemoUser()
    .then(() => {
      console.log('🎉 Demo user setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Demo user setup failed:', error);
      process.exit(1);
    });
}

export { createDemoUser };
