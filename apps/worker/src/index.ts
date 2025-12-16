import cron from 'node-cron';
import { logger } from './config/logger';
import { env } from './config/env';
import { generateRecurringOperations } from './jobs/operations.generate.recurring';
<<<<<<< HEAD
import {
  generateOzonOperations,
  shouldRunOzonTaskToday,
  getNextRunInfo,
  ozonOperationService,
} from './jobs/ozon.generate.operations';
import { cleanupExpiredDemoUsers } from './jobs/cleanup-demo-users.job';
=======
>>>>>>> 1af8208
import { prisma } from './config/prisma';

logger.info('🚀 Worker starting...');
logger.info(`Environment: ${env.NODE_ENV}`);

/**
<<<<<<< HEAD
=======
 * Задача генерации зарплатных операций
 * Запускается каждое 1-е число месяца в 00:00
 * Cron pattern: '0 0 1 * *' (минута час день месяц день_недели)
 */
const salaryGenerationTask = cron.schedule(
  '0 0 1 * *',
  async () => {
    logger.info('🔄 Running scheduled salary generation task...');

    try {
      const currentMonth = getCurrentMonth();
      await generateSalaryOperations({ month: currentMonth });
      logger.info('✅ Salary generation task completed successfully');
    } catch (error) {
      logger.error('❌ Salary generation task failed:', error);
    }
  },
  {
    scheduled: true,
    timezone: 'Europe/Moscow', // Можно изменить на нужную таймзону
  }
);

/**
>>>>>>> 1af8208
 * Задача генерации периодических операций
 * Запускается каждый день в 00:01
 * Cron pattern: '1 0 * * *' (минута час день месяц день_недели)
 */
const recurringOperationsTask = cron.schedule(
  '1 0 * * *',
  async () => {
    logger.info('🔄 Running scheduled recurring operations generation task...');

    try {
      await generateRecurringOperations();
      logger.info(
        '✅ Recurring operations generation task completed successfully'
      );
    } catch (error) {
      logger.error('❌ Recurring operations generation task failed:', error);
    }
  },
  {
    scheduled: true,
    timezone: 'Europe/Moscow',
  }
);

<<<<<<< HEAD
const ozonOperationsTask = cron.schedule(
  '1 0 * * *',
  async () => {
    const startTime = new Date();

    try {
      const today = new Date();
      const weekdayNames = [
        'воскресенье',
        'понедельник',
        'вторник',
        'среда',
        'четверг',
        'пятница',
        'суббота',
      ];
      const todayName = weekdayNames[today.getDay()];

      if (!shouldRunOzonTaskToday()) {
        return;
      }

      const result = await generateOzonOperations();

      const endTime = new Date();
      const duration = (
        (endTime.getTime() - startTime.getTime()) /
        1000
      ).toFixed(2);

      logger.info('📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ ГЕНЕРАЦИИ ОПЕРАЦИЙ OZON');

      logger.info(`✅ Успешно создано операций: ${result.created}`);
      logger.info(`❌ Количество ошибок: ${result.errors.length}`);

      if (result.created > 0) {
        logger.info(
          `🎉 УСПЕХ! Создано ${result.created} операций через интеграцию Ozon!`
        );
      } else {
        logger.info(
          `ℹ️  Операции не были созданы (возможно, нет данных или payment >= 0)`
        );
      }

      if (result.errors.length > 0) {
        logger.warn('');
        logger.warn('⚠️  ОШИБКИ ПРИ СОЗДАНИИ ОПЕРАЦИЙ:');
        result.errors.forEach((error, index) => {
          logger.warn(`   ${index + 1}. ${error}`);
        });
      }
    } catch (error) {
      const endTime = new Date();
      const duration = (
        (endTime.getTime() - startTime.getTime()) /
        1000
      ).toFixed(2);
      logger.error(`⏱️  Время до ошибки: ${duration} сек`);
      logger.error('Ошибка:', error);
    }
  },
  {
    scheduled: true,
    timezone: 'Europe/Moscow',
  }
);

/**
 * Задача очистки старых демо-пользователей
 * Запускается каждый час в 15 минут
 */
const cleanupDemoUsersTask = cron.schedule(
  '15 * * * *',
  async () => {
    logger.info('🔄 Running scheduled demo user cleanup task...');
=======
// Функция для ручного запуска задачи (для тестирования)
export async function runSalaryGenerationManually(
  month?: string
): Promise<void> {
  logger.info('🔧 Manual salary generation triggered');
>>>>>>> 1af8208

    try {
      const deletedCount = await cleanupExpiredDemoUsers(24); // Удаляем аккаунты старше 24 часов
      if (deletedCount > 0) {
        logger.info(`✅ Cleanup completed. Deleted ${deletedCount} users.`);
      } else {
        logger.info('✅ Cleanup check completed. No expired users found.');
      }
    } catch (error) {
      logger.error('❌ Demo user cleanup task failed:', error);
    }
  },
  {
    scheduled: true,
    timezone: 'Europe/Moscow',
  }
);

<<<<<<< HEAD
// Функции для ручного запуска задач
=======
// Функция для ручного запуска генерации периодических операций (для тестирования)
>>>>>>> 1af8208
export async function runRecurringOperationsManually(
  targetDate?: Date
): Promise<void> {
  logger.info('🔧 Manual recurring operations generation triggered');

  try {
    await generateRecurringOperations({ targetDate });
    logger.info(
      '✅ Manual recurring operations generation completed successfully'
    );
  } catch (error) {
    logger.error('❌ Manual recurring operations generation failed:', error);
    throw error;
  }
}

<<<<<<< HEAD
export async function runOzonOperationsManually(
  testIntegrationId?: string
): Promise<{ created: number; errors: string[] }> {
  logger.info('🔧 Manual Ozon operations generation triggered');

  try {
    // Проверяем доступность API
    const isHealthy = await ozonOperationService.healthCheck();
    if (!isHealthy) {
      throw new Error('API is not available for manual Ozon operations');
    }

    const result = await generateOzonOperations({ testIntegrationId });
    logger.info('✅ Manual Ozon operations generation completed successfully');
    return result;
  } catch (error) {
    logger.error('❌ Manual Ozon operations generation failed:', error);
    throw error;
  }
}

/**
 * Функция для проверки статуса Ozon интеграций
 */
export async function checkOzonStatus() {
  try {
    logger.info('🔍 Checking Ozon integrations status');

    const status = await ozonOperationService.getOperationsStatus();
    const health = await ozonOperationService.healthCheck();

    return {
      apiHealth: health ? 'healthy' : 'unhealthy',
      status,
      nextRun: getNextRunInfo(),
    };
  } catch (error: any) {
    logger.error('❌ Failed to check Ozon status:', error);
    return {
      apiHealth: 'unhealthy',
      error: error.message,
    };
  }
}

// Команда для запуска через командную строку
if (process.argv[2] === 'run-ozon-test') {
  const integrationId = process.argv[3];

  if (!integrationId) {
    console.error(
      '❌ Не указан ID интеграции. Использование: npm run worker:ozon-test <integration-id>'
    );
    process.exit(1);
  }

  runOzonOperationsManually(integrationId)
    .then((result) => {
      console.log(
        `✅ Тест Ozon операций завершен. Создано: ${result.created}, Ошибок: ${result.errors.length}`
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка при тестировании Ozon операций:', error);
      process.exit(1);
    });
}

// Команда для немедленного запуска задачи Ozon (для всех интеграций)
if (process.argv[2] === 'run-ozon-now') {
  logger.info('═══════════════════════════════════════════════════════');
  logger.info('🚀 РУЧНОЙ ЗАПУСК ЗАДАЧИ OZON');
  logger.info('═══════════════════════════════════════════════════════');

  prisma
    .$connect()
    .then(async () => {
      logger.info('✅ Подключение к БД установлено');

      try {
        const result = await generateOzonOperations();

        logger.info('═══════════════════════════════════════════════════════');
        logger.info('📊 РЕЗУЛЬТАТЫ РУЧНОГО ЗАПУСКА');
        logger.info('═══════════════════════════════════════════════════════');
        logger.info(`✅ Создано операций: ${result.created}`);
        logger.info(`❌ Ошибок: ${result.errors.length}`);

        if (result.errors.length > 0) {
          logger.warn('⚠️  Ошибки:');
          result.errors.forEach((error, index) => {
            logger.warn(`   ${index + 1}. ${error}`);
          });
        }

        logger.info('═══════════════════════════════════════════════════════');

        await prisma.$disconnect();
        process.exit(0);
      } catch (error: any) {
        logger.error('❌ Ошибка при выполнении задачи:', error);
        await prisma.$disconnect();
        process.exit(1);
      }
    })
    .catch((error: any) => {
      logger.error('❌ Ошибка подключения к БД:', error);
      process.exit(1);
    });
}

// Команда для проверки статуса
if (process.argv[2] === 'check-ozon-status') {
  checkOzonStatus()
    .then((status) => {
      console.log('📊 Ozon Status:', JSON.stringify(status, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка при проверке статуса:', error);
      process.exit(1);
    });
}

// Команда для немедленного запуска генерации повторяющихся операций
if (process.argv[2] === 'run-recurring-now') {
  logger.info('═══════════════════════════════════════════════════════');
  logger.info('🚀 РУЧНОЙ ЗАПУСК ЗАДАЧИ ГЕНЕРАЦИИ ПОВТОРЯЮЩИХСЯ ОПЕРАЦИЙ');
  logger.info('═══════════════════════════════════════════════════════');

  prisma
    .$connect()
    .then(async () => {
      logger.info('✅ Подключение к БД установлено');

      try {
        await generateRecurringOperations();

        logger.info('═══════════════════════════════════════════════════════');
        logger.info('📊 РЕЗУЛЬТАТЫ РУЧНОГО ЗАПУСКА');
        logger.info('═══════════════════════════════════════════════════════');
        logger.info('✅ Генерация повторяющихся операций завершена успешно');
        logger.info('═══════════════════════════════════════════════════════');

        await prisma.$disconnect();
        process.exit(0);
      } catch (error: any) {
        logger.error('❌ Ошибка при выполнении задачи:', error);
        await prisma.$disconnect();
        process.exit(1);
      }
    })
    .catch((error: any) => {
      logger.error('❌ Ошибка подключения к БД:', error);
      process.exit(1);
    });
}

=======
>>>>>>> 1af8208
// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  // Останавливаем cron задачи
  recurringOperationsTask.stop();
<<<<<<< HEAD
  ozonOperationsTask.stop();
  cleanupDemoUsersTask.stop();
=======
>>>>>>> 1af8208

  // Закрываем Prisma соединение
  await prisma.$disconnect();

  logger.info('Worker stopped');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Проверка подключения к БД
prisma
  .$connect()
  .then(() => {
    logger.info('✅ Database connection established');
<<<<<<< HEAD

    // Проверяем доступность API (не критично для работы worker)
    try {
      const apiHealth = await ozonOperationService.healthCheck();
      if (apiHealth) {
        logger.info('✅ API connection established');
      } else {
        logger.warn('⚠️  API недоступен или требует аутентификации');
        if (!env.WORKER_API_KEY) {
          logger.warn(
            '💡 Для работы через API настройте WORKER_API_KEY в .env файле'
          );
          logger.warn(
            '   Worker будет использовать прямой режим (direct) при необходимости'
          );
        }
      }
    } catch (error: any) {
      logger.warn('⚠️  API health check failed (не критично):', error.message);
      if (!env.WORKER_API_KEY) {
        logger.warn(
          '💡 Для работы через API настройте WORKER_API_KEY в .env файле'
        );
      }
    }

    logger.info('═══════════════════════════════════════════════════════');
    logger.info('✅ ВСЕ ЗАДАЧИ НАСТРОЕНЫ И ГОТОВЫ К РАБОТЕ');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('📋 Настроенные задачи:');
    logger.info('   1. ✅ Генерация периодических операций');
    logger.info('      Расписание: Каждый день в 00:01');
    logger.info('');
    logger.info('   2. ✅ Генерация операций Ozon');
=======
>>>>>>> 1af8208
    logger.info(
      '✅ Salary generation task scheduled (runs on 1st of each month at 00:00)'
    );
<<<<<<< HEAD
    logger.info(
      '      Следующий запуск: ' + nextRunDate.toLocaleString('ru-RU')
    );
    logger.info('');
    logger.info('   3. ✅ Очистка демо-пользователей');
    logger.info('      Расписание: Каждый час в 15 минут');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('👷 WORKER РАБОТАЕТ И ОЖИДАЕТ ЗАПЛАНИРОВАННЫХ ЗАДАЧ');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('');
    logger.info(
      '💡 Для просмотра логов выполнения задач следите за этой консолью'
    );
    logger.info('💡 Задачи будут выполняться автоматически по расписанию');
    logger.info('');
=======
    logger.info('✅ Recurring operations task scheduled (runs daily at 00:01)');
    logger.info('👷 Worker is running and waiting for scheduled tasks...');
>>>>>>> 1af8208
  })
  .catch((error: unknown) => {
    logger.error('❌ Failed to connect to database:', error);
    process.exit(1);
  });

// Keep the process alive
process.stdin.resume();
