// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialize OpenTelemetry tracing BEFORE any other imports
// This ensures all modules are instrumented
import { initializeTracing } from './config/tracing';
initializeTracing();

// Determine project root: go up from apps/api/src to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = path.resolve(__dirname, '../../../..'); // -> apps/api/src -> apps/api -> apps -> root
const apiRoot = path.resolve(__dirname, '..'); // -> apps/api

const rootEnvPath = path.resolve(projectRoot, '.env');
const apiEnvPath = path.resolve(apiRoot, '.env');

// Load .env with override to ensure latest values are used
const rootResult = dotenv.config({ path: rootEnvPath, override: true });
if (rootResult.error) {
  console.warn(`Failed to load .env from root: ${rootResult.error.message}`);
}

if (!process.env.DATABASE_URL) {
  const apiResult = dotenv.config({ path: apiEnvPath, override: true });
  if (apiResult.error) {
    console.warn(
      `Failed to load .env from apps/api: ${apiResult.error.message}`
    );
  }
}

import app from './app';
import { env } from './config/env';
import logger from './config/logger';
import prisma from './config/db';
import redis from './config/redis';
// import demoUserService from './modules/demo/demo.service'; // Reserved for future use
import { execSync } from 'child_process';

const PORT = env.PORT;
// Use 0.0.0.0 for Docker (allows container access), 127.0.0.1 for local dev
const HOST =
  process.env.HOST ||
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

// Применяем миграции перед запуском сервера
async function applyMigrations() {
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
    // DEPRECATED: We are moving to dynamic demo users
    /*
    try {
      const exists = await demoUserService.exists();
      if (!exists) {
        logger.info('Demo user not found, creating...');
        const demoUser = await demoUserService.create();
        logger.info(`Demo user created: ${demoUser.user.email}`);
        logger.info(
          `Demo data: ${demoUser.operationsCount} operations, ${demoUser.accountsCount} accounts`
        );
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
import { shutdownTracing } from './config/tracing';

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await shutdownTracing();
    await prisma.$disconnect();
    await redis.quit();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await shutdownTracing();
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
