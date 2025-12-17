import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import logger from './logger';

// Determine project root: go up from apps/api/src/config to apps/api, then to root
// From apps/api/src/config -> apps/api/src -> apps/api -> root
const projectRoot = path.resolve(__dirname, '../..');

// Load .env before initializing Prisma
dotenv.config({ path: path.resolve(projectRoot, '.env') });

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma.$on('query', (e: any) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

export default prisma;
