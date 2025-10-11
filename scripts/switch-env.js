#!/usr/bin/env node

/**
 * Cross-platform ENV Switcher Script
 * Works on Windows, macOS, and Linux
 * 
 * Usage:
 *   node scripts/switch-env.js [environment]
 *   node scripts/switch-env.js --list
 *   node scripts/switch-env.js --current
 */

const fs = require('fs');
const path = require('path');

// Resolve paths relative to project root
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

// ANSI Color codes (работают в большинстве терминалов включая Windows 10+)
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

// Вспомогательные функции для вывода
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

// Показать помощь
function showHelp() {
  console.log('ENV Switcher - переключение между окружениями');
  console.log('');
  console.log('Использование:');
  console.log('  node scripts/switch-env.js [environment]');
  console.log('');
  console.log('Доступные окружения:');
  console.log('  development  - Локальная разработка (по умолчанию)');
  console.log('  production   - Продакшен окружение');
  console.log('');
  console.log('Примеры:');
  console.log('  node scripts/switch-env.js development');
  console.log('  node scripts/switch-env.js production');
  console.log('');
  console.log('Опции:');
  console.log('  -h, --help    Показать эту справку');
  console.log('  -l, --list    Показать доступные .env файлы');
  console.log('  -c, --current Показать текущее окружение');
}

// Показать список доступных .env файлов
function listEnvFiles() {
  info('Доступные .env файлы:');
  console.log('');

  const envFile = path.join(rootDir, '.env');
  if (fs.existsSync(envFile)) {
    console.log(`  ${colors.green}✓${colors.reset} .env (текущий)`);
  } else {
    console.log(`  ${colors.red}✗${colors.reset} .env (не найден)`);
  }

  const environments = ['development', 'production'];
  environments.forEach((env) => {
    const envFileName = `.env.${env}`;
    const envFilePath = path.join(rootDir, envFileName);
    if (fs.existsSync(envFilePath)) {
      console.log(`  ${colors.green}✓${colors.reset} ${envFileName}`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${envFileName} (не найден)`);
    }
  });

  console.log('');
}

// Прочитать значение переменной из .env файла
function getEnvValue(filePath, key) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith(key + '=')) {
        return trimmed.substring(key.length + 1);
      }
    }
    return 'не установлено';
  } catch (err) {
    return 'ошибка чтения';
  }
}

// Показать текущее окружение
function showCurrent() {
  if (!fs.existsSync(envPath)) {
    error('.env файл не найден');
    console.log('');
    info('Создайте .env файл командой:');
    console.log('  pnpm env:setup');
    process.exit(1);
  }

  const nodeEnv = getEnvValue(envPath, 'NODE_ENV');

  info(`Текущее окружение: ${colors.green}${nodeEnv}${colors.reset}`);
  console.log('');

  info('Основные переменные:');
  console.log(`  NODE_ENV: ${getEnvValue(envPath, 'NODE_ENV')}`);
  console.log(`  PORT: ${getEnvValue(envPath, 'PORT')}`);

  const dbUrl = getEnvValue(envPath, 'DATABASE_URL');
  // Скрываем пароль в DATABASE_URL
  const safeDbUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
  console.log(`  DATABASE_URL: ${safeDbUrl}`);
  console.log('');
}

// Основная логика переключения
function switchEnv(environment) {
  // Валидация окружения
  const validEnvs = ['development', 'production'];
  if (!validEnvs.includes(environment)) {
    error(`Неизвестное окружение: ${environment}`);
    console.log('');
    showHelp();
    process.exit(1);
  }

  const envFileName = `.env.${environment}`;
  const envFilePath = path.join(rootDir, envFileName);

  // Проверяем существование файла окружения
  if (!fs.existsSync(envFilePath)) {
    error(`Файл ${envFileName} не найден`);
    console.log('');
    warning('Создайте файл на основе примера:');
    console.log(`  cp env.example ${envFileName}`);
    console.log(`  # или на Windows:`);
    console.log(`  copy env.example ${envFileName}`);
    console.log('');
    console.log(`  Затем отредактируйте ${envFileName} под ваши нужды`);
    process.exit(1);
  }

  // Делаем backup текущего .env (если есть)
  if (fs.existsSync(envPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').substring(0, 19);
    const backupFile = path.join(rootDir, `.env.backup.${timestamp}`);
    fs.copyFileSync(envPath, backupFile);
    info(`Создан backup: .env.backup.${timestamp}`);
  }

  // Копируем новый .env
  fs.copyFileSync(envFilePath, envPath);

  success(`Переключено на окружение: ${colors.green}${environment}${colors.reset}`);
  console.log('');

  // Показываем основные переменные
  info('Основные переменные:');
  console.log(`  NODE_ENV: ${getEnvValue(envPath, 'NODE_ENV')}`);
  console.log(`  PORT: ${getEnvValue(envPath, 'PORT')}`);

  const dbUrl = getEnvValue(envPath, 'DATABASE_URL');
  const safeDbUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
  console.log(`  DATABASE_URL: ${safeDbUrl}`);
  console.log('');

  // Предупреждение для продакшена
  if (environment === 'production') {
    warning('Вы переключились на PRODUCTION окружение!');
    warning('Убедитесь что используете правильные credentials!');
    console.log('');
  }

  success('Готово! Перезапустите приложение для применения изменений:');
  console.log('  pnpm dev  # для разработки');
  console.log('  docker compose restart  # для Docker');
}

// Main
function main() {
  const args = process.argv.slice(2);
  const arg = args[0];

  // Обработка аргументов
  switch (arg) {
    case '-h':
    case '--help':
      showHelp();
      break;

    case '-l':
    case '--list':
      listEnvFiles();
      break;

    case '-c':
    case '--current':
      showCurrent();
      break;

    case undefined:
      // По умолчанию - development
      switchEnv('development');
      break;

    default:
      switchEnv(arg);
      break;
  }
}

// Запуск
try {
  main();
} catch (err) {
  error(`Ошибка: ${err.message}`);
  process.exit(1);
}

