#!/usr/bin/env node
/**
 * Script to run Prisma commands with environment variables loaded from root .env file
 * Usage: node scripts/run-prisma-with-env.cjs <prisma-command> [args...]
 * Example: node scripts/run-prisma-with-env.cjs migrate deploy
 */

const { execSync } = require('child_process');
const { resolve } = require('path');
const { readFileSync } = require('fs');

// In CommonJS, __dirname is automatically available
// No need to define it manually

// Load .env from project root manually
const projectRoot = resolve(__dirname, '..');
const envPath = resolve(projectRoot, '.env');

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Set environment variable if not already set
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    console.log(`Loaded environment variables from ${envPath}`);
  } catch (error) {
    console.warn(`Warning: Failed to load .env from ${envPath}: ${error.message}`);
  }
}

loadEnvFile(envPath);

// Get Prisma command and arguments
const [, , ...args] = process.argv;
if (args.length === 0) {
  console.error('Error: Prisma command is required');
  console.error('Usage: node scripts/run-prisma-with-env.cjs <prisma-command> [args...]');
  process.exit(1);
}

// Change to apps/api directory for Prisma commands
const apiDir = resolve(projectRoot, 'apps', 'api');
process.chdir(apiDir);

// Run Prisma command
const command = `npx prisma ${args.join(' ')}`;
console.log(`Running: ${command} in ${apiDir}`);

try {
  execSync(command, {
    stdio: 'inherit',
    env: process.env,
  });
} catch (error) {
  process.exit(error.status || 1);
}
