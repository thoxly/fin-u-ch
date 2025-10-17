#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-console */
// @ts-nocheck - Script runs with tsx, types resolved at runtime

import { PrismaClient } from '@prisma/client';
import { DemoUserService } from '../apps/api/src/modules/demo/demo.service';

const prisma = new PrismaClient();

/**
 * Создает демо-пользователя для продакшена с полными моковыми данными
 * Этот скрипт должен запускаться автоматически при деплое
 */
async function setupProductionDemo(): Promise<void> {
  try {
    console.log('🚀 Setting up production demo user...');

    const demoUserService = new DemoUserService(prisma);

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

        if (info.operationsCount > 0) {
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

    // Создаем демо-пользователя с данными
    console.log('📊 Creating demo user with sample data...');
    const demoUserData = await demoUserService.create();

    console.log('');
    console.log('🎉 Production demo user setup completed!');
    console.log('   Email: demo@example.com');
    console.log('   Password: demo123');
    console.log('   Company: Демо Компания ООО');
    console.log('   Operations:', demoUserData.operationsCount);
    console.log('   Plans:', demoUserData.plansCount);
    console.log('   Accounts:', demoUserData.accountsCount);
    console.log('   Articles:', demoUserData.articlesCount);
    console.log('   Counterparties:', demoUserData.counterpartiesCount);
    console.log('');
    console.log('📋 Demo credentials for clients:');
    console.log('   • Email: demo@example.com');
    console.log('   • Password: demo123');
    console.log('   • Access: Full demo environment with sample data');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to setup production demo user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
// ES modules pattern for script execution
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  setupProductionDemo()
    .then(() => {
      console.log('✅ Production demo setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Production demo setup failed:', error);
      process.exit(1);
    });
}

export { setupProductionDemo };
