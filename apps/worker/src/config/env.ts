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
    path.resolve(__dirname, '../../../../.env'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      console.log(`📁 Found .env file at: ${envPath}`);
      return envPath;
    }
  }

  console.warn('⚠️  No .env file found, using process.env and defaults');
  return path.resolve(process.cwd(), '.env');
}

// Загружаем .env файл
const envPath = findEnvFile();
// Загружаем с override
const result = dotenv.config({
  path: envPath,
  override: true,
});

// Функция для загрузки ключа из файла вручную
function loadKeyFromFile(keyName: string): string | null {
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split(/\r?\n/);

    console.log(
      `   🔍 Поиск ${keyName} в файле (всего строк: ${lines.length})`
    );

    // Ищем все строки, которые содержат ключ (не только начинаются с него)
    const allKeyLines = lines
      .map((line, index) => ({
        line: line.trim(),
        index: index + 1,
        original: line,
      }))
      .filter((x) => x.line.includes(keyName));

    console.log(
      `   📋 Найдено строк содержащих "${keyName}": ${allKeyLines.length}`
    );

    if (allKeyLines.length > 0) {
      allKeyLines.forEach((x) => {
        console.log(`      Строка ${x.index}: ${x.line.substring(0, 60)}...`);
      });
    }

    // Ищем строки, которые начинаются с ключа
    const keyLines = allKeyLines.filter((x) =>
      x.line.startsWith(`${keyName}=`)
    );

    console.log(
      `   ✅ Найдено строк начинающихся с "${keyName}=": ${keyLines.length}`
    );

    if (keyLines.length > 0) {
      // Берем первую валидную строку
      const validLine = keyLines[0];
      console.log(
        `   📝 Обрабатываем строку ${validLine.index}: ${validLine.line.substring(0, 60)}...`
      );

      const match = validLine.line.match(
        new RegExp(`^${keyName}\\s*=\\s*(.+)$`)
      );
      if (match && match[1]) {
        const keyValue = match[1].trim().replace(/^["']|["']$/g, '');
        if (keyValue) {
          console.log(`   ✅ Значение извлечено (длина: ${keyValue.length})`);
          return keyValue;
        } else {
          console.warn(`   ⚠️  Значение пустое после обработки`);
        }
      } else {
        console.warn(`   ⚠️  Не удалось извлечь значение из строки`);
      }
    } else {
      console.warn(`   ⚠️  Нет строк начинающихся с "${keyName}="`);
    }
  } catch (err) {
    console.error(`   ❌ Ошибка чтения .env файла для ${keyName}:`, err);
  }
  return null;
}

if (result.error) {
  console.error('❌ Ошибка загрузки .env файла:', result.error);
} else {
  console.log(`✅ .env файл загружен из: ${envPath}`);

  if (result.parsed) {
    const loadedKeys = Object.keys(result.parsed);
    console.log(
      `📋 Загружено переменных из .env через dotenv: ${loadedKeys.length}`
    );
  }
}

// Всегда проверяем и загружаем WORKER_API_KEY вручную, если его нет
if (!process.env.WORKER_API_KEY) {
  const keyValue = loadKeyFromFile('WORKER_API_KEY');
  if (keyValue) {
    process.env.WORKER_API_KEY = keyValue;
    console.log(
      `✅ WORKER_API_KEY загружен вручную (длина: ${keyValue.length})`
    );
  } else {
    console.warn('⚠️  WORKER_API_KEY не найден в .env файле');
  }
} else {
  console.log(
    `✅ WORKER_API_KEY уже загружен (длина: ${process.env.WORKER_API_KEY.length})`
  );
}

// Всегда проверяем и загружаем ENCRYPTION_KEY вручную, если его нет
if (!process.env.ENCRYPTION_KEY) {
  const keyValue = loadKeyFromFile('ENCRYPTION_KEY');
  if (keyValue) {
    process.env.ENCRYPTION_KEY = keyValue;
    console.log(
      `✅ ENCRYPTION_KEY загружен вручную (длина: ${keyValue.length})`
    );
  } else {
    console.warn('⚠️  ENCRYPTION_KEY не найден в .env файле');
  }
} else {
  console.log(
    `✅ ENCRYPTION_KEY уже загружен (длина: ${process.env.ENCRYPTION_KEY.length})`
  );
}

interface EnvConfig {
  NODE_ENV: string;
  DATABASE_URL: string;
  API_URL: string;
  WORKER_API_KEY?: string;
}

function validateEnv(): EnvConfig {
  const requiredVars = ['DATABASE_URL'];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  // Определяем API_URL на основе окружения
  let apiUrl = process.env.API_URL;
  if (!apiUrl) {
    if (process.env.NODE_ENV === 'production') {
      apiUrl = 'http://localhost:4000'; // или ваш продакшен URL
    } else {
      apiUrl = 'http://localhost:4000'; // дефолтный для разработки
    }
    console.log(`🌐 Using default API_URL: ${apiUrl}`);
  }

  const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL!,
    API_URL: apiUrl,
    WORKER_API_KEY: process.env.WORKER_API_KEY,
  };

  // Отладочный вывод для проверки загрузки WORKER_API_KEY
  if (config.WORKER_API_KEY) {
    console.log(
      `✅ WORKER_API_KEY готов к использованию (длина: ${config.WORKER_API_KEY.length})`
    );
  } else {
    console.warn('⚠️  WORKER_API_KEY не найден в .env файле');
    console.warn(`   Проверьте файл: ${envPath}`);
  }

  return config;
}

export const env = validateEnv();
