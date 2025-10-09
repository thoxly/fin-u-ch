#!/usr/bin/env node

/**
 * Cross-platform script to setup .env file from env.example
 * Works on Windows, macOS, and Linux
 */

const fs = require('fs');
const path = require('path');

// Resolve paths relative to project root
const rootDir = path.resolve(__dirname, '..');
const envExamplePath = path.join(rootDir, 'env.example');
const envPath = path.join(rootDir, '.env');

try {
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('✓ .env файл уже существует. Пропускаю создание.');
    console.log('💡 Подсказка: Если нужно сбросить, удалите .env и запустите снова.');
    process.exit(0);
  }

  // Check if env.example exists
  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ Ошибка: env.example не найден!');
    console.error(`   Ожидаемый путь: ${envExamplePath}`);
    process.exit(1);
  }

  // Copy env.example to .env
  fs.copyFileSync(envExamplePath, envPath);

  console.log('✓ .env файл создан из env.example');
  console.log('');
  console.log('📝 Следующие шаги:');
  console.log('   1. Откройте .env и настройте переменные окружения');
  console.log('   2. Для локальной разработки значения из env.example уже готовы');
  console.log('   3. Запустите: pnpm install && pnpm dev');
  console.log('');
  console.log('📚 Документация: docs/ENV_SETUP.md');
} catch (error) {
  console.error('❌ Ошибка при создании .env файла:', error.message);
  process.exit(1);
}

