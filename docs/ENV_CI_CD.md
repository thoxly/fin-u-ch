# ENV Variables для CI/CD

Документация по настройке переменных окружения для GitHub Actions CI/CD.

## 🎯 Проблема

В CI/CD environment нет доступа к `.env` файлу из корня проекта (он в `.gitignore`). Все переменные окружения должны быть явно объявлены в workflow.

## ✅ Решение

### 1. Переменные на уровне job

В `.github/workflows/ci-cd.yml` переменные объявляются на уровне job:

```yaml
test-e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  # ...
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fin_u_ch_test
    REDIS_URL: redis://localhost:6379
    JWT_SECRET: test-jwt-secret
    NODE_ENV: test
```

### 2. Переменные для шагов

Некоторые шаги требуют явной передачи ENV:

```yaml
- name: Start API server in background
  working-directory: apps/api
  run: |
    node dist/server.js &
  env:
    DATABASE_URL: ${{ env.DATABASE_URL }}
    REDIS_URL: ${{ env.REDIS_URL }}
    JWT_SECRET: ${{ env.JWT_SECRET }}
    NODE_ENV: ${{ env.NODE_ENV }}
    PORT: 4000
```

### 3. Playwright конфигурация

В `apps/web/playwright.config.ts`:

```typescript
// В CI серверы запускаются отдельно в workflow, локально Playwright запустит сам
webServer: process.env.CI
  ? undefined
  : {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120000,
    },
```

## 📋 Необходимые ENV переменные

### Build & Test Job

```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fin_u_ch_test
  REDIS_URL: redis://localhost:6379
  JWT_SECRET: test-jwt-secret
  NODE_ENV: test
```

### E2E Test Job

```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/fin_u_ch_test
  REDIS_URL: redis://localhost:6379
  JWT_SECRET: test-jwt-secret
  NODE_ENV: test
  PORT: 4000 # Для API сервера
```

### Deploy Job

Используются GitHub Secrets:

- `VPS_HOST` - IP или hostname VPS
- `VPS_USER` - SSH user
- `VPS_SSH_KEY` - Private SSH key
- `GHCR_TOKEN` - GitHub Container Registry token

## 🔧 Настройка локального окружения

### Для разработчика

1. Скопируйте `.env.example`:

```bash
cp env.example .env
```

2. Заполните значения:

```bash
# Development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-dev-secret
NODE_ENV=development
PORT=4000
```

### Для Windows пользователей

Убедитесь что используется правильный line ending (LF, не CRLF):

```bash
# Git config
git config core.autocrlf input
```

Для загрузки `.env` в Node.js приложениях используется пакет `dotenv`:

```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load .env from monorepo root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
```

## 🐛 Troubleshooting

### Ошибка: "Timed out waiting for webServer"

**Причина**: Playwright пытается запустить webServer, который уже запущен или не может запуститься из-за отсутствия ENV.

**Решение**:

1. Убедитесь что в `playwright.config.ts` отключен `webServer` в CI режиме
2. Проверьте что серверы запускаются в workflow правильно
3. Добавьте health checks перед запуском тестов

### Ошибка: "Missing required environment variable"

**Причина**: ENV переменная не передана в процесс.

**Решение**:

1. Проверьте что переменная объявлена на уровне job в workflow
2. Если используется в шаге, добавьте явно в `env:` секцию шага
3. Проверьте что переменная правильно интерполируется: `${{ env.VARIABLE }}`

### API/Web не запускается в CI

**Причина**: Отсутствуют ENV переменные или неправильный порт.

**Решение**:

1. Добавьте health checks после запуска серверов
2. Используйте явные порты: API на 4000, Web на 3000
3. Добавьте логирование в CI для отладки

## 📚 Связанные документы

- [CI_CD.md](./CI_CD.md) - Полная документация CI/CD pipeline
- [ENV_SETUP.md](./ENV_SETUP.md) - Настройка ENV для всех окружений
- [DEV_GUIDE.md](./DEV_GUIDE.md) - Гид для разработчиков

---

**Последнее обновление**: 2024-10-10  
**Автор**: DevOps Team
