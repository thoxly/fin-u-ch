# Environment Setup Guide

Руководство по настройке окружений для E2E тестов.

## 🎯 Обзор

Для корректной работы E2E тестов во всех средах должен быть создан демо-пользователь с одинаковыми данными.

## 📊 Окружения

| Среда                    | База данных     | Демо-пользователь              | Назначение                |
| ------------------------ | --------------- | ------------------------------ | ------------------------- |
| **Локальная разработка** | `fin_u_ch_dev`  | `demo@example.com` / `demo123` | Разработка и тестирование |
| **CI/CD (тесты)**        | `fin_u_ch_test` | `demo@example.com` / `demo123` | Автоматические тесты      |
| **Dev ветка**            | `fin_u_ch_dev`  | `demo@example.com` / `demo123` | Тестирование функций      |
| **Main/Production**      | `fin_u_ch`      | `demo@example.com` / `demo123` | Продакшен                 |

## 🚀 Быстрая настройка

### Локальная разработка

```bash
# Автоматическая настройка
./scripts/setup-dev-env.sh
```

Или вручную:

```bash
# 1. Копируем переменные окружения
cp env.example .env

# 2. Запускаем Docker контейнеры
cd ops/docker
docker-compose up -d
cd ../..

# 3. Запускаем миграции
pnpm --filter api prisma migrate deploy

# 4. Создаем демо-пользователя
pnpm --filter api tsx scripts/setup-demo-user.ts
```

### CI/CD (автоматически)

В `.github/workflows/ci-cd.yml` уже настроено автоматическое создание демо-пользователя:

```yaml
- name: Create demo user for E2E tests
  run: pnpm --filter api tsx scripts/setup-demo-user.ts
```

### Продакшен

```bash
# На продакшене
pnpm --filter api tsx scripts/setup-demo-user.ts
```

## 🔧 Скрипты

### `scripts/setup-demo-user.ts`

Основной скрипт для создания демо-пользователя:

```typescript
// Создает:
// - Компанию "Демо Компания ООО"
// - Пользователя demo@example.com / demo123
// - Начальные справочники (статьи, счета, подразделения, контрагенты)
```

**Использование:**

```bash
pnpm --filter api tsx scripts/setup-demo-user.ts
```

### `scripts/setup-dev-env.sh`

Полная настройка локальной среды разработки:

```bash
./scripts/setup-dev-env.sh
```

**Что делает:**

1. Создает `.env` файл из шаблона
2. Запускает Docker контейнеры
3. Запускает миграции БД
4. Создает демо-пользователя

## 🧪 E2E тесты

### Рабочие тесты (не требуют авторизации)

```bash
# Запуск всех рабочих тестов
pnpm test:e2e public-pages.spec.ts protected-pages.spec.ts auth.spec.ts smoke.spec.ts
```

### Тесты с авторизацией (требуют демо-пользователя)

```bash
# Запуск тестов с авторизацией
pnpm test:e2e authenticated-pages.spec.ts
```

## 🔍 Проверка настройки

### Проверка демо-пользователя

```bash
# Подключение к БД
pnpm --filter api prisma studio

# Или через SQL
psql postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev
```

```sql
-- Проверяем пользователя
SELECT email, "isActive" FROM "User" WHERE email = 'demo@example.com';

-- Проверяем компанию
SELECT name FROM "Company" WHERE id = (
  SELECT "companyId" FROM "User" WHERE email = 'demo@example.com'
);
```

### Проверка E2E тестов

```bash
# Тест аутентификации
pnpm test:e2e --grep="should handle invalid login credentials"

# Тест защищенных страниц
pnpm test:e2e --grep="should redirect protected routes to login"
```

## 🚨 Устранение проблем

### Демо-пользователь не создается

```bash
# Проверяем подключение к БД
pnpm --filter api prisma db push

# Проверяем миграции
pnpm --filter api prisma migrate status

# Создаем демо-пользователя вручную
pnpm --filter api tsx scripts/setup-demo-user.ts
```

### E2E тесты падают

```bash
# Проверяем, что сервер запущен
curl http://localhost:3000/api/health

# Проверяем, что демо-пользователь существует
pnpm --filter api tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { email: 'demo@example.com' } })
  .then(user => console.log('Demo user:', user))
  .finally(() => prisma.\$disconnect());
"
```

### Проблемы с Docker

```bash
# Перезапуск контейнеров
cd ops/docker
docker-compose down
docker-compose up -d

# Проверка логов
docker-compose logs postgres
docker-compose logs redis
```

## 📝 Переменные окружения

### Локальная разработка

```bash
# .env файл
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### CI/CD

```yaml
# .github/workflows/ci-cd.yml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fin_u_ch_test
  REDIS_URL: redis://localhost:6379
  JWT_SECRET: test-jwt-secret
  NODE_ENV: test
```

### Продакшен

```bash
# Продакшен .env
DATABASE_URL=postgresql://user:password@host:5432/fin_u_ch
REDIS_URL=redis://:password@host:6379
JWT_SECRET=production-secret-key
NODE_ENV=production
```

## 🔄 Обновление демо-пользователя

Если нужно обновить демо-пользователя:

```bash
# Удаляем старого пользователя
pnpm --filter api tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.deleteMany({ where: { email: 'demo@example.com' } })
  .then(() => console.log('Demo user deleted'))
  .finally(() => prisma.\$disconnect());
"

# Создаем нового
pnpm --filter api tsx scripts/setup-demo-user.ts
```

## 📚 Дополнительные ресурсы

- [DEV_GUIDE.md](./DEV_GUIDE.md) - Общее руководство по разработке
- [CI_CD.md](./CI_CD.md) - Настройка CI/CD
- [ENV_CHEATSHEET.md](./ENV_CHEATSHEET.md) - Шпаргалка по переменным окружения
