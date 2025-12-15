#!/usr/bin/env tsx
/* eslint-disable no-console */

import demoUserService from '../apps/api/src/modules/demo/demo.service';
import prisma from '../apps/api/src/config/db';

/**
 * Создает демо-пользователя для продакшена с полными моковыми данными
 * Этот скрипт должен запускаться автоматически при деплое
 *
 * Использование:
 *   npx tsx scripts/setup-production-demo.ts          - создает, если не существует
 *   npx tsx scripts/setup-production-demo.ts --force  - пересоздает принудительно
 */
async function setupProductionDemo(): Promise<void> {
  try {
    const forceRecreate = process.argv.includes('--force');

    console.log('🚀 Setting up production demo user...');
    if (forceRecreate) {
      console.log(
        '⚠️  Force recreate mode: existing demo user will be deleted'
      );
    }

    // Проверяем, существует ли уже демо-пользователь
    const exists = await demoUserService.exists();

    if (exists) {
      const info = await demoUserService.getInfo();
      if (info) {
        console.log('✅ Demo user already exists:', info.user.email);
        console.log('   Company:', info.company.name);
        console.log('   User ID:', info.user.id);
        console.log('   Operations:', info.operationsCount);
        console.log('   Plans:', info.plansCount);
        console.log('   Accounts:', info.accountsCount);
        console.log('   Articles:', info.articlesCount);
        console.log('   Counterparties:', info.counterpartiesCount);

        if (forceRecreate) {
          console.log('🗑️  Deleting existing demo user...');
          await demoUserService.delete();
          console.log('✅ Demo user deleted');
        } else if (info.operationsCount > 0) {
          console.log('✅ Demo user has sample data');
          return;
        } else {
          console.log(
            '⚠️  Demo user exists but has no data. Adding sample data...'
          );
          await demoUserService.delete();
        }
      }
    }

    console.log('🔧 Creating demo user with sample data...');
    const demoUser = await demoUserService.create();

    console.log('✅ Demo user created successfully!');
    console.log('');
    console.log('📋 Demo Credentials:');
    console.log('   Email:', demoUser.user.email);
    console.log('   Company:', demoUser.company.name);
    console.log('   Operations:', demoUser.operationsCount);
    console.log('   Plans:', demoUser.plansCount);
    console.log('   Accounts:', demoUser.accountsCount);
    console.log('   Articles:', demoUser.articlesCount);
    console.log('   Counterparties:', demoUser.counterpartiesCount);

    // Получаем информацию о бюджетах
    const budgetsCount = await prisma.budget.count({
      where: { companyId: demoUser.company.id },
    });
    console.log('   Budgets:', budgetsCount);

    console.log('');
    console.log('🎉 Demo user setup completed!');
  } catch (error) {
    console.error('❌ Failed to setup production demo user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  setupProductionDemo()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export default setupProductionDemo;
