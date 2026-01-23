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
import { Server } from 'http';

const PORT = env.PORT;
// Use 0.0.0.0 for Docker (allows container access), 127.0.0.1 for local dev
const HOST =
  process.env.HOST ||
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

// Применяем миграции перед запуском сервера
async function applyMigrations() {
  try {
    logger.info('Applying database migrations...');
    // Use the script that loads .env variables
    execSync('node ../../scripts/run-prisma-with-env.js migrate deploy', {
      stdio: 'inherit',
      cwd: path.resolve(apiRoot),
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
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

// Проверка подключения к базе данных
async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    logger.info('Database connection established');
    return true;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    if (env.NODE_ENV === 'production') {
      logger.error('Database connection is required in production');
      process.exit(1);
    }
    return false;
  }
}

// Функция запуска сервера
async function startServer(): Promise<Server> {
  try {
    // Проверяем подключение к базе данных
    await checkDatabaseConnection();

    // Применяем миграции перед запуском
    await applyMigrations();

    const server: Server = app.listen(PORT, HOST, async () => {
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

    // Обработка ошибок при запуске сервера
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error:', error);
        process.exit(1);
      }
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Запускаем сервер
let server: Server;
try {
  server = await startServer();
} catch (error) {
  logger.error('Critical error during server startup:', error);
  process.exit(1);
}

// Graceful shutdown
import { shutdownTracing } from './config/tracing';

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);

  // Stop accepting new connections
  server.close(async () => {
    try {
      // Shutdown tracing
      await shutdownTracing();

      // Disconnect from database
      await prisma.$disconnect();
      logger.info('Database disconnected');

      // Disconnect from Redis
      try {
        await redis.quit();
        logger.info('Redis disconnected');
      } catch (error) {
        logger.warn('Error disconnecting Redis:', error);
      }

      logger.info('Server closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // Don't exit immediately, let the server try to handle it
  // Only exit if it's a critical error
  if (err instanceof Error && err.message.includes('ECONNREFUSED')) {
    logger.error('Critical connection error, shutting down');
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
