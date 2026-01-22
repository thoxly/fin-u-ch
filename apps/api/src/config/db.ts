import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger';
import { dbPoolSizeGauge } from './metrics';

// Determine project root (works in ESM and CJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Path: apps/api/src/config -> apps/api/src -> apps/api -> ../../..
const projectRoot = path.resolve(__dirname, '../..');

// Load .env before initializing Prisma
dotenv.config({ path: path.resolve(projectRoot, '.env') });

// Configure connection pooling parameters
const databaseUrl = process.env.DATABASE_URL || '';
// Увеличено с 20 до 50 для поддержки высокой нагрузки (1000+ одновременных пользователей)
const connectionLimit = parseInt(
  process.env.DATABASE_CONNECTION_LIMIT || '50',
  10
);
// Увеличено с 10 до 30 секунд для больших транзакций
const poolTimeout = parseInt(process.env.DATABASE_POOL_TIMEOUT || '30', 10);

// Add connection pool parameters to DATABASE_URL if not already present
let databaseUrlWithPool = databaseUrl;
if (databaseUrl && !databaseUrl.includes('connection_limit')) {
  const separator = databaseUrl.includes('?') ? '&' : '?';
  databaseUrlWithPool = `${databaseUrl}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrlWithPool,
    },
  },
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

// Мониторинг connection pool (периодически проверяем статус)
if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    try {
      // Prisma не предоставляет прямой доступ к пулу, но мы можем отслеживать через метрики
      // В реальности нужно использовать pg-pool или другой способ для мониторинга
      // Здесь мы просто логируем, что пул активен
      const connectionLimit = parseInt(
        process.env.DATABASE_CONNECTION_LIMIT || '50',
        10
      );
      // Устанавливаем метрику (в реальности нужно получать реальные значения из пула)
      dbPoolSizeGauge.set({ state: 'configured' }, connectionLimit);
    } catch (error) {
      logger.error('Error monitoring connection pool', error);
    }
  }, 30000); // Каждые 30 секунд
}

export default prisma;
