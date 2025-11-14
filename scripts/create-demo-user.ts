/* eslint-disable no-console */
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
    const superUser = await prisma.user.create({
      data: {
        companyId: company.id,
        email: 'demo@example.com',
        passwordHash: hashedPassword,
        isActive: true,
        isSuperAdmin: true, // Первый пользователь компании автоматически становится супер-администратором
      },
    });

    console.log('Создан первый пользователь (супер-пользователь):', {
      id: superUser.id,
      email: superUser.email,
      companyId: superUser.companyId,
      isSuperAdmin: superUser.isSuperAdmin,
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
    description?: string;
    articleId?: string;
    accountId?: string;
    sourceAccountId?: string;
    targetAccountId?: string;
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
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-01-25',
      amount: 80000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },

    // Расходы
    {
      type: 'expense',
      date: '2025-01-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-01-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-01-12',
      amount: 8000,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-01-20',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-01-28',
      amount: 30000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-01-30',
      amount: 12000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    }
  );

  // Февраль 2025
  operations.push(
    {
      type: 'income',
      date: '2025-02-10',
      amount: 180000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-02-20',
      amount: 95000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },

    {
      type: 'expense',
      date: '2025-02-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-02-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-02-12',
      amount: 7500,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-02-15',
      amount: 20000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-02-25',
      amount: 40000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-02-28',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    }
  );

  // Март 2025
  operations.push(
    {
      type: 'income',
      date: '2025-03-05',
      amount: 200000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-03-18',
      amount: 120000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },

    {
      type: 'expense',
      date: '2025-03-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-03-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-03-12',
      amount: 9000,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-03-20',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-03-25',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-03-28',
      amount: 18000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    },
    // Инвестиционная деятельность
    {
      type: 'expense',
      date: '2025-03-15',
      amount: 100000,
      accountId: mainAccount.id,
      articleId: equipmentArticle.id,
      counterpartyId: supplier.id,
    }
  );

  // Апрель 2025
  operations.push(
    {
      type: 'income',
      date: '2025-04-08',
      amount: 160000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-04-22',
      amount: 110000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },

    {
      type: 'expense',
      date: '2025-04-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-04-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-04-12',
      amount: 8500,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-04-18',
      amount: 18000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-04-25',
      amount: 35000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-04-30',
      amount: 14000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    },
    // Финансовая деятельность
    {
      type: 'expense',
      date: '2025-04-15',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: loanArticle.id,
      counterpartyId: bank.id,
    }
  );

  // Май 2025
  operations.push(
    {
      type: 'income',
      date: '2025-05-12',
      amount: 190000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-05-25',
      amount: 130000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },

    {
      type: 'expense',
      date: '2025-05-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-05-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-05-12',
      amount: 9500,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-05-20',
      amount: 22000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-05-28',
      amount: 45000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-05-30',
      amount: 16000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    },
    {
      type: 'expense',
      date: '2025-05-15',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: loanArticle.id,
      counterpartyId: bank.id,
    }
  );

  // Июнь 2025 - летний сезон
  operations.push(
    {
      type: 'income',
      date: '2025-06-10',
      amount: 220000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-06-25',
      amount: 180000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },
    // Новые типы доходов
    {
      type: 'income',
      date: '2025-06-15',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: articles.find((a) => a.name === 'Прочие доходы')!.id,
      counterpartyId: customer.id,
    },

    {
      type: 'expense',
      date: '2025-06-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-06-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-06-12',
      amount: 12000,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-06-18',
      amount: 30000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-06-25',
      amount: 60000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-06-30',
      amount: 20000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    },
    // Дополнительные расходы
    {
      type: 'expense',
      date: '2025-06-08',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: articles.find((a) => a.name === 'Страховые взносы')!.id,
      counterpartyId: counterparties.find((c) => c.name === 'ПФР')!.id,
    },
    {
      type: 'expense',
      date: '2025-06-20',
      amount: 8000,
      accountId: mainAccount.id,
      articleId: articles.find((a) => a.name === 'Связь и интернет')!.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-06-15',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: loanArticle.id,
      counterpartyId: bank.id,
    }
  );

  // Июль 2025
  operations.push(
    {
      type: 'income',
      date: '2025-07-12',
      amount: 250000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-07-28',
      amount: 200000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },

    {
      type: 'expense',
      date: '2025-07-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-07-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-07-12',
      amount: 11000,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-07-20',
      amount: 35000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-07-25',
      amount: 70000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-07-30',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    },
    // Летние расходы
    {
      type: 'expense',
      date: '2025-07-15',
      amount: 20000,
      accountId: mainAccount.id,
      articleId: articles.find((a) => a.name === 'Канцтовары')!.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-07-22',
      amount: 12000,
      accountId: mainAccount.id,
      articleId: articles.find((a) => a.name === 'НДФЛ')!.id,
      counterpartyId: counterparties.find((c) => c.name === 'ФНС России')!.id,
    },
    {
      type: 'expense',
      date: '2025-07-18',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: loanArticle.id,
      counterpartyId: bank.id,
    }
  );

  // Август 2025
  operations.push(
    {
      type: 'income',
      date: '2025-08-10',
      amount: 280000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-08-25',
      amount: 220000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },

    {
      type: 'expense',
      date: '2025-08-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-08-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-08-12',
      amount: 10000,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-08-20',
      amount: 40000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-08-28',
      amount: 80000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-08-30',
      amount: 28000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    },
    // Инвестиции
    {
      type: 'expense',
      date: '2025-08-15',
      amount: 150000,
      accountId: mainAccount.id,
      articleId: articles.find((a) => a.name === 'Нематериальные активы')!.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-08-22',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: loanArticle.id,
      counterpartyId: bank.id,
    }
  );

  // Сентябрь 2025
  operations.push(
    {
      type: 'income',
      date: '2025-09-12',
      amount: 300000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-09-28',
      amount: 250000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },

    {
      type: 'expense',
      date: '2025-09-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-09-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-09-12',
      amount: 13000,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-09-20',
      amount: 45000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-09-25',
      amount: 90000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-09-30',
      amount: 30000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    },
    // Дополнительные расходы
    {
      type: 'expense',
      date: '2025-09-15',
      amount: 18000,
      accountId: mainAccount.id,
      articleId: articles.find((a) => a.name === 'Сырье и материалы')!.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-09-22',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: loanArticle.id,
      counterpartyId: bank.id,
    }
  );

  // Октябрь 2025
  operations.push(
    {
      type: 'income',
      date: '2025-10-10',
      amount: 320000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-10-25',
      amount: 280000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },

    {
      type: 'expense',
      date: '2025-10-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-10-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-10-12',
      amount: 14000,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-10-20',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-10-28',
      amount: 100000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-10-30',
      amount: 32000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    },
    // Квартальные налоги
    {
      type: 'expense',
      date: '2025-10-15',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    },
    {
      type: 'expense',
      date: '2025-10-22',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: loanArticle.id,
      counterpartyId: bank.id,
    }
  );

  // Ноябрь 2025
  operations.push(
    {
      type: 'income',
      date: '2025-11-12',
      amount: 350000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-11-28',
      amount: 300000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },

    {
      type: 'expense',
      date: '2025-11-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-11-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-11-12',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-11-20',
      amount: 55000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-11-25',
      amount: 110000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-11-30',
      amount: 35000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    },
    // Дополнительные расходы
    {
      type: 'expense',
      date: '2025-11-15',
      amount: 20000,
      accountId: mainAccount.id,
      articleId: articles.find((a) => a.name === 'Капитальный ремонт')!.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-11-22',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: loanArticle.id,
      counterpartyId: bank.id,
    }
  );

  // Декабрь 2025
  operations.push(
    {
      type: 'income',
      date: '2025-12-10',
      amount: 400000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
      dealId: deal.id,
    },
    {
      type: 'income',
      date: '2025-12-25',
      amount: 350000,
      accountId: mainAccount.id,
      articleId: revenueArticle.id,
      counterpartyId: customer.id,
    },

    {
      type: 'expense',
      date: '2025-12-05',
      amount: 50000,
      accountId: mainAccount.id,
      articleId: salaryArticle.id,
      counterpartyId: employee.id,
    },
    {
      type: 'expense',
      date: '2025-12-10',
      amount: 25000,
      accountId: mainAccount.id,
      articleId: rentArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-12-12',
      amount: 16000,
      accountId: mainAccount.id,
      articleId: utilitiesArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-12-20',
      amount: 60000,
      accountId: mainAccount.id,
      articleId: marketingArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-12-28',
      amount: 120000,
      accountId: mainAccount.id,
      articleId: cogsArticle.id,
      counterpartyId: supplier.id,
    },
    {
      type: 'expense',
      date: '2025-12-30',
      amount: 40000,
      accountId: mainAccount.id,
      articleId: taxArticle.id,
      counterpartyId: gov.id,
    },
    // Годовые расходы
    {
      type: 'expense',
      date: '2025-12-15',
      amount: 100000,
      accountId: mainAccount.id,
      articleId: articles.find((a) => a.name === 'Дивиденды')!.id,
      counterpartyId: counterparties.find((c) => c.name === 'ООО "Клиент-1"')!
        .id,
    },
    {
      type: 'expense',
      date: '2025-12-22',
      amount: 15000,
      accountId: mainAccount.id,
      articleId: loanArticle.id,
      counterpartyId: bank.id,
    }
  );

  // Переводы между счетами
  operations.push(
    {
      type: 'transfer',
      date: '2025-01-15',
      amount: 10000,
      sourceAccountId: mainAccount.id,
      targetAccountId: cashAccount.id,
    },
    {
      type: 'transfer',
      date: '2025-02-15',
      amount: 5000,
      sourceAccountId: mainAccount.id,
      targetAccountId: cashAccount.id,
    },
    {
      type: 'transfer',
      date: '2025-03-15',
      amount: 15000,
      sourceAccountId: mainAccount.id,
      targetAccountId: cashAccount.id,
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
        accountId: op.accountId,
        sourceAccountId: op.sourceAccountId,
        targetAccountId: op.targetAccountId,
        articleId: op.articleId,
        counterpartyId: op.counterpartyId,
        dealId: op.dealId,
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
      articleId: salaryArticle.id,
      accountId: mainAccount.id,
      counterpartyId: employee.id,
      repeat: 'monthly',
      description: 'Ежемесячная зарплата',
    },
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 25000,
      articleId: rentArticle.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'monthly',
      description: 'Ежемесячная аренда офиса',
    },
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 10000,
      articleId: utilitiesArticle.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'monthly',
      description: 'Ежемесячные коммунальные услуги',
    },
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 20000,
      articleId: marketingArticle.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'monthly',
      description: 'Ежемесячный маркетинг',
    },
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 40000,
      articleId: cogsArticle.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'monthly',
      description: 'Ежемесячные закупки товаров',
    },
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 15000,
      articleId: taxArticle.id,
      accountId: mainAccount.id,
      counterpartyId: gov.id,
      repeat: 'monthly',
      description: 'Ежемесячные налоги',
    },
    {
      type: 'income',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 150000,
      articleId: revenueArticle.id,
      accountId: mainAccount.id,
      counterpartyId: customer.id,
      repeat: 'monthly',
      description: 'Ежемесячная выручка',
    },
    // Квартальные планы
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 50000,
      articleId: taxArticle.id,
      accountId: mainAccount.id,
      counterpartyId: gov.id,
      repeat: 'quarterly',
      description: 'Квартальные налоги',
    },
    // Годовые планы
    {
      type: 'expense',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      amount: 200000,
      articleId: articles.find((a) => a.name === 'Покупка оборудования')!.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
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
        articleId: plan.articleId,
        accountId: plan.accountId,
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
      articleId: revenueArticle.id,
      accountId: mainAccount.id,
      counterpartyId: customer.id,
      repeat: 'monthly',
      description: 'Плановая ежемесячная выручка 2026',
    },
    {
      type: 'income',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 50000,
      articleId: otherIncomeArticle.id,
      accountId: mainAccount.id,
      counterpartyId: customer.id,
      repeat: 'monthly',
      description: 'Плановые прочие доходы 2026',
    },

    // Ежемесячные планы расходов
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 60000,
      articleId: salaryArticle.id,
      accountId: mainAccount.id,
      counterpartyId: employee.id,
      repeat: 'monthly',
      description: 'Плановая зарплата 2026 (с индексацией)',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 30000,
      articleId: rentArticle.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'monthly',
      description: 'Плановая аренда офиса 2026 (с индексацией)',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 15000,
      articleId: utilitiesArticle.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'monthly',
      description: 'Плановые коммунальные услуги 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 25000,
      articleId: marketingArticle.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'monthly',
      description: 'Плановый маркетинг 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 50000,
      articleId: cogsArticle.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'monthly',
      description: 'Плановые закупки товаров 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 20000,
      articleId: taxArticle.id,
      accountId: mainAccount.id,
      counterpartyId: gov.id,
      repeat: 'monthly',
      description: 'Плановые налоги 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 18000,
      articleId: insuranceArticle.id,
      accountId: mainAccount.id,
      counterpartyId: pfr.id,
      repeat: 'monthly',
      description: 'Плановые страховые взносы 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 10000,
      articleId: connectionArticle.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'monthly',
      description: 'Плановые расходы на связь 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 25000,
      articleId: materialsArticle.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'monthly',
      description: 'Плановые расходы на материалы 2026',
    },

    // Квартальные планы
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 60000,
      articleId: taxArticle.id,
      accountId: mainAccount.id,
      counterpartyId: gov.id,
      repeat: 'quarterly',
      description: 'Квартальные налоги 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 20000,
      articleId: ndflArticle.id,
      accountId: mainAccount.id,
      counterpartyId: gov.id,
      repeat: 'quarterly',
      description: 'Квартальный НДФЛ 2026',
    },

    // Годовые планы
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 500000,
      articleId: equipmentArticle.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'annual',
      description: 'Годовые инвестиции в оборудование 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 300000,
      articleId: articles.find((a) => a.name === 'Нематериальные активы')!.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'annual',
      description: 'Годовые инвестиции в нематериальные активы 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 150000,
      articleId: articles.find((a) => a.name === 'Капитальный ремонт')!.id,
      accountId: mainAccount.id,
      counterpartyId: supplier.id,
      repeat: 'annual',
      description: 'Годовые расходы на капитальный ремонт 2026',
    },
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 200000,
      articleId: articles.find((a) => a.name === 'Дивиденды')!.id,
      accountId: mainAccount.id,
      counterpartyId: customer.id,
      repeat: 'annual',
      description: 'Годовые дивиденды 2026',
    },

    // Полугодовые планы
    {
      type: 'expense',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      amount: 100000,
      articleId: articles.find((a) => a.name === 'Проценты по кредитам')!.id,
      accountId: mainAccount.id,
      counterpartyId: bank.id,
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
        articleId: plan.articleId,
        accountId: plan.accountId,
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
