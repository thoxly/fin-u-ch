// apps/worker/src/index.ts
import cron from 'node-cron';
import { logger } from './config/logger';
import { env } from './config/env';
import {
  generateSalaryOperations,
  getCurrentMonth,
} from './jobs/salary.generate.monthly';
import { generateRecurringOperations } from './jobs/operations.generate.recurring';
import { generateOzonOperations } from './jobs/ozon.generate.operations';
import { prisma } from './config/prisma';

logger.info('🚀 Worker starting...');
logger.info(`Environment: ${env.NODE_ENV}`);

/**
 * Задача генерации зарплатных операций
 * Запускается каждое 1-е число месяца в 00:00
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
    timezone: 'Europe/Moscow',
  }
);

/**
 * Задача генерации периодических операций
 * Запускается каждый день в 00:01
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

/**
 * Задача генерации операций из Ozon за прошлую неделю
 * Запускается каждый день в 09:00 (можно изменить на нужное время)
 */
const ozonOperationsTask = cron.schedule(
  '0 9 * * *', // Каждый день в 09:00
  async () => {
    logger.info(
      '🔄 Running scheduled Ozon operations generation task for last week...'
    );

    try {
      const result = await generateOzonOperations();
      logger.info(
        `✅ Ozon operations generation completed: ${result.created} operations created`
      );

      if (result.errors.length > 0) {
        logger.warn(
          `⚠️  Some Ozon operations failed: ${result.errors.length} errors`
        );
      }
    } catch (error) {
      logger.error('❌ Ozon operations generation task failed:', error);
    }
  },
  {
    scheduled: true,
    timezone: 'Europe/Moscow',
  }
);

// Функции для ручного запуска задач
export async function runSalaryGenerationManually(
  month?: string
): Promise<void> {
  logger.info('🔧 Manual salary generation triggered');

  try {
    const targetMonth = month || getCurrentMonth();
    await generateSalaryOperations({ month: targetMonth });
    logger.info('✅ Manual salary generation completed successfully');
  } catch (error) {
    logger.error('❌ Manual salary generation failed:', error);
    throw error;
  }
}

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

export async function runOzonOperationsManually(
  testIntegrationId?: string
): Promise<{ created: number; errors: string[] }> {
  logger.info('🔧 Manual Ozon operations generation triggered');

  try {
    const result = await generateOzonOperations({ testIntegrationId });
    logger.info('✅ Manual Ozon operations generation completed successfully');
    return result;
  } catch (error) {
    logger.error('❌ Manual Ozon operations generation failed:', error);
    throw error;
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

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  // Останавливаем cron задачи
  salaryGenerationTask.stop();
  recurringOperationsTask.stop();
  ozonOperationsTask.stop();

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
    logger.info(
      '✅ Salary generation task scheduled (runs on 1st of each month at 00:00)'
    );
    logger.info('✅ Recurring operations task scheduled (runs daily at 00:01)');
    logger.info(
      '✅ Ozon operations task scheduled (runs daily at 09:00 for last week)'
    );
    logger.info('👷 Worker is running and waiting for scheduled tasks...');
  })
  .catch((error: unknown) => {
    logger.error('❌ Failed to connect to database:', error);
    process.exit(1);
  });

// Keep the process alive
process.stdin.resume();
