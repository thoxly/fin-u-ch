# ENV Setup - Итоговая сводка

## ✅ Что было сделано

### 1. Обновлен env.example

- ✅ Добавлены все необходимые переменные окружения
- ✅ Добавлены комментарии и примеры для каждой переменной
- ✅ Структурировано по разделам (Database, Redis, API, Web, Docker, etc.)
- ✅ Добавлены переменные для будущих функций (Sentry, Email, S3)

### 2. Создан скрипт переключения окружений

- ✅ `scripts/switch-env.sh` - bash скрипт для управления окружениями
- ✅ Поддержка development, staging, production окружений
- ✅ Автоматический backup текущего .env
- ✅ Безопасное отображение credentials (скрытие паролей)
- ✅ Цветной вывод для лучшей читаемости

### 3. Добавлены npm скрипты

В `package.json` добавлены команды:

- ✅ `pnpm env:setup` - создать .env из примера
- ✅ `pnpm env:current` - показать текущее окружение
- ✅ `pnpm env:list` - список доступных env файлов
- ✅ `pnpm env:dev` - переключиться на development
- ✅ `pnpm env:staging` - переключиться на staging
- ✅ `pnpm env:prod` - переключиться на production

### 4. Создана документация

- ✅ `docs/ENV_SETUP.md` - полное руководство по управлению ENV
- ✅ `docs/ENV_CHEATSHEET.md` - быстрая шпаргалка
- ✅ Обновлен `README.md` с информацией о ENV командах

## 📋 Структура ENV файлов

### Рекомендуемый подход (используется в проекте)

```
/
├── .env                    # Текущий ENV (не в Git) ✅
├── env.example            # Шаблон с примерами ✅
├── .env.development       # Development окружение (опционально)
├── .env.staging           # Staging окружение (опционально)
└── .env.production        # Production окружение (опционально)
```

**Все приложения (api, web, worker) читают из одного .env файла в корне.**

### Почему один ENV файл?

✅ Все приложения используют общие сервисы (PostgreSQL, Redis)
✅ Нет дублирования переменных
✅ Проще управлять и синхронизировать
✅ Меньше вероятность ошибок конфигурации
✅ Идеально для монорепо архитектуры

## 🚀 Быстрый старт

### Для нового разработчика

```bash
# 1. Клонировать проект
git clone <repo>
cd fin-u-ch

# 2. Установить зависимости
pnpm install

# 3. Создать .env из примера
pnpm env:setup

# 4. Проверить настройки
pnpm env:current

# 5. Запустить инфраструктуру
docker-compose -f ops/docker/docker-compose.yml up -d

# 6. Применить миграции
pnpm --filter api prisma:migrate:dev

# 7. Запустить приложения
pnpm dev
```

### Для разных окружений

```bash
# Development (локальная разработка)
pnpm env:dev

# Staging (тестовая среда)
# 1. Создайте .env.staging на основе env.example
cp env.example .env.staging
nano .env.staging
# 2. Переключитесь
pnpm env:staging

# Production (продакшен)
# 1. Создайте .env.production на основе env.example
cp env.example .env.production
nano .env.production
# 2. Переключитесь
pnpm env:prod
```

## 📝 Основные переменные окружения

### Обязательные переменные

| Переменная     | Описание                        | Пример                                 |
| -------------- | ------------------------------- | -------------------------------------- |
| `NODE_ENV`     | Окружение                       | `development`, `staging`, `production` |
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql://user:pass@host:5432/db`  |
| `REDIS_URL`    | Строка подключения к Redis      | `redis://localhost:6379`               |
| `JWT_SECRET`   | Секрет для JWT токенов          | `openssl rand -hex 32`                 |
| `PORT`         | Порт API сервера                | `4000`                                 |
| `VITE_API_URL` | URL API для frontend            | `http://localhost:4000`                |

### Опциональные переменные

| Переменная          | Описание          | Используется в    |
| ------------------- | ----------------- | ----------------- |
| `POSTGRES_DB`       | Имя БД для Docker | Docker Compose    |
| `POSTGRES_USER`     | Пользователь БД   | Docker Compose    |
| `POSTGRES_PASSWORD` | Пароль БД         | Docker Compose    |
| `DOCKER_REGISTRY`   | Docker registry   | CI/CD, Production |
| `ANTHROPIC_API_KEY` | API ключ Claude   | AI Code Review    |

## 🔄 Как работает чтение ENV

### API (Backend)

```typescript
// apps/api/src/config/env.ts
import dotenv from 'dotenv';

// Загружает .env из корня
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  // ...
};
```

### Worker

```typescript
// apps/worker/src/config/env.ts
import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL!,
};
```

### Web (Frontend)

```typescript
// apps/web/src/shared/config/env.ts
export const config = {
  // Vite требует префикс VITE_
  apiUrl: import.meta.env.VITE_API_URL || '/api',
};
```

## 🔐 Безопасность

### ✅ Что сделано

1. **`.env` в `.gitignore`** - ENV файлы не попадают в Git
2. **`env.example` без секретов** - только примеры
3. **Скрытие паролей в выводе** - скрипт маскирует пароли в DATABASE_URL
4. **Backup при переключении** - автоматический backup текущего .env

### ⚠️ Что нужно сделать вручную

1. **Изменить JWT_SECRET в продакшене:**

   ```bash
   openssl rand -hex 32
   ```

2. **Использовать разные секреты для каждого окружения**

3. **Хранить продакшн секреты в безопасном месте:**
   - GitHub Secrets (для CI/CD)
   - AWS Secrets Manager
   - HashiCorp Vault
   - 1Password / Bitwarden

4. **Использовать сильные пароли для БД и Redis в продакшене**

## 🐳 Docker Integration

### Локальная разработка

```bash
# Docker Compose автоматически читает .env из корня
docker-compose -f ops/docker/docker-compose.yml up -d
```

### Production

```bash
# Использование конкретного env файла
docker-compose -f ops/docker/docker-compose.prod.yml \
  --env-file .env.production up -d
```

## 📊 Переменные по приложениям

### API (apps/api)

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

### Web (apps/web)

- `VITE_API_URL` (обязательно с префиксом VITE\_)

### Worker (apps/worker)

- `NODE_ENV`
- `DATABASE_URL`

### Docker Compose

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DOCKER_REGISTRY`
- `DOCKER_IMAGE_PREFIX`
- `IMAGE_TAG`
- `NGINX_CONFIG`
- `SSL_CERT_PATH`

### CI/CD (GitHub Actions)

- `ANTHROPIC_API_KEY` (в GitHub Secrets)
- `GITHUB_TOKEN` (автоматически)

## 🎯 Дальнейшие шаги

### Для локальной разработки

1. ✅ Создан `.env` файл
2. ✅ Настроены переменные для локального Docker
3. ✅ Готово к запуску

### Для staging/production

1. ⏳ Создайте `.env.staging` и `.env.production` на основе `env.example`
2. ⏳ Замените все значения на реальные
3. ⏳ Сгенерируйте новый `JWT_SECRET`
4. ⏳ Настройте подключение к реальным БД и Redis
5. ⏳ Добавьте секреты в GitHub Secrets для CI/CD

### Для команды разработки

1. ✅ Документация создана
2. ✅ Скрипты автоматизации готовы
3. ⏳ Обучите команду использованию команд `pnpm env:*`
4. ⏳ Создайте безопасное хранилище для секретов команды

## 📚 Документация

- **Полное руководство:** [docs/ENV_SETUP.md](ENV_SETUP.md)
- **Быстрая шпаргалка:** [docs/ENV_CHEATSHEET.md](ENV_CHEATSHEET.md)
- **Основной README:** [README.md](../README.md)

## 🛠️ Полезные команды

```bash
# Управление ENV
pnpm env:setup        # Создать .env из примера
pnpm env:current      # Показать текущее окружение
pnpm env:list         # Список доступных env файлов
pnpm env:dev          # Переключиться на development
pnpm env:staging      # Переключиться на staging
pnpm env:prod         # Переключиться на production

# Безопасность
openssl rand -hex 32  # Сгенерировать JWT секрет

# Проверка
grep "NODE_ENV" .env  # Проверить NODE_ENV
git check-ignore .env # Проверить что .env в gitignore
```

## ✨ Итог

Теперь у вас есть полноценная система управления переменными окружения:

- ✅ Один ENV файл для всего монорепозитория
- ✅ Удобные команды для переключения окружений
- ✅ Автоматический backup при переключении
- ✅ Подробная документация
- ✅ Безопасное хранение секретов
- ✅ Готовность к деплою в разные окружения

**Следующие шаги:** Создайте `.env.staging` и `.env.production` когда будете готовы к деплою!
