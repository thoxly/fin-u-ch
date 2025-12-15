import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Determine project root: go up from apps/api/src/config to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// From apps/api/src/config/env.ts -> apps/api/src/config -> apps/api/src -> apps/api -> apps -> root
const projectRoot = path.resolve(__dirname, '../../..');

// Load .env from monorepo root
dotenv.config({ path: path.resolve(projectRoot, '.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://vect-a.ru',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
  SMTP_SECURE:
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER || '',
};
