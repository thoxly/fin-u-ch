// apps/worker/src/config/env.ts
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Получаем __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to find .env file in current dir, parent, or grandparent (monorepo root)
function findEnvFile(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../../../.env'), // Добавим еще один уровень
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      console.log(`📁 Found .env file at: ${envPath}`);
      return envPath;
    }
  }

  console.warn('⚠️  No .env file found, using process.env');
  return path.resolve(process.cwd(), '.env');
}

// Загружаем .env файл
const envPath = findEnvFile();
dotenv.config({ path: envPath });

interface EnvConfig {
  NODE_ENV: string;
  DATABASE_URL: string;
}

function validateEnv(): EnvConfig {
  const requiredVars = ['DATABASE_URL'];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL!,
  };
}

export const env = validateEnv();
