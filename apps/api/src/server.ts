// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
