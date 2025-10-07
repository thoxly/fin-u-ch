import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

// Log Prisma warnings and errors
prisma.$on('warn' as never, (e: any) => {
  logger.warn('Prisma warning:', e);
});

prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma error:', e);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing Prisma connection...');
  await prisma.$disconnect();
  process.exit(0);
});

