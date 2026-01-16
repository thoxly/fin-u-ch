import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import logger from './logger';

// Determine project root. Use __dirname (CommonJS/Jest). Avoid import.meta to
// stay compatible with TypeScript compilation settings used in tests.
// Path: apps/api/src/config -> apps/api/src -> apps/api -> ../../..
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
