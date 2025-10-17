#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Создает демо-пользователя для E2E тестов
 * Используется во всех средах: dev, test, production
 */
async function setupDemoUser() {
  try {
    console.log('🔧 Setting up demo user for E2E tests...');

    // Проверяем, существует ли уже демо-пользователь
    const existingUser = await prisma.user.findUnique({
      where: { email: 'demo@example.com' },
      include: { company: true },
    });

    if (existingUser) {
      console.log('✅ Demo user already exists:', existingUser.email);
      console.log('   Company:', existingUser.company.name);
      console.log('   User ID:', existingUser.id);
      return;
    }

    // Создаем компанию для демо-пользователя
    console.log('📦 Creating demo company...');
    const company = await prisma.company.create({
      data: {
        name: 'Демо Компания ООО',
        currencyBase: 'RUB',
      },
    });
    console.log('✅ Company created:', company.name, '(ID:', company.id, ')');

    // Создаем демо-пользователя
    console.log('👤 Creating demo user...');
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email: 'demo@example.com',
        passwordHash: hashedPassword,
        isActive: true,
      },
    });
    console.log('✅ Demo user created:', user.email, '(ID:', user.id, ')');

    // Создаем начальные справочники
    console.log('📚 Creating initial catalogs...');
    await createInitialCatalogs(company.id);

    console.log('');
    console.log('🎉 Demo user setup completed!');
    console.log('   Email: demo@example.com');
    console.log('   Password: demo123');
    console.log('   Company: Демо Компания ООО');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to setup demo user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Создает начальные справочники для демо-компании
 */
async function createInitialCatalogs(companyId: string) {
  // Статьи доходов и расходов
  const articles = [
    { name: 'Выручка от продаж', type: 'INCOME' as const },
    { name: 'Прочие доходы', type: 'INCOME' as const },
    { name: 'Материальные расходы', type: 'EXPENSE' as const },
    { name: 'Зарплата', type: 'EXPENSE' as const },
    { name: 'Аренда', type: 'EXPENSE' as const },
    { name: 'Коммунальные услуги', type: 'EXPENSE' as const },
    { name: 'Прочие расходы', type: 'EXPENSE' as const },
  ];

  for (const article of articles) {
    await prisma.article.upsert({
      where: {
        companyId_name: {
          companyId,
          name: article.name,
        },
      },
      update: {},
      create: {
        companyId,
        name: article.name,
        type: article.type,
      },
    });
  }

  // Счета
  const accounts = [
    { name: 'Касса', type: 'CASH' as const },
    { name: 'Расчетный счет', type: 'BANK' as const },
    { name: 'Валютный счет', type: 'BANK' as const },
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where: {
        companyId_name: {
          companyId,
          name: account.name,
        },
      },
      update: {},
      create: {
        companyId,
        name: account.name,
        type: account.type,
      },
    });
  }

  // Подразделения
  const departments = [
    'Отдел продаж',
    'Отдел маркетинга',
    'Бухгалтерия',
    'IT отдел',
  ];

  for (const deptName of departments) {
    await prisma.department.upsert({
      where: {
        companyId_name: {
          companyId,
          name: deptName,
        },
      },
      update: {},
      create: {
        companyId,
        name: deptName,
      },
    });
  }

  // Контрагенты
  const counterparties = [
    'ООО "Поставщик"',
    'ИП Иванов И.И.',
    'ОАО "Клиент"',
    'ЗАО "Партнер"',
  ];

  for (const cpName of counterparties) {
    await prisma.counterparty.upsert({
      where: {
        companyId_name: {
          companyId,
          name: cpName,
        },
      },
      update: {},
      create: {
        companyId,
        name: cpName,
      },
    });
  }

  console.log('✅ Initial catalogs created');
}

// Запуск скрипта
if (require.main === module) {
  setupDemoUser()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export { setupDemoUser };
