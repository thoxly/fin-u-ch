import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedInitialData } from './seed-initial-data';

const prisma = new PrismaClient();

async function createDemoUser() {
  try {
    // Creating demo user with sample data for 2025

    // 1. Создаем компанию
    const company = await prisma.company.create({
      data: {
        name: 'Демо Компания ООО',
        currencyBase: 'RUB',
      },
    });

    // Company created

    // 2. Создаем демо-пользователя
    const hashedPassword = await bcrypt.hash('demo123', 10);
    await prisma.user.create({
      data: {
        companyId: company.id,
        email: 'demo@example.com',
        passwordHash: hashedPassword,
        isActive: true,
      },
    });

    // Demo user created

    // 3. Создаем начальные справочники
    await seedInitialData(prisma, company.id);
    // Initial data seeded

    // 4. Создаем дополнительные данные за 2025 год
    await createSampleOperations(prisma, company.id);
    await createSamplePlans(prisma, company.id);
    await createSampleSalaries(prisma, company.id);

    // 5. Создаем планы на 2026 год
    await createSamplePlans2026(prisma, company.id);

    // Demo user created successfully!
    // Email: demo@example.com
    // Password: demo123
    // Sample data for 2025 and plans for 2026 added
  } catch (error) {
    // Error creating demo user
    console.error('Demo user creation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createSampleOperations(prisma: PrismaClient, companyId: string) {
  // Creating sample operations for 2025

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
  const operations: Array<{
    type: string;
    date: string;
    amount: number;
    description: string;
    articleId: string;
    accountId: string;
    counterpartyId?: string;
    dealId?: string;
    departmentId?: string;
  }> = [];

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

  // Июнь 2025 - летний сезон
  operations.push(
    {
      type: 'income',
      date: '2025-06-10',
      amount: 220000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-06-25',
      amount: 180000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },
    // Новые типы доходов
    {
      type: 'income',
      date: '2025-06-15',
      amount: 25000,
      account: mainAccount,
      article: articles.find((a) => a.name === 'Прочие доходы')!,
      counterparty: customer,
    },

    {
      type: 'expense',
      date: '2025-06-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-06-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-06-12',
      amount: 12000,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-06-18',
      amount: 30000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-06-25',
      amount: 60000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-06-30',
      amount: 20000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    },
    // Дополнительные расходы
    {
      type: 'expense',
      date: '2025-06-08',
      amount: 15000,
      account: mainAccount,
      article: articles.find((a) => a.name === 'Страховые взносы')!,
      counterparty: counterparties.find((c) => c.name === 'ПФР')!,
    },
    {
      type: 'expense',
      date: '2025-06-20',
      amount: 8000,
      account: mainAccount,
      article: articles.find((a) => a.name === 'Связь и интернет')!,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-06-15',
      amount: 15000,
      account: mainAccount,
      article: loanArticle,
      counterparty: bank,
    }
  );

  // Июль 2025
  operations.push(
    {
      type: 'income',
      date: '2025-07-12',
      amount: 250000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-07-28',
      amount: 200000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },

    {
      type: 'expense',
      date: '2025-07-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-07-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-07-12',
      amount: 11000,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-07-20',
      amount: 35000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-07-25',
      amount: 70000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-07-30',
      amount: 25000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    },
    // Летние расходы
    {
      type: 'expense',
      date: '2025-07-15',
      amount: 20000,
      account: mainAccount,
      article: articles.find((a) => a.name === 'Канцтовары')!,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-07-22',
      amount: 12000,
      account: mainAccount,
      article: articles.find((a) => a.name === 'НДФЛ')!,
      counterparty: counterparties.find((c) => c.name === 'ФНС России')!,
    },
    {
      type: 'expense',
      date: '2025-07-18',
      amount: 15000,
      account: mainAccount,
      article: loanArticle,
      counterparty: bank,
    }
  );

  // Август 2025
  operations.push(
    {
      type: 'income',
      date: '2025-08-10',
      amount: 280000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-08-25',
      amount: 220000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },

    {
      type: 'expense',
      date: '2025-08-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-08-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-08-12',
      amount: 10000,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-08-20',
      amount: 40000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-08-28',
      amount: 80000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-08-30',
      amount: 28000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    },
    // Инвестиции
    {
      type: 'expense',
      date: '2025-08-15',
      amount: 150000,
      account: mainAccount,
      article: articles.find((a) => a.name === 'Нематериальные активы')!,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-08-22',
      amount: 15000,
      account: mainAccount,
      article: loanArticle,
      counterparty: bank,
    }
  );

  // Сентябрь 2025
  operations.push(
    {
      type: 'income',
      date: '2025-09-12',
      amount: 300000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-09-28',
      amount: 250000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },

    {
      type: 'expense',
      date: '2025-09-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-09-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-09-12',
      amount: 13000,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-09-20',
      amount: 45000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-09-25',
      amount: 90000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-09-30',
      amount: 30000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    },
    // Дополнительные расходы
    {
      type: 'expense',
      date: '2025-09-15',
      amount: 18000,
      account: mainAccount,
      article: articles.find((a) => a.name === 'Сырье и материалы')!,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-09-22',
      amount: 15000,
      account: mainAccount,
      article: loanArticle,
      counterparty: bank,
    }
  );

  // Октябрь 2025
  operations.push(
    {
      type: 'income',
      date: '2025-10-10',
      amount: 320000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-10-25',
      amount: 280000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },

    {
      type: 'expense',
      date: '2025-10-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-10-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-10-12',
      amount: 14000,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-10-20',
      amount: 50000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-10-28',
      amount: 100000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-10-30',
      amount: 32000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    },
    // Квартальные налоги
    {
      type: 'expense',
      date: '2025-10-15',
      amount: 50000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    },
    {
      type: 'expense',
      date: '2025-10-22',
      amount: 15000,
      account: mainAccount,
      article: loanArticle,
      counterparty: bank,
    }
  );

  // Ноябрь 2025
  operations.push(
    {
      type: 'income',
      date: '2025-11-12',
      amount: 350000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-11-28',
      amount: 300000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },

    {
      type: 'expense',
      date: '2025-11-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-11-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-11-12',
      amount: 15000,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-11-20',
      amount: 55000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-11-25',
      amount: 110000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-11-30',
      amount: 35000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    },
    // Дополнительные расходы
    {
      type: 'expense',
      date: '2025-11-15',
      amount: 20000,
      account: mainAccount,
      article: articles.find((a) => a.name === 'Капитальный ремонт')!,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-11-22',
      amount: 15000,
      account: mainAccount,
      article: loanArticle,
      counterparty: bank,
    }
  );

  // Декабрь 2025
  operations.push(
    {
      type: 'income',
      date: '2025-12-10',
      amount: 400000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
      deal,
    },
    {
      type: 'income',
      date: '2025-12-25',
      amount: 350000,
      account: mainAccount,
      article: revenueArticle,
      counterparty: customer,
    },

    {
      type: 'expense',
      date: '2025-12-05',
      amount: 50000,
      account: mainAccount,
      article: salaryArticle,
      counterparty: employee,
    },
    {
      type: 'expense',
      date: '2025-12-10',
      amount: 25000,
      account: mainAccount,
      article: rentArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-12-12',
      amount: 16000,
      account: mainAccount,
      article: utilitiesArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-12-20',
      amount: 60000,
      account: mainAccount,
      article: marketingArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-12-28',
      amount: 120000,
      account: mainAccount,
      article: cogsArticle,
      counterparty: supplier,
    },
    {
      type: 'expense',
      date: '2025-12-30',
      amount: 40000,
      account: mainAccount,
      article: taxArticle,
      counterparty: gov,
    },
    // Годовые расходы
    {
      type: 'expense',
      date: '2025-12-15',
      amount: 100000,
      account: mainAccount,
      article: articles.find((a) => a.name === 'Дивиденды')!,
      counterparty: counterparties.find((c) => c.name === 'ООО "Клиент-1"')!,
    },
    {
      type: 'expense',
      date: '2025-12-22',
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

  // Created sample operations
}

async function createSamplePlans(prisma: PrismaClient, companyId: string) {
  // Creating sample plans for 2025

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
        dealId: undefined,
        repeat: plan.repeat,
        status: 'active',
        description: plan.description,
      },
    });
  }

  // Created sample plans
}

async function createSampleSalaries(prisma: PrismaClient, companyId: string) {
  // Creating sample salary rules

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

  // Created sample salary rule
}

async function createSamplePlans2026(prisma: PrismaClient, companyId: string) {
  // Creating sample plans for 2026

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
  const equipmentArticle = articles.find(
    (a) => a.name === 'Покупка оборудования'
  )!;
  const insuranceArticle = articles.find((a) => a.name === 'Страховые взносы')!;
  const ndflArticle = articles.find((a) => a.name === 'НДФЛ')!;
  const connectionArticle = articles.find(
    (a) => a.name === 'Связь и интернет'
  )!;
  const materialsArticle = articles.find(
    (a) => a.name === 'Сырье и материалы'
  )!;
  const otherIncomeArticle = articles.find((a) => a.name === 'Прочие доходы')!;

  const employee = counterparties.find(
    (c) => c.name === 'Иванов Иван Иванович'
  )!;
  const supplier = counterparties.find((c) => c.name === 'ООО "Поставщик-1"')!;
  const gov = counterparties.find((c) => c.name === 'ФНС России')!;
  const customer = counterparties.find((c) => c.name === 'ООО "Клиент-1"')!;
  const pfr = counterparties.find((c) => c.name === 'ПФР')!;
  const bank = counterparties.find((c) => c.name === 'ООО "Банк"')!;

  const plans2026 = [
    // Ежемесячные планы доходов
    {
      type: 'income',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 400000,
      article: revenueArticle,
      account: mainAccount,
      counterparty: customer,
      repeat: 'monthly',
      description: 'Плановая ежемесячная выручка 2026',
    },
    {
      type: 'income',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 50000,
      article: otherIncomeArticle,
      account: mainAccount,
      counterparty: customer,
      repeat: 'monthly',
      description: 'Плановые прочие доходы 2026',
    },

    // Ежемесячные планы расходов
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 60000,
      article: salaryArticle,
      account: mainAccount,
      counterparty: employee,
      repeat: 'monthly',
      description: 'Плановая зарплата 2026 (с индексацией)',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 30000,
      article: rentArticle,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'monthly',
      description: 'Плановая аренда офиса 2026 (с индексацией)',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 15000,
      article: utilitiesArticle,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'monthly',
      description: 'Плановые коммунальные услуги 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 25000,
      article: marketingArticle,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'monthly',
      description: 'Плановый маркетинг 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 50000,
      article: cogsArticle,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'monthly',
      description: 'Плановые закупки товаров 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 20000,
      article: taxArticle,
      account: mainAccount,
      counterparty: gov,
      repeat: 'monthly',
      description: 'Плановые налоги 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 18000,
      article: insuranceArticle,
      account: mainAccount,
      counterparty: pfr,
      repeat: 'monthly',
      description: 'Плановые страховые взносы 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 10000,
      article: connectionArticle,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'monthly',
      description: 'Плановые расходы на связь 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 25000,
      article: materialsArticle,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'monthly',
      description: 'Плановые расходы на материалы 2026',
    },

    // Квартальные планы
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 60000,
      article: taxArticle,
      account: mainAccount,
      counterparty: gov,
      repeat: 'quarterly',
      description: 'Квартальные налоги 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 20000,
      article: ndflArticle,
      account: mainAccount,
      counterparty: gov,
      repeat: 'quarterly',
      description: 'Квартальный НДФЛ 2026',
    },

    // Годовые планы
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 500000,
      article: equipmentArticle,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'annual',
      description: 'Годовые инвестиции в оборудование 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 300000,
      article: articles.find((a) => a.name === 'Нематериальные активы')!,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'annual',
      description: 'Годовые инвестиции в нематериальные активы 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 150000,
      article: articles.find((a) => a.name === 'Капитальный ремонт')!,
      account: mainAccount,
      counterparty: supplier,
      repeat: 'annual',
      description: 'Годовые расходы на капитальный ремонт 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 200000,
      article: articles.find((a) => a.name === 'Дивиденды')!,
      account: mainAccount,
      counterparty: customer,
      repeat: 'annual',
      description: 'Годовые дивиденды 2026',
    },

    // Полугодовые планы
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 100000,
      article: articles.find((a) => a.name === 'Проценты по кредитам')!,
      account: mainAccount,
      counterparty: bank,
      repeat: 'semi_annual',
      description: 'Полугодовые проценты по кредитам 2026',
    },
  ];

  for (const plan of plans2026) {
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
        // counterpartyId: plan.counterparty.id, // Поле не существует в схеме
        repeat: plan.repeat,
        status: 'active',
        description: plan.description,
      },
    });
  }

  // Created sample plans for 2026
}

// Запуск скрипта
if (require.main === module) {
  createDemoUser()
    .then(() => {
      // Demo user setup completed
      process.exit(0);
    })
    .catch((_error) => {
      // Demo user setup failed
      process.exit(1);
    });
}

export { createDemoUser };
