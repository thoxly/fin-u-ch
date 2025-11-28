import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Determine project root: go up from apps/api/src/config to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// From apps/api/src/config/env.ts -> apps/api/src/config -> apps/api/src -> apps/api -> apps -> root
const projectRoot = path.resolve(__dirname, '../../../../');
const apiRoot = path.resolve(__dirname, '../..');

// Load .env from monorepo root, fallback to apps/api
const rootEnvPath = path.resolve(projectRoot, '.env');
const apiEnvPath = path.resolve(apiRoot, '.env');

// Сначала загружаем из корня проекта, затем из apps/api (как fallback)
const rootResult = dotenv.config({ path: rootEnvPath, override: true });
// Если DATABASE_URL все еще не установлен, пробуем загрузить из apps/api
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: apiEnvPath, override: true });
}

// Используем путь к корневому .env для ручной загрузки
const envPath = rootEnvPath;

// Функция для загрузки ключа из файла вручную (резервный механизм)
function loadKeyFromFile(keyName: string): string | null {
  try {
    // Проверяем существование файла
    if (!fs.existsSync(envPath)) {
      console.error(` API: .env файл не найден по пути: ${envPath}`);
      return null;
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split(/\r?\n/);

    const keyLines = lines
      .map((line: string, index: number) => ({
        line: line.trim(),
        index: index + 1,
      }))
      .filter((x: { line: string; index: number }) =>
        x.line.startsWith(`${keyName}=`)
      );

    if (keyLines.length > 0) {
      const validLine = keyLines[0];
      const match = validLine.line.match(
        new RegExp(`^${keyName}\\s*=\\s*(.+)$`)
      );
      if (match && match[1]) {
        const keyValue = match[1].trim().replace(/^["']|["']$/g, '');
        if (keyValue) {
          console.log(
            ` API: ${keyName} найден в .env файле (строка ${validLine.index})`
          );
          return keyValue;
        }
      }
    } else {
      console.warn(
        `  API: ${keyName} не найден в .env файле (проверено ${lines.length} строк)`
      );
    }
  } catch (err: any) {
    console.error(
      ` API: Ошибка при чтении .env файла для ${keyName}:`,
      err.message
    );
    console.error(` API: Путь: ${envPath}`);
  }
  return null;
}

// Логируем загрузку .env (всегда, не только в dev)
if (rootResult.error) {
  console.error(' API: Ошибка загрузки .env файла:', rootResult.error);
  console.error(' API: Путь к .env:', envPath);
} else {
  console.log(` API: .env файл загружен из: ${envPath}`);
  if (rootResult.parsed) {
    const loadedKeys = Object.keys(rootResult.parsed);
    console.log(
      ` API: Загружено переменных через dotenv: ${loadedKeys.length}`
    );
    // Проверяем наличие ключей в parsed
    if (rootResult.parsed.WORKER_API_KEY) {
      console.log(
        ` API: WORKER_API_KEY найден в dotenv.parsed (длина: ${rootResult.parsed.WORKER_API_KEY.length})`
      );
    } else {
      console.warn('  API: WORKER_API_KEY НЕ найден в dotenv.parsed');
    }
    if (rootResult.parsed.ENCRYPTION_KEY) {
      console.log(
        ` API: ENCRYPTION_KEY найден в dotenv.parsed (длина: ${rootResult.parsed.ENCRYPTION_KEY.length})`
      );
    } else {
      console.warn('  API: ENCRYPTION_KEY НЕ найден в dotenv.parsed');
    }
  }
}

// Всегда проверяем и загружаем WORKER_API_KEY вручную, если его нет
if (!process.env.WORKER_API_KEY) {
  console.warn(
    '  API: process.env.WORKER_API_KEY отсутствует, пытаемся загрузить вручную...'
  );
  const keyValue = loadKeyFromFile('WORKER_API_KEY');
  if (keyValue) {
    process.env.WORKER_API_KEY = keyValue;
    console.log(
      ` API: WORKER_API_KEY загружен вручную (длина: ${keyValue.length})`
    );
  } else {
    console.error(' API: WORKER_API_KEY не найден в .env файле');
    console.error(` API: Путь к .env: ${envPath}`);
  }
} else {
  console.log(
    ` API: WORKER_API_KEY уже загружен (длина: ${process.env.WORKER_API_KEY.length})`
  );
}

// Всегда проверяем и загружаем ENCRYPTION_KEY вручную, если его нет
if (!process.env.ENCRYPTION_KEY) {
  console.warn(
    '  API: process.env.ENCRYPTION_KEY отсутствует, пытаемся загрузить вручную...'
  );
  const keyValue = loadKeyFromFile('ENCRYPTION_KEY');
  if (keyValue) {
    process.env.ENCRYPTION_KEY = keyValue;
    console.log(
      ` API: ENCRYPTION_KEY загружен вручную (длина: ${keyValue.length})`
    );
  } else {
    console.error(' API: ENCRYPTION_KEY не найден в .env файле');
    console.error(` API: Путь к .env: ${envPath}`);
  }
} else {
  console.log(
    ` API: ENCRYPTION_KEY уже загружен (длина: ${process.env.ENCRYPTION_KEY.length})`
  );
}

// Создаем env объект ПОСЛЕ загрузки всех ключей
// Используем getter, чтобы всегда получать актуальное значение из process.env
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  // Используем актуальное значение из process.env (загружено выше)
  WORKER_API_KEY: process.env.WORKER_API_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://vect-a.ru',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
  SMTP_SECURE:
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  // Используем актуальное значение из process.env (загружено выше)
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
};