import cron from 'node-cron';
import express from 'express';
import { logger } from './config/logger';
import { env } from './config/env';
import { generateRecurringOperations } from './jobs/operations.generate.recurring';
import { cleanupExpiredDemoUsers } from './jobs/cleanup-demo-users.job';
import { prisma } from './config/prisma';
import { register } from './config/metrics';
// import { jobCounter, jobDuration, jobLastSuccess } from './config/metrics'; // Reserved for future use

logger.info('🚀 Worker starting...');
logger.info(`Environment: ${env.NODE_ENV}`);

// HTTP server for metrics and health checks
const metricsPort = parseInt(process.env.WORKER_METRICS_PORT || '4001', 10);
const app = express();

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).end();
  }
});

// Start HTTP server
const server = app.listen(metricsPort, () => {
  logger.info(`📊 Metrics server listening on port ${metricsPort}`);
  logger.info(`  - Health: http://localhost:${metricsPort}/health`);
  logger.info(`  - Metrics: http://localhost:${metricsPort}/metrics`);
});

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
      // Metrics are already recorded in the job function
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

    try {
      const deletedCount = await cleanupExpiredDemoUsers(24); // Удаляем аккаунты старше 24 часов
      if (deletedCount > 0) {
        logger.info(`✅ Cleanup completed. Deleted ${deletedCount} users.`);
      } else {
        logger.info('✅ Cleanup check completed. No expired users found.');
      }
    } catch (error) {
      logger.error('❌ Demo user cleanup task failed:', error);
      // Metrics are already recorded in the job function
    }
  },
  {
    scheduled: true,
    timezone: 'Europe/Moscow',
  }
);

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
  recurringOperationsTask.stop();
  cleanupDemoUsersTask.stop();

  // Закрываем HTTP сервер
  server.close(() => {
    logger.info('Metrics server closed');
  });

  // Закрываем подключение к БД
  await prisma.$disconnect();

  logger.info('Worker shut down complete');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Обработка необработанных исключений
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

logger.info('✅ Worker started successfully');
logger.info('📋 Active tasks:');
logger.info('  - Recurring operations: Daily at 00:01');
logger.info('  - Demo user cleanup: Hourly at :15');

// CLI support
const args = process.argv.slice(2);
const command = args[0];

if (command === 'run-recurring-now') {
  logger.info('🔧 Running recurring operations manually...');
  runRecurringOperationsManually()
    .then(() => {
      logger.info('✅ Manual execution completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Manual execution failed:', error);
      process.exit(1);
    });
}
