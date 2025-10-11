import dotenv from 'dotenv';
import path from 'path';

// Load .env from monorepo root (current working directory)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
