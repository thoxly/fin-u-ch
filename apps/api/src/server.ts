// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Determine project root: go up from apps/api/src to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// From apps/api/src/server.ts -> apps/api/src -> apps/api -> apps -> root
const projectRoot = path.resolve(__dirname, '../../..');
const apiRoot = path.resolve(__dirname, '../..');

// Load .env - try root first, then fallback to apps/api
const rootEnvPath = path.resolve(projectRoot, '.env');
const apiEnvPath = path.resolve(apiRoot, '.env');
dotenv.config({ path: rootEnvPath });
// If DATABASE_URL is still not set, try loading from apps/api
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: apiEnvPath });
}

import app from './app';
import { env } from './config/env';
import logger from './config/logger';
import prisma from './config/db';
import redis from './config/redis';
import demoUserService from './modules/demo/demo.service';

const PORT = env.PORT;

const server = app.listen(PORT, async () => {
  logger.info(`API server running on port ${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);

  // Автоматически создаем демо-пользователя при первом запуске
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
});

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
