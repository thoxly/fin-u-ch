#!/usr/bin/env tsx
/* eslint-disable no-console */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Загружаем переменные окружения
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const apiRoot = path.resolve(projectRoot, 'apps/api');

// Пытаемся загрузить .env из корня проекта, затем из apps/api
dotenv.config({ path: path.resolve(projectRoot, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(apiRoot, '.env') });
}

const prisma = new PrismaClient();

/**
 * Создает интерфейс для чтения из командной строки
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Запрашивает подтверждение у пользователя
 */
function askConfirmation(question: string): Promise<boolean> {
  // Если установлена переменная окружения AUTO_CONFIRM=yes, автоматически подтверждаем
  if (process.env.AUTO_CONFIRM === 'yes') {
    console.log(`${question} (yes/no): yes (auto-confirmed)`);
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const rl = createReadlineInterface();
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Безопасно получает количество записей, игнорируя ошибки отсутствующих таблиц
 */
async function safeCount(model: any): Promise<number> {
  try {
    return await model.count();
  } catch (error: any) {
    if (error.code === 'P2021') {
      // Таблица не существует
      return 0;
    }
    throw error;
  }
}

/**
 * Безопасно удаляет записи, игнорируя ошибки отсутствующих таблиц
 */
async function safeDeleteMany(
  model: any,
  label: string
): Promise<{ count: number }> {
  try {
    const result = await model.deleteMany({});
    console.log(`   ✓ Удалено ${label}: ${result.count}`);
    return result;
  } catch (error: any) {
    if (error.code === 'P2021') {
      // Таблица не существует
      console.log(`   ⚠ Пропущено ${label}: таблица не существует`);
      return { count: 0 };
    }
    throw error;
  }
}

/**
 * Получает статистику по базе данных
 */
async function getStatistics() {
  const [
    usersCount,
    companiesCount,
    operationsCount,
    accountsCount,
    articlesCount,
    counterpartiesCount,
    dealsCount,
    departmentsCount,
    salariesCount,
    budgetsCount,
    rolesCount,
    auditLogsCount,
    importSessionsCount,
    importedOperationsCount,
    mappingRulesCount,
    integrationsCount,
    planItemsCount,
    subscriptionsCount,
  ] = await Promise.all([
    safeCount(prisma.user),
    safeCount(prisma.company),
    safeCount(prisma.operation),
    safeCount(prisma.account),
    safeCount(prisma.article),
    safeCount(prisma.counterparty),
    safeCount(prisma.deal),
    safeCount(prisma.department),
    safeCount(prisma.budget),
    safeCount(prisma.role),
    safeCount(prisma.auditLog),
    safeCount(prisma.importSession),
    safeCount(prisma.importedOperation),
    safeCount(prisma.mappingRule),
    safeCount(prisma.integration),
    safeCount(prisma.planItem),
    safeCount(prisma.subscription),
  ]);

  return {
    usersCount,
    companiesCount,
    operationsCount,
    accountsCount,
    articlesCount,
    counterpartiesCount,
    dealsCount,
    departmentsCount,
    salariesCount,
    budgetsCount,
    rolesCount,
    auditLogsCount,
    importSessionsCount,
    importedOperationsCount,
    mappingRulesCount,
    integrationsCount,
    planItemsCount,
    subscriptionsCount,
  };
}

/**
 * Выводит статистику на экран
 */
function printStatistics(stats: Awaited<ReturnType<typeof getStatistics>>) {
  console.log('\n📊 Текущая статистика базы данных:');
  console.log('═'.repeat(50));
  console.log(`👤 Пользователи:           ${stats.usersCount}`);
  console.log(`🏢 Компании:                ${stats.companiesCount}`);
  console.log(`💰 Операции:                ${stats.operationsCount}`);
  console.log(`💳 Счета:                   ${stats.accountsCount}`);
  console.log(`📝 Статьи:                  ${stats.articlesCount}`);
  console.log(`🤝 Контрагенты:             ${stats.counterpartiesCount}`);
  console.log(`📋 Сделки:                  ${stats.dealsCount}`);
  console.log(`🏛️  Подразделения:          ${stats.departmentsCount}`);
  console.log(`💵 Зарплаты:                ${stats.salariesCount}`);
  console.log(`📊 Бюджеты:                 ${stats.budgetsCount}`);
  console.log(`🔐 Роли:                    ${stats.rolesCount}`);
  console.log(`📜 Логи аудита:             ${stats.auditLogsCount}`);
  console.log(`📥 Сессии импорта:          ${stats.importSessionsCount}`);
  console.log(`📥 Импортированные операции: ${stats.importedOperationsCount}`);
  console.log(`🔧 Правила маппинга:        ${stats.mappingRulesCount}`);
  console.log(`🔌 Интеграции:              ${stats.integrationsCount}`);
  console.log(`📅 Плановые операции:       ${stats.planItemsCount}`);
  console.log(`💳 Подписки:                ${stats.subscriptionsCount}`);
  console.log('═'.repeat(50));
}

/**
 * Удаляет всех пользователей и все связанные данные
 */
async function deleteAllUsers(): Promise<void> {
  console.log(
    '\n🗑️  Начинаем удаление всех пользователей и связанных данных...\n'
  );

  // Удаляем все данные в правильном порядке (сначала зависимые, потом основные)
  // Не используем транзакцию, чтобы ошибки в одной таблице не прерывали удаление из других

  // 1. Удаляем импортированные операции
  await safeDeleteMany(prisma.importedOperation, 'импортированных операций');

  // 2. Удаляем сессии импорта
  await safeDeleteMany(prisma.importSession, 'сессий импорта');

  // 3. Удаляем правила маппинга
  await safeDeleteMany(prisma.mappingRule, 'правил маппинга');

  // 4. Удаляем плановые операции
  await safeDeleteMany(prisma.planItem, 'плановых операций');

  // 5. Удаляем бюджеты
  await safeDeleteMany(prisma.budget, 'бюджетов');

  // 6. Удаляем операции
  await safeDeleteMany(prisma.operation, 'операций');

  // 8. Удаляем интеграции
  await safeDeleteMany(prisma.integration, 'интеграций');

  // 9. Удаляем подписки
  await safeDeleteMany(prisma.subscription, 'подписок');

  // 10. Удаляем роли (сначала связи пользователей с ролями)
  await safeDeleteMany(prisma.userRole, 'связей пользователей с ролями');
  await safeDeleteMany(prisma.rolePermission, 'разрешений ролей');
  await safeDeleteMany(prisma.role, 'ролей');

  // 11. Удаляем логи аудита
  await safeDeleteMany(prisma.auditLog, 'логов аудита');

  // 12. Удаляем токены email
  await safeDeleteMany(prisma.emailToken, 'email токенов');

  // 13. Удаляем сделки
  await safeDeleteMany(prisma.deal, 'сделок');

  // 14. Удаляем подразделения
  await safeDeleteMany(prisma.department, 'подразделений');

  // 15. Удаляем контрагентов
  await safeDeleteMany(prisma.counterparty, 'контрагентов');

  // 16. Удаляем статьи
  await safeDeleteMany(prisma.article, 'статей');

  // 17. Удаляем счета
  await safeDeleteMany(prisma.account, 'счетов');

  // 18. Удаляем пользователей
  await safeDeleteMany(prisma.user, 'пользователей');

  // 19. Удаляем компании (последними, так как они связаны с пользователями)
  await safeDeleteMany(prisma.company, 'компаний');

  console.log('\n✅ Все данные успешно удалены!');
}

/**
 * Главная функция
 */
async function main() {
  try {
    console.log(
      '⚠️  ВНИМАНИЕ: Этот скрипт удалит ВСЕХ пользователей и ВСЕ связанные данные!'
    );
    console.log('   Это необратимая операция!\n');

    // Получаем и показываем статистику
    const stats = await getStatistics();
    printStatistics(stats);

    // Проверяем, есть ли что удалять
    if (stats.usersCount === 0) {
      console.log('\n✅ В базе данных нет пользователей. Нечего удалять.');
      return;
    }

    // Запрашиваем подтверждение
    console.log(
      '\n⚠️  ВЫ УВЕРЕНЫ, ЧТО ХОТИТЕ УДАЛИТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ И ВСЕ ДАННЫЕ?'
    );
    const confirmed = await askConfirmation('Введите "yes" для подтверждения');

    if (!confirmed) {
      console.log('\n❌ Операция отменена.');
      return;
    }

    // Двойное подтверждение
    console.log('\n⚠️  ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ!');
    const doubleConfirmed = await askConfirmation(
      'Вы действительно хотите удалить ВСЕ данные? Введите "yes" еще раз'
    );

    if (!doubleConfirmed) {
      console.log('\n❌ Операция отменена.');
      return;
    }

    // Выполняем удаление
    await deleteAllUsers();

    // Показываем финальную статистику
    console.log('\n📊 Финальная статистика:');
    const finalStats = await getStatistics();
    printStatistics(finalStats);
  } catch (error) {
    console.error('\n❌ Ошибка при удалении данных:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main()
    .then(() => {
      console.log('\n✅ Скрипт завершен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Скрипт завершился с ошибкой:', error);
      process.exit(1);
    });
}

export { deleteAllUsers, getStatistics };
