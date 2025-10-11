#!/usr/bin/env node

/**
 * Cross-platform Environment Checker Script
 * Проверяет правильность настройки окружения перед запуском
 * Works on Windows, macOS, and Linux
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Resolve paths relative to project root
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

// ANSI Color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function info(msg) {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

function success(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function error(msg) {
  console.error(`${colors.red}✗${colors.reset} ${msg}`);
}

function warning(msg) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
}

// Прочитать значение переменной из .env файла
function getEnvValue(filePath, key) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith(key + '=')) {
        return trimmed.substring(key.length + 1).trim();
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Проверка порта (упрощенная для Windows)
function checkPort(port, service) {
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      // На Windows используем netstat
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      if (output.trim()) {
        success(`${service} доступен на порту ${port}`);
        return true;
      }
    } else {
      // На Unix-like системах используем lsof или nc
      try {
        execSync(`lsof -i :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        success(`${service} доступен на порту ${port}`);
        return true;
      } catch (err) {
        // lsof может не быть установлен, пробуем nc
        try {
          execSync(`nc -z localhost ${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
          success(`${service} доступен на порту ${port}`);
          return true;
        } catch (ncErr) {
          // Игнорируем ошибку, если nc тоже нет
        }
      }
    }
  } catch (err) {
    // Порт не занят/недоступен
  }
  
  warning(`${service} недоступен на порту ${port}`);
  return false;
}

// Проверка Docker
function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    execSync('docker compose version', { stdio: 'ignore' });
    success('Docker и Docker Compose установлены');
    return true;
  } catch (err) {
    error('Docker или Docker Compose не установлены');
    return false;
  }
}

// Проверка Node.js версии
function checkNode() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  
  if (major >= 18) {
    success(`Node.js ${version} ✓ (требуется >=18.0.0)`);
    return true;
  } else {
    error(`Node.js ${version} устарела (требуется >=18.0.0)`);
    return false;
  }
}

// Проверка pnpm
function checkPnpm() {
  try {
    const version = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    const major = parseInt(version.split('.')[0]);
    
    if (major >= 9) {
      success(`pnpm ${version} ✓ (требуется >=9.0.0)`);
      return true;
    } else {
      warning(`pnpm ${version} (рекомендуется >=9.0.0)`);
      return true;
    }
  } catch (err) {
    error('pnpm не установлен');
    console.log('  Установите: npm install -g pnpm@latest');
    return false;
  }
}

// Главная функция проверки
function main() {
  console.log('');
  console.log('='.repeat(50));
  console.log('   Проверка окружения Fin-U-CH');
  console.log('='.repeat(50));
  console.log('');

  let hasErrors = false;
  let hasWarnings = false;

  // 1. Проверка Node.js
  info('1. Проверка Node.js...');
  if (!checkNode()) hasErrors = true;
  console.log('');

  // 2. Проверка pnpm
  info('2. Проверка pnpm...');
  if (!checkPnpm()) hasErrors = true;
  console.log('');

  // 3. Проверка .env файла
  info('3. Проверка .env файла...');
  if (!fs.existsSync(envPath)) {
    error('.env файл не найден');
    console.log('  Создайте командой: pnpm env:setup');
    hasErrors = true;
  } else {
    success('.env файл существует');

    // Проверяем критичные переменные
    const requiredVars = ['NODE_ENV', 'DATABASE_URL', 'JWT_SECRET', 'PORT'];
    let allVarsPresent = true;

    requiredVars.forEach((varName) => {
      const value = getEnvValue(envPath, varName);
      if (!value) {
        error(`  Переменная ${varName} не установлена`);
        allVarsPresent = false;
      }
    });

    if (allVarsPresent) {
      success('Все критичные переменные установлены');
    } else {
      hasErrors = true;
    }

    // Проверяем JWT_SECRET
    const jwtSecret = getEnvValue(envPath, 'JWT_SECRET');
    if (jwtSecret && jwtSecret.includes('change-me')) {
      warning('JWT_SECRET использует дефолтное значение');
      warning('В продакшене обязательно смените на безопасное!');
      hasWarnings = true;
    }
  }
  console.log('');

  // 4. Проверка Docker
  info('4. Проверка Docker...');
  const dockerInstalled = checkDocker();
  console.log('');

  // 5. Проверка сервисов (PostgreSQL, Redis)
  if (dockerInstalled) {
    info('5. Проверка сервисов...');
    
    const dbUrl = getEnvValue(envPath, 'DATABASE_URL');
    let dbPort = 5432;
    if (dbUrl) {
      const match = dbUrl.match(/:(\d+)\//);
      if (match) {
        dbPort = parseInt(match[1]);
      }
    }
    
    const redisUrl = getEnvValue(envPath, 'REDIS_URL');
    let redisPort = 6379;
    if (redisUrl) {
      const match = redisUrl.match(/:(\d+)$/);
      if (match) {
        redisPort = parseInt(match[1]);
      }
    }

    const pgAvailable = checkPort(dbPort, 'PostgreSQL');
    const redisAvailable = checkPort(redisPort, 'Redis');

    if (!pgAvailable || !redisAvailable) {
      warning('Некоторые сервисы недоступны');
      console.log('  Запустите Docker сервисы:');
      console.log('  docker compose -f ops/docker/docker-compose.yml up -d');
      hasWarnings = true;
    }
    console.log('');
  }

  // 6. Проверка Prisma Client
  info('6. Проверка Prisma...');
  const prismaClientPath = path.join(rootDir, 'apps', 'api', 'node_modules', '@prisma', 'client');
  if (fs.existsSync(prismaClientPath)) {
    success('Prisma Client сгенерирован');
  } else {
    error('Prisma Client не найден');
    console.log('  Сгенерируйте командой: cd apps/api && pnpm prisma:generate');
    hasErrors = true;
  }
  console.log('');

  // Итоги
  console.log('='.repeat(50));
  if (hasErrors) {
    error('Обнаружены критичные проблемы!');
    console.log('');
    console.log('📚 Документация:');
    console.log('  - docs/DEV_GUIDE.md');
    console.log('  - docs/ENV_SETUP.md');
    console.log('  - docs/WINDOWS_SETUP.md (для Windows)');
    console.log('');
    process.exit(1);
  } else if (hasWarnings) {
    warning('Окружение настроено, но есть предупреждения');
    console.log('');
    process.exit(0);
  } else {
    success('Окружение полностью настроено! ✨');
    console.log('');
    console.log('🚀 Можно запускать:');
    console.log('  pnpm dev  # разработка');
    console.log('');
    process.exit(0);
  }
}

// Запуск
try {
  main();
} catch (err) {
  error(`Неожиданная ошибка: ${err.message}`);
  process.exit(1);
}

