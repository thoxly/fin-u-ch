import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to find .env file in current dir, parent, or grandparent (monorepo root)
function findEnvFile(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      return envPath;
    }
  }

  return path.resolve(process.cwd(), '.env');
}

dotenv.config({ path: findEnvFile() });

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
