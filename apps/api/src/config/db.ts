import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from './logger';

// Determine project root: go up from apps/api/src/config to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// From apps/api/src/config/db.ts -> apps/api/src/config -> apps/api/src -> apps/api -> apps -> root
const projectRoot = path.resolve(__dirname, '../../../..'); // up to monorepo root
const apiRoot = path.resolve(__dirname, '..'); // apps/api

// Load .env before initializing Prisma
// Try root first, then fallback to apps/api
const rootEnvPath = path.resolve(projectRoot, '.env');
const apiEnvPath = path.resolve(apiRoot, '.env');
dotenv.config({ path: rootEnvPath });
// If DATABASE_URL is still not set, try loading from apps/api
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: apiEnvPath });
}

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
