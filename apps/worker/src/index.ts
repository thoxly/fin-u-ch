import cron from 'node-cron';
import { logger } from './config/logger';
import { env } from './config/env';
import {
  generateSalaryOperations,
  getCurrentMonth,
} from './jobs/salary.generate.monthly';
import { generateRecurringOperations } from './jobs/operations.generate.recurring';
import { prisma } from './config/prisma';

logger.info('🚀 Worker starting...');
logger.info(`Environment: ${env.NODE_ENV}`);

/**
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

// Функция для ручного запуска задачи (для тестирования)
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

// Функция для ручного запуска генерации периодических операций (для тестирования)
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

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  // Останавливаем cron задачи
  salaryGenerationTask.stop();
  recurringOperationsTask.stop();

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
    logger.info('👷 Worker is running and waiting for scheduled tasks...');
  })
  .catch((error: unknown) => {
    logger.error('❌ Failed to connect to database:', error);
    process.exit(1);
  });

// Keep the process alive
process.stdin.resume();
