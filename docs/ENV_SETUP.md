# Управление переменными окружения

## 🔄 Как это работает

### Схема работы env.example и .env

```
┌─────────────────────────────────────────────────────────────┐
│                         GITHUB                              │
│  ┌───────────────────────────────────────────────────┐      │
│  │  env.example (в репозитории)                      │      │
│  │  ────────────────────────────────────────────     │      │
│  │  # Шаблон с примерами (БЕЗ реальных секретов)    │      │
│  │  DATABASE_URL=postgresql://postgres:postgres@...  │      │
│  │  JWT_SECRET=your-secret-here                      │      │
│  │  VITE_API_URL=http://localhost:4000               │      │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓ git clone
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  ЛОКАЛЬНАЯ МАШИНА                           │
│                                                             │
│  ┌────────────────────────────────────────────┐            │
│  │  env.example (скопирован из Git)           │            │
│  └────────────────────────────────────────────┘            │
│                      ↓ cp env.example .env                 │
│  ┌────────────────────────────────────────────┐            │
│  │  .env (ваш личный файл, НЕ в Git)          │            │
│  │  ──────────────────────────────────────────    │            │
│  │  # Реальные данные для ВАШЕЙ машины        │            │
│  │  DATABASE_URL=postgresql://postgres:...    │            │
│  │  JWT_SECRET=abc123real...                  │            │
│  │  VITE_API_URL=http://localhost:4000        │            │
│  └────────────────────────────────────────────┘            │
│                      ↓ используется приложением            │
│  ┌────────────────────────────────────────────┐            │
│  │  API, Web, Worker читают из .env           │            │
│  └────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

**Важно понимать:**

- `env.example` - это шаблон в Git (безопасно коммитить)
- `.env` - ваши личные данные локально (НЕ в Git, в .gitignore)

## Структура ENV файлов

В этом проекте используется **один ENV файл в корне монорепозитория** для всех приложений (api, web, worker).

- Все приложения используют общие сервисы (PostgreSQL, Redis)
- Нет дублирования переменных
- Проще управлять и синхронизировать
- Меньше вероятность ошибок конфигурации
- Удобно для монорепо архитектуры

### Файлы в проекте

```
/
├── env.example            # ✅ В Git - ШАБЛОН с примерами (БЕЗ реальных секретов)
├── .env                   # ❌ НЕ в Git - Текущее окружение (development по умолчанию)
├── .env.development       # ❌ НЕ в Git - Development (опционально)
└── .env.production        # ❌ НЕ в Git - Production (создается перед деплоем)
```

**Примечание:** Проект использует 2 окружения - Development и Production.

### 📋 Важно понимать:

**`env.example` (в Git ✅):**

- Файл-шаблон, который ПОПАДАЕТ в GitHub
- Содержит примеры переменных БЕЗ реальных секретов
- Показывает какие переменные нужны проекту
- Пример: `JWT_SECRET=your-secret-here`

**`.env` (НЕ в Git ❌):**н

- Ваш личный файл с РЕАЛЬНЫМИ данными
- НЕ попадает в GitHub (защищен .gitignore)
- Создается каждым разработчиком локально из `env.example`
- Содержит реальные пароли, API ключи, секреты

### 🔄 Откуда разработчику узнать реальные данные?

1. **Локальная разработка (Development)** - используйте значения из `env.example` (они рабочие для Docker)
2. **Production** - получите credentials от:
   - Тимлида / DevOps
   - Безопасного хранилища (1Password, Bitwarden, Vault)
   - CI/CD secrets (GitHub Secrets, GitLab Variables)
   - Документации команды / VPS сервера

## Быстрый старт

### 1. Создание .env файла для разработки

#### Автоматический способ (рекомендуется, работает на всех ОС)

```bash
# Используйте готовый кросс-платформенный скрипт
pnpm env:setup
```

Этот скрипт автоматически:

- Проверит наличие `.env` файла
- Скопирует `env.example` → `.env` если нужно
- Выведет подсказки для следующих шагов

**Важно:** Скрипт работает на Windows, macOS и Linux!

#### Ручной способ

<details>
<summary>macOS / Linux</summary>

```bash
# Скопируйте шаблон
cp env.example .env

# Отредактируйте значения
nano .env
```

</details>

<details>
<summary>Windows (PowerShell)</summary>

```powershell
# Скопируйте шаблон
Copy-Item env.example .env

# Отредактируйте значения
notepad .env
```

</details>

<details>
<summary>Windows (CMD)</summary>

```cmd
# Скопируйте шаблон
copy env.example .env

# Отредактируйте значения
notepad .env
```

</details>

**Объяснение:**

- `env.example` - это шаблон из Git (уже есть в проекте)
- `.env` - ваш личный файл (создается локально, не попадет в Git)
- Для локальной разработки значения из `env.example` уже готовы к работе!

### 2. Минимальная конфигурация для локальной разработки

```env
# Основное
NODE_ENV=development
PORT=4000

# База данных (локальный Docker)
# Стандартные порты для docker-compose.yml (рекомендуется)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev

# Redis (локальный Docker)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-dev-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
# Используйте /api для работы через Vite proxy (настроен в vite.config.ts)
VITE_API_URL=/api
```

**Примечание о портах:**

| Сценарий                      | PostgreSQL | Redis | Файл compose               |
| ----------------------------- | ---------- | ----- | -------------------------- |
| **Гибридный (рекомендуется)** | 5432       | 6379  | `docker-compose.yml`       |
| **Полный Docker стек**        | 5433       | 6380  | `docker-compose.local.yml` |

- **Гибридный:** Docker только для БД/Redis, приложения локально (горячая перезагрузка)
- **Полный Docker:** Всё в Docker для тестирования production-подобного окружения
- Нестандартные порты (5433, 6380) нужны для избежания конфликтов при одновременной работе

### 3. Запуск проекта

```bash
# Запустите Docker сервисы
docker-compose -f ops/docker/docker-compose.yml up -d

# Установите зависимости
pnpm install

# Примените миграции
pnpm --filter api prisma:migrate:dev

# Запустите приложения
pnpm dev
```

## Настройка для разных окружений

### Development (Локальная разработка)

**Гибридный режим (рекомендуется):**

```bash
# .env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev
REDIS_URL=redis://localhost:6379
VITE_API_URL=/api  # Через Vite proxy
JWT_SECRET=dev-secret-change-in-production
```

**Полный Docker стек (для тестирования):**

```bash
# .env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/fin_u_ch_dev
REDIS_URL=redis://localhost:6380
VITE_API_URL=/api
JWT_SECRET=dev-secret-change-in-production
```

### Production (Продакшен)

```bash
# .env.production (создается перед деплоем на VPS)
NODE_ENV=production
DATABASE_URL=postgresql://user:password@your-vps-ip:5432/fin_u_ch
REDIS_URL=redis://:password@your-vps-ip:6379
VITE_API_URL=/api
JWT_SECRET=$(openssl rand -hex 32)  # Сгенерируйте новый!
```

## Переключение между окружениями

### Способ 1: Копирование файла

```bash
# Переключиться на production
cp .env.production .env

# Вернуться на development
cp .env.development .env
```

### Способ 2: Символические ссылки

```bash
# Создать ссылку на production
ln -sf .env.production .env

# Создать ссылку на development
ln -sf .env.development .env
```

### Способ 3: Скрипт (рекомендуется)

У вас уже есть готовый скрипт `scripts/switch-env.sh`:

```bash
# Переключиться на development
pnpm env:dev

# Переключиться на production
pnpm env:prod

# Показать текущее окружение
pnpm env:current
```

## Чтение ENV в приложениях

### API (Node.js)

```typescript
// apps/api/src/config/env.ts
import dotenv from 'dotenv';

// Загружает .env из корня проекта
dotenv.config({ path: '../../.env' });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  // ...
};
```

### Worker (Node.js)

```typescript
// apps/worker/src/config/env.ts
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL!,
};
```

### Web (Vite)

```typescript
// apps/web/src/shared/config/env.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
```

**Важно:** Vite требует префикс `VITE_` для переменных, доступных в браузере!

## Docker и CI/CD

### Docker Compose (Локальная разработка)

```yaml
# ops/docker/docker-compose.yml
services:
  api:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
```

Docker Compose автоматически читает `.env` из текущей директории.

### Docker Compose (Production)

```bash
# Использование конкретного env файла
docker-compose -f ops/docker/docker-compose.prod.yml --env-file .env.production up -d
```

### GitHub Actions

```yaml
# .github/workflows/ci-cd.yml
- name: Deploy to production
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    REDIS_URL: ${{ secrets.REDIS_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
  run: |
    docker-compose up -d
```

**Важно:** Храните секреты в GitHub Secrets, не в `.env` файлах!

### VPS Deployment

```bash
# На VPS сервере создайте .env.production
ssh user@your-vps.com
cd /opt/fin-u-ch
nano .env.production

# Затем используйте его при деплое
docker-compose -f ops/docker/docker-compose.prod.yml --env-file .env.production up -d
```

## Безопасность ENV файлов

### ✅ DO (Делайте)

1. **Храните `.env` в `.gitignore`**

   ```gitignore
   # .gitignore
   .env
   .env.local
   .env.*.local
   ```

2. **Используйте сильные секреты в продакшене**

   ```bash
   # Генерация JWT секрета
   openssl rand -hex 32
   ```

3. **Храните секреты в безопасных хранилищах:**
   - GitHub Secrets для CI/CD
   - AWS Secrets Manager
   - HashiCorp Vault
   - 1Password / Bitwarden для команды

4. **Документируйте все переменные в `env.example`**

5. **Используйте разные секреты для каждого окружения**

### ❌ DON'T (Не делайте)

1. **НЕ коммитьте `.env` файлы в Git**
2. **НЕ используйте одинаковые секреты для dev/prod**
3. **НЕ храните реальные API ключи в `env.example`**
4. **НЕ шарьте `.env` файлы через мессенджеры**
5. **НЕ используйте дефолтные пароли в продакшене**

## Валидация ENV переменных

### Проверка обязательных переменных

```typescript
// apps/api/src/config/env.ts
function validateEnv() {
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env variables: ${missing.join(', ')}`);
  }
}

validateEnv();
```

### Использование библиотек валидации

```bash
pnpm add envalid
```

```typescript
import { cleanEnv, str, port, url } from 'envalid';

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'staging', 'production'] }),
  PORT: port({ default: 4000 }),
  DATABASE_URL: url(),
  REDIS_URL: url(),
  JWT_SECRET: str({ minLength: 32 }),
});
```

## Troubleshooting

### Проблема: "test" не является командой (Windows)

**Симптомы:**

```
"test" не является внутренней или внешней командой
"cp" не является внутренней или внешней командой
```

**Решение:**

```bash
# Используйте кросс-платформенный скрипт
pnpm env:setup

# Или вручную (PowerShell)
Copy-Item env.example .env

# Или вручную (CMD)
copy env.example .env
```

**Объяснение:** Unix команды (`test`, `cp`) не работают в Windows CMD/PowerShell. Используйте `pnpm env:setup` для всех платформ.

### Проблема: Переменные не читаются

```bash
# Проверьте путь к .env файлу
dotenv.config({ path: '../../.env', debug: true });

# Или используйте абсолютный путь
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
```

### Проблема: VITE переменные недоступны

```typescript
// ❌ НЕ РАБОТАЕТ в браузере
const apiUrl = process.env.API_URL;

// ✅ РАБОТАЕТ
const apiUrl = import.meta.env.VITE_API_URL;
```

### Проблема: Docker не видит переменные

```bash
# Убедитесь что .env в корне проекта
ls -la | grep .env

# Проверьте что docker-compose запускается из корня
docker-compose -f ops/docker/docker-compose.yml --env-file .env up
```

## Полезные команды

```bash
# Создать .env из примера (кросс-платформенно)
pnpm env:setup

# Показать текущее окружение
pnpm env:current

# Проверить переменные в Docker
docker-compose config
```

<details>
<summary>Unix-специфичные команды (macOS/Linux)</summary>

```bash
# Показать текущие ENV переменные
printenv | grep FIN_U_CH

# Проверить существование .env файла
test -f .env && echo "✅ .env exists" || echo "❌ .env not found"

# Сравнить .env с .env.example
diff .env env.example
```

</details>

<details>
<summary>Windows-специфичные команды (PowerShell)</summary>

```powershell
# Показать текущие ENV переменные
Get-ChildItem Env: | Where-Object { $_.Name -like "*FIN_U_CH*" }

# Проверить существование .env файла
Test-Path .env

# Сравнить .env с .env.example
Compare-Object (Get-Content .env) (Get-Content env.example)
```

</details>

## Рекомендуемый workflow для команды

1. **Новый разработчик:**

   ```bash
   # Клонируйте проект
   git clone <repo>
   cd fin-u-ch

   # Установите зависимости
   pnpm install

   # Создайте .env (работает на всех ОС!)
   pnpm env:setup

   # Запустите инфраструктуру
   docker-compose -f ops/docker/docker-compose.yml up -d

   # Запустите проект
   pnpm dev
   ```

2. **Обновление переменных:**

   ```bash
   # Добавьте новую переменную в env.example
   # Обновите документацию
   # Коммитьте env.example
   git add env.example docs/ENV_SETUP.md
   git commit -m "Add new ENV variable: FEATURE_FLAG_X"
   ```

3. **Деплой в продакшен:**
   ```bash
   # Создайте/обновите .env.production на сервере
   ssh user@server
   nano .env.production
   # Деплой
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

## 🔄 Горячая перезагрузка (Hot Reload)

Проект настроен для автоматического применения изменений в `.env`:

- **API и Worker** - автоматически перезапускаются при изменении `.env` (nodemon)
- **Web (Vite)** - требует ручного перезапуска для `VITE_*` переменных

Подробнее: [ENV Hot Reload Guide](ENV_HOT_RELOAD.md)

## 📚 FAQ

### Q: Зачем нужен env.example если есть .env?

**A:** `env.example` - это документация! Он показывает:

- Какие переменные нужны проекту
- Какой формат они должны иметь
- Примеры значений для локальной разработки

### Q: Почему .env не в Git?

**A:** Безопасность! `.env` содержит реальные секреты:

- Пароли от БД
- API ключи
- JWT секреты
- Если попадет в Git → утечка данных!

### Q: Откуда новый разработчик узнает credentials?

**A:** Зависит от окружения:

- **Локально:** из `env.example` (готовые значения)
- **Production:** от команды (безопасное хранилище)

### Q: Что если я случайно закоммитил .env?

**A:** Немедленно:

1. Удалите файл из Git: `git rm --cached .env`
2. Добавьте в .gitignore
3. Смените ВСЕ секреты (БД пароли, JWT, API ключи)
4. Force push (если еще не в main): `git push --force`
5. Сообщите команде

### Q: Можно ли держать разные env.example для окружений?

**A:** Нет необходимости. Один `env.example` содержит ВСЕ переменные с комментариями для каждого окружения:

```env
# Локально:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev

# Production (пример):
# DATABASE_URL=postgresql://user:pass@prod-db:5432/fin_u_ch
```

## ✅ Checklist для новых разработчиков

- [ ] Склонировал проект: `git clone ...`
- [ ] Установил зависимости: `pnpm install`
- [ ] Создал .env: `pnpm env:setup` (работает на Windows/macOS/Linux!)
- [ ] Проверил что `.env` в `.gitignore` (уже настроено)
- [ ] Проверил окружение: `pnpm env:current`
- [ ] Для локальной разработки - оставил значения как есть
- [ ] Для production - получил credentials от команды
- [ ] Запустил инфраструктуру: `docker-compose -f ops/docker/docker-compose.yml up -d`
- [ ] Запустил проект: `pnpm dev`
- [ ] Готово! ✨

## Дополнительные ресурсы

- [ENV Hot Reload](ENV_HOT_RELOAD.md) - Горячая перезагрузка переменных
- [ENV Cheatsheet](ENV_CHEATSHEET.md) - Быстрая шпаргалка
- [dotenv документация](https://github.com/motdotla/dotenv)
- [Vite env переменные](https://vitejs.dev/guide/env-and-mode.html)
- [12-Factor App Config](https://12factor.net/config)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
