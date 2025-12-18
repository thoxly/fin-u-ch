import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from './logger';

// Determine project root: go up from apps/api/src/config to apps/api, then to root
// From apps/api/src/config -> apps/api/src -> apps/api -> root
//
// For Jest tests, __dirname is available (CommonJS mode in tests)
// For production, use import.meta.url (ES modules)
let projectRoot: string;
if (typeof __dirname !== 'undefined') {
  // Jest / CommonJS environment
  projectRoot = path.resolve(__dirname, '../..');
} else {
  // ES modules environment (production)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  projectRoot = path.resolve(__dirname, '../..');
}

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
