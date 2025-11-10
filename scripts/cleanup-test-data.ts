#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-console */
// @ts-nocheck - Script runs with tsx, types resolved at runtime

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

/**
 * Получает все компании с их статистикой
 */
async function getAllCompanies() {
  return await prisma.company.findMany({
    where: { deletedAt: null },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          isActive: true,
          isEmailVerified: true,
        },
      },
      _count: {
        select: {
          accounts: true,
          operations: true,
          deals: true,
          users: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Получает всех пользователей
 */
async function getAllUsers() {
  return await prisma.user.findMany({
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Показывает статистику всех данных
 */
function showStats(companies: any[], users: any[]) {
  console.log('\n📊 Текущее состояние базы данных:\n');

  console.log(`🏢 Компаний: ${companies.length}`);
  if (companies.length > 0) {
    let totalAccounts = 0;
    let totalOperations = 0;
    let totalDeals = 0;

    companies.forEach((company, index) => {
      totalAccounts += company._count.accounts;
      totalOperations += company._count.operations;
      totalDeals += company._count.deals;

      console.log(`\n  ${index + 1}. ${company.name}`);
      console.log(`     ID: ${company.id}`);
      console.log(`     Создана: ${company.createdAt.toLocaleString('ru-RU')}`);
      console.log(`     Пользователей: ${company._count.users}`);
      console.log(`     Счетов: ${company._count.accounts}`);
      console.log(`     Операций: ${company._count.operations}`);
      console.log(`     Сделок: ${company._count.deals}`);

      if (company.users.length > 0) {
        console.log(`     Пользователи:`);
        company.users.forEach((user: any) => {
          const status = user.isActive
            ? user.isEmailVerified
              ? '✅ активен, email подтвержден'
              : '⚠️  активен, email НЕ подтвержден'
            : '❌ неактивен';
          console.log(`        - ${user.email} (${status})`);
        });
      }
    });

    console.log(`\n📈 Итого:`);
    console.log(`   Компаний: ${companies.length}`);
    console.log(`   Пользователей: ${users.length}`);
    console.log(`   Счетов: ${totalAccounts}`);
    console.log(`   Операций: ${totalOperations}`);
    console.log(`   Сделок: ${totalDeals}`);
  }

  console.log(`\n👤 Всего пользователей: ${users.length}`);
}

/**
 * Удаляет все компании (каскадно удалятся все связанные данные)
 */
async function deleteAllCompanies() {
  console.log('\n🗑️  Удаление всех компаний...\n');

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  if (companies.length === 0) {
    console.log('✅ Компаний для удаления не найдено');
    return 0;
  }

  let deletedCount = 0;
  let errorCount = 0;

  for (const company of companies) {
    try {
      await prisma.company.delete({
        where: { id: company.id },
      });
      deletedCount++;
      console.log(`✅ Удалена компания: ${company.name}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Ошибка при удалении компании ${company.name}:`, error);
    }
  }

  console.log(`\n✅ Удалено компаний: ${deletedCount}`);
  if (errorCount > 0) {
    console.log(`❌ Ошибок: ${errorCount}`);
  }

  return deletedCount;
}

/**
 * Удаляет всех пользователей
 */
async function deleteAllUsers() {
  console.log('\n🗑️  Удаление всех пользователей...\n');

  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    console.log('✅ Пользователей для удаления не найдено');
    return 0;
  }

  let deletedCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      await prisma.user.delete({
        where: { id: user.id },
      });
      deletedCount++;
      console.log(`✅ Удален пользователь: ${user.email}`);
    } catch (error) {
      errorCount++;
      console.error(
        `❌ Ошибка при удалении пользователя ${user.email}:`,
        error
      );
    }
  }

  console.log(`\n✅ Удалено пользователей: ${deletedCount}`);
  if (errorCount > 0) {
    console.log(`❌ Ошибок: ${errorCount}`);
  }

  return deletedCount;
}

/**
 * Запрашивает подтверждение у пользователя
 */
function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Основная функция
 */
async function cleanupTestData() {
  try {
    console.log('🧹 Очистка всех данных из базы\n');
    console.log(
      '⚠️  ВНИМАНИЕ: Эта операция удалит ВСЕ компании и ВСЕХ пользователей!'
    );
    console.log('⚠️  ВНИМАНИЕ: Операция необратима!\n');

    // Получаем все данные
    const companies = await getAllCompanies();
    const users = await getAllUsers();

    if (companies.length === 0 && users.length === 0) {
      console.log('✅ База данных уже пустая!');
      return;
    }

    // Показываем статистику
    showStats(companies, users);

    // Предупреждение о бэкапе
    console.log(
      '\n⚠️  ВАЖНО: Убедитесь, что у вас есть свежий бэкап базы данных!'
    );
    console.log('   Рекомендуется выполнить: ./scripts/backup-db.sh\n');

    // Запрашиваем подтверждение
    const confirmed = await askConfirmation(
      'Вы уверены, что хотите удалить ВСЕ компании и ВСЕХ пользователей?'
    );

    if (!confirmed) {
      console.log('\n❌ Операция отменена');
      return;
    }

    // Удаляем все компании (каскадно удалятся все связанные данные)
    const deletedCompanies = await deleteAllCompanies();

    // Удаляем оставшихся пользователей (если есть)
    const deletedUsers = await deleteAllUsers();

    console.log('\n✅ Очистка завершена успешно!');
    console.log(`   Удалено компаний: ${deletedCompanies}`);
    console.log(`   Удалено пользователей: ${deletedUsers}`);
  } catch (error) {
    console.error('\n❌ Ошибка при очистке данных:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
if (require.main === module) {
  cleanupTestData()
    .then(() => {
      console.log('\n✅ Скрипт завершен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Скрипт завершился с ошибкой:', error);
      process.exit(1);
    });
}

export { cleanupTestData };
