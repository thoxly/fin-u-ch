// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Determine project root: go up from apps/api/src to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// From apps/api/src/server.ts -> apps/api/src -> apps/api -> apps -> root
const projectRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.resolve(projectRoot, '.env') });

import app from './app';
import { env } from './config/env';
import logger from './config/logger';
import prisma from './config/db';
import redis from './config/redis';
import demoUserService from './modules/demo/demo.service';
import { execSync } from 'child_process';

const PORT = env.PORT;

<<<<<<< HEAD
// Применяем миграции перед запуском сервера
async function applyMigrations() {
=======
const server = app.listen(PORT, async () => {
  logger.info(`API server running on port ${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);

  // Автоматически создаем демо-пользователя при первом запуске
>>>>>>> 1af8208
  try {
    logger.info('Applying database migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: path.resolve(apiRoot),
    });
    logger.info('Database migrations applied successfully');
  } catch (error) {
    logger.error('Failed to apply database migrations:', error);
    // В production не продолжаем без миграций
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

// Функция запуска сервера
async function startServer() {
  // Применяем миграции перед запуском
  await applyMigrations();

  const server = app.listen(PORT, HOST, async () => {
    logger.info(`API server running on ${HOST}:${PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Health check: http://localhost:${PORT}/api/health`);

    // Автоматически создаем демо-пользователя при первом запуске
    // Автоматически создаем демо-пользователя при первом запуске
    // DEPRECATED: We are moving to dynamic demo users
    /*
    try {
      const exists = await demoUserService.exists();
      if (!exists) {
        logger.info('Demo user not found, creating...');
        // const demoUser = await demoUserService.create();
        // logger.info(`Demo user created: ${demoUser.user.email}`);
      } else {
        logger.info('Demo user already exists');
      }
    } catch (error) {
      logger.error('Failed to setup demo user:', error);
    }
    */
  });

  return server;
}

// Запускаем сервер
const server = await startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    await redis.quit();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    await redis.quit();
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});
