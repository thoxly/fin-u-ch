#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-console */
// @ts-nocheck - Script runs with tsx, types resolved at runtime

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
    {
      name: 'Выручка от продаж',
      type: 'income' as const,
      activity: 'operating' as const,
    },
    {
      name: 'Прочие доходы',
      type: 'income' as const,
      activity: 'operating' as const,
    },
    {
      name: 'Материальные расходы',
      type: 'expense' as const,
      activity: 'operating' as const,
    },
    {
      name: 'Зарплата',
      type: 'expense' as const,
      activity: 'operating' as const,
    },
    {
      name: 'Аренда',
      type: 'expense' as const,
      activity: 'operating' as const,
    },
    {
      name: 'Коммунальные услуги',
      type: 'expense' as const,
      activity: 'operating' as const,
    },
    {
      name: 'Прочие расходы',
      type: 'expense' as const,
      activity: 'operating' as const,
    },
  ];

  for (const article of articles) {
    const existing = await prisma.article.findFirst({
      where: {
        companyId,
        name: article.name,
      },
    });

    if (!existing) {
      await prisma.article.create({
        data: {
          companyId,
          name: article.name,
          type: article.type,
          activity: article.activity,
        },
      });
    }
  }

  // Счета
  const accounts = [
    { name: 'Касса' },
    { name: 'Расчетный счет' },
    { name: 'Валютный счет' },
  ];

  for (const account of accounts) {
    const existing = await prisma.account.findFirst({
      where: {
        companyId,
        name: account.name,
      },
    });

    if (!existing) {
      await prisma.account.create({
        data: {
          companyId,
          name: account.name,
        },
      });
    }
  }

  // Подразделения
  const departments = [
    'Отдел продаж',
    'Отдел маркетинга',
    'Бухгалтерия',
    'IT отдел',
  ];

  for (const deptName of departments) {
    const existing = await prisma.department.findFirst({
      where: {
        companyId,
        name: deptName,
      },
    });

    if (!existing) {
      await prisma.department.create({
        data: {
          companyId,
          name: deptName,
        },
      });
    }
  }

  // Контрагенты
  const counterparties = [
    { name: 'ООО "Поставщик"', category: 'supplier' },
    { name: 'ИП Иванов И.И.', category: 'supplier' },
    { name: 'ОАО "Клиент"', category: 'customer' },
    { name: 'ЗАО "Партнер"', category: 'customer' },
  ];

  for (const cp of counterparties) {
    const existing = await prisma.counterparty.findFirst({
      where: {
        companyId,
        name: cp.name,
      },
    });

    if (!existing) {
      await prisma.counterparty.create({
        data: {
          companyId,
          name: cp.name,
          category: cp.category,
        },
      });
    }
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
