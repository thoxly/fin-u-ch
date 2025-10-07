# CI/CD Pipeline

Полное описание CI/CD процесса проекта Fin-U-CH с AI Code Review.

## 🎯 Цель

Автоматизировать проверку кода, тестирование и деплой с помощью GitHub Actions и AI-агента Claude. Обеспечить высокое качество кода и безопасность при минимальных затратах времени на ревью.

## 🗂️ Структура проекта

```
/apps
 ├─ web/        # React + Vite frontend
 ├─ api/        # Node + Express backend
 └─ worker/     # background jobs / cron
/packages
 └─ shared/     # типы, enum, общие константы
/ops/docker
 ├─ api.Dockerfile
 ├─ web.Dockerfile
 ├─ worker.Dockerfile
 ├─ docker-compose.yml          # для локальной разработки
 └─ docker-compose.prod.yml     # для production на VPS
/scripts
 ├─ ai-review/                  # AI code review агент
 ├─ backup-db.sh                # backup базы данных
 └─ restore-db.sh               # restore базы данных
/docs
 ├─ ai-context/                 # контекст для AI review
 │   ├─ style-guide.md
 │   ├─ security-checklist.md
 │   └─ common-pitfalls.md
 └─ SETUP_EXTERNAL.md           # инструкции по настройке внешних сервисов
```

## 🚀 Общая схема пайплайна

```
Developer commits → Push to feature branch
            ↓
  Create Pull Request to dev/main
            ↓
    ┌───────────────────────────┐
    │   GitHub Actions CI/CD    │
    ├───────────────────────────┤
    │ 1. Quick Checks           │ ← Lint, Type Check, Format
    │ 2. AI Code Review         │ ← Claude анализирует код
    │ 3. Build                  │ ← Сборка всех пакетов
    │ 4. Tests                  │ ← Unit + Integration тесты
    │ 5. E2E Tests              │ ← Playwright
    │ 6. Security Scan          │ ← Trivy + pnpm audit
    └───────────────────────────┘
            ↓
    All checks passed? → Merge to main
            ↓
    ┌───────────────────────────┐
    │    Production Deploy      │
    ├───────────────────────────┤
    │ 7. Docker Build & Push    │ ← Build images → GHCR
    │ 8. Deploy to VPS          │ ← SSH deploy + migrations
    │ 9. Health Check           │ ← Verify deployment
    └───────────────────────────┘
```

## ⚙️ CI/CD Jobs в деталях

### 1. Quick Checks (1-2 минуты)

**Триггер**: Все PR и push в dev/main

**Что делает**:

- ESLint проверка кода
- Prettier format check
- TypeScript type checking

**Критерии успеха**:

- ✅ Нет lint ошибок
- ✅ Код отформатирован правильно
- ✅ Нет type errors

```yaml
quick-checks:
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Setup pnpm + Node.js
    - Install dependencies
    - Run: pnpm lint
    - Run: pnpm format:check
    - Run: pnpm type-check
```

### 2. AI Code Review (2-5 минут)

**Триггер**: Только Pull Requests

**Что делает**:

- Загружает контекст проекта (docs/ai-context/\*)
- Получает diff PR через GitHub API
- Отправляет в Claude API для анализа
- Парсит ответ и создает комментарии к коду
- Определяет результат review:
  - `REQUEST_CHANGES` если найдены critical/high issues
  - `COMMENT` если только medium/low issues
  - `APPROVE` если проблем не найдено

**Проверяемые аспекты**:

| Категория          | Примеры проверок                                              |
| ------------------ | ------------------------------------------------------------- |
| **Security**       | Missing companyId filter, SQL injection, XSS, exposed secrets |
| **Performance**    | N+1 queries, missing indexes, no pagination                   |
| **Best Practices** | TypeScript `any`, missing error handling, no validation       |
| **Style**          | Code simplicity, naming conventions, proper imports           |
| **Multi-tenancy**  | Data isolation, tenant filtering                              |

**Уровни серьезности**:

- 🔴 **CRITICAL**: Блокирует merge (security vulnerabilities)
- 🟠 **HIGH**: Требует исправления (bugs, data leakage)
- 🟡 **MEDIUM**: Рекомендуется исправить (performance, validation)
- 🟢 **LOW**: Опциональные улучшения (style, minor issues)

**Стоимость**: ~$0.15-0.50 за PR review

```yaml
ai-code-review:
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  steps:
    - Checkout code
    - Install AI review dependencies
    - Build AI review script
    - Run: pnpm start (AI review)
      env:
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 3. Build (5-10 минут)

**Триггер**: Все PR и push

**Что делает**:

- Устанавливает зависимости (pnpm install --frozen-lockfile)
- Собирает пакеты в правильном порядке:
  1. `packages/shared` (типы и константы)
  2. `apps/api` (backend)
  3. `apps/web` (frontend)
  4. `apps/worker` (background jobs)
- Загружает артефакты сборки для следующих джобов

**Критерии успеха**:

- ✅ Все пакеты собираются без ошибок
- ✅ Нет missing dependencies

```yaml
build:
  needs: [quick-checks]
  steps:
    - Install dependencies
    - Build shared: pnpm --filter @fin-u-ch/shared build
    - Build API: pnpm --filter api build
    - Build Web: pnpm --filter web build
    - Build Worker: pnpm --filter worker build
    - Upload build artifacts
```

### 4. Tests (5-10 минут)

**Триггер**: Все PR и push

**Что делает**:

- Запускает PostgreSQL и Redis в Docker
- Применяет Prisma миграции к test database
- Запускает unit тесты (Jest) для API и Web
- Генерирует coverage report
- Загружает coverage в Codecov

**Требования к coverage**:

- Минимум 60% для бизнес-логики
- 100% желательно для критичных модулей (auth, reports, salary-engine)

```yaml
test:
  services:
    postgres: postgres:15-alpine
    redis: redis:7-alpine
  steps:
    - Setup test database
    - Run Prisma migrations
    - Run: pnpm --filter api test --coverage
    - Run: pnpm --filter web test --coverage
    - Upload coverage to Codecov
```

### 5. E2E Tests (10-20 минут)

**Триггер**: Все PR и push

**Что делает**:

- Скачивает build artifacts
- Запускает API и Web сервера
- Устанавливает Playwright browsers
- Запускает E2E тесты в headless режиме
- Сохраняет screenshots/videos при failure

**Тестируемые сценарии**:

- Регистрация и логин
- Создание операции
- Просмотр дашборда
- Генерация отчетов
- CRUD справочников

```yaml
test-e2e:
  needs: [build]
  steps:
    - Download build artifacts
    - Start API and Web servers
    - Install Playwright
    - Run: pnpm test:e2e
    - Upload test results
```

### 6. Security Scan (2-3 минуты)

**Триггер**: Все PR и push

**Что делает**:

- Запускает `pnpm audit` для проверки уязвимостей в зависимостях
- Запускает Trivy для сканирования файловой системы
- Загружает результаты в GitHub Security

**Критерии успеха**:

- ✅ Нет CRITICAL/HIGH уязвимостей
- ⚠️ MEDIUM уязвимости допустимы, но должны быть отслежены

```yaml
security-scan:
  steps:
    - Run: pnpm audit --audit-level=high
    - Run Trivy vulnerability scanner
    - Upload results to GitHub Security
```

### 7. Docker Build & Push (5-10 минут)

**Триггер**: Только push в main

**Что делает**:

- Собирает Docker images для API, Web, Worker
- Тегирует образы:
  - `latest` (всегда указывает на последний main)
  - `<sha>` (конкретный commit)
- Публикует в GitHub Container Registry (GHCR)

**Оптимизации**:

- Multi-stage builds для минимального размера
- Layer caching для ускорения сборки
- BuildKit для параллельной сборки

```yaml
docker-build:
  needs: [build, test, test-e2e, security-scan]
  if: github.ref == 'refs/heads/main'
  steps:
    - Login to GHCR
    - Build and push: ghcr.io/<org>/fin-u-ch-api:latest
    - Build and push: ghcr.io/<org>/fin-u-ch-web:latest
    - Build and push: ghcr.io/<org>/fin-u-ch-worker:latest
```

### 8. Deploy to VPS (2-5 минут)

**Триггер**: Только push в main после успешной сборки Docker images

**Что делает**:

1. Создает backup базы данных
2. Подключается к VPS по SSH
3. Pull свежих Docker images из GHCR
4. Применяет Prisma миграции
5. Перезапускает сервисы с zero-downtime
6. Очищает старые Docker images

**Архитектура на VPS**:

```
┌─────────────────────────────────────┐
│           VPS Server                │
├─────────────────────────────────────┤
│  Nginx (reverse proxy)              │
│    ├─ / → web:80                    │
│    ├─ /api → api:4000               │
│    └─ /api-docs → api:4000/api-docs │
├─────────────────────────────────────┤
│  Docker Compose Services:           │
│    ├─ api (Node.js)                 │
│    ├─ web (Nginx static)            │
│    ├─ worker (Node.js)              │
│    ├─ postgres (PostgreSQL)         │
│    ├─ redis (Redis)                 │
│    └─ nginx (reverse proxy)         │
└─────────────────────────────────────┘
```

```yaml
deploy:
  needs: [docker-build]
  if: github.ref == 'refs/heads/main'
  steps:
    - Setup SSH
    - Create backup
    - Deploy to VPS via SSH:
        - docker compose pull
        - docker compose run --rm api npx prisma migrate deploy
        - docker compose up -d --no-deps api web worker
    - Health check
```

### 9. Notify Results

**Триггер**: Всегда, после завершения всех джобов

**Что делает**:

- Создает summary всех результатов
- Отображается в GitHub Actions UI

## 🔐 GitHub Secrets

Все секреты хранятся в Settings → Secrets and variables → Actions:

| Секрет              | Описание                             | Где используется   |
| ------------------- | ------------------------------------ | ------------------ |
| `ANTHROPIC_API_KEY` | API ключ Claude для AI review        | ai-code-review job |
| `VPS_HOST`          | Хост VPS сервера                     | deploy job         |
| `VPS_USER`          | SSH пользователь                     | deploy job         |
| `VPS_SSH_KEY`       | Приватный SSH ключ                   | deploy job         |
| `GITHUB_TOKEN`      | Автоматически предоставляется GitHub | все jobs           |

**Инструкция по настройке**: См. [SETUP_EXTERNAL.md](./SETUP_EXTERNAL.md)

## 🔒 Branch Protection Rules

### Ветка `main`

- ✅ Require pull request before merging
  - Минимум 1 approval
- ✅ Require status checks:
  - Lint & Type Check
  - AI Code Review
  - Build All Packages
  - Run Tests
  - E2E Tests
  - Security Scan
- ✅ Require conversation resolution
- ❌ Allow force pushes
- ❌ Allow deletions

### Ветка `dev`

- ✅ Require pull request before merging (0 approvals)
- ✅ Require status checks:
  - Lint & Type Check
  - AI Code Review
  - Build All Packages
  - Run Tests
- ❌ Allow force pushes

## 🔄 Git Flow

> **Подробный гид**: См. [GIT_GUIDE.md](./GIT_GUIDE.md) для полного описания Git workflow, команд и best practices.

```
feature/xxx → dev → main → production
```

**Процесс для разработчика**:

1. Создать feature ветку:

```bash
 git checkout -b feature/add-new-report
```

2. Разработка с hot-reload:

```bash
 pnpm --filter api dev
 pnpm --filter web dev
```

3. Перед коммитом (автоматически через husky):
   - ✅ Lint-staged форматирует и проверяет код
   - ✅ Type checking
   - ✅ Commit message validation (Conventional Commits)

4. Создать Pull Request в `dev`:
   - ✅ AI Code Review комментирует код
   - ✅ Все CI checks проходят
   - ✅ Человеческий ревью (минимум 1)

5. После merge в `dev`:
   - Тестирование на dev окружении (если есть)

6. Создать PR из `dev` в `main`

7. После merge в `main`:
   - ✅ Автоматический деплой на production
   - ✅ Backup базы данных
   - ✅ Применение миграций
   - ✅ Health check

## 🛡️ Pre-commit Hooks

Настроены через **husky** и **lint-staged**:

### Pre-commit

- Запускает lint-staged:
  - ESLint --fix на \*.{ts,tsx}
  - Prettier --write на всех файлах
- Type checking всех пакетов
- Quick AI check (локальные проверки)

### Commit-msg

- Валидация формата Conventional Commits:
  - `feat(scope): description`
  - `fix(scope): description`
  - `docs: description`
  - и т.д.

**Установка hooks**:

```bash
pnpm install  # Автоматически запускает husky install
```

## 📊 Monitoring & Health Checks

### Health Check Endpoint

```bash
GET /api/health

Response:
{
"status": "ok",
"uptime": 12345,
"database": "connected",
"redis": "connected"
}
```

### Viewing Logs

```bash
# На VPS
ssh user@vps-host
cd /opt/fin-u-ch

# Все сервисы
docker compose logs -f

# Конкретный сервис
docker compose logs -f api
docker compose logs -f web
docker compose logs -f worker
```

### GitHub Actions Logs

1. Откройте репозиторий на GitHub
2. Перейдите в **Actions**
3. Выберите workflow run
4. Кликните на job для просмотра логов

## 🗄️ Database Migrations

### Локальная разработка

```bash
cd apps/api

# Создать новую миграцию
npx prisma migrate dev --name add_new_field

# Применить миграции
npx prisma migrate deploy

# Откатить миграции
npx prisma migrate reset
```

### Production (автоматически в CI/CD)

Миграции применяются автоматически при деплое:

```bash
docker compose run --rm api npx prisma migrate deploy
```

### Backup перед миграциями

Автоматический backup создается в deploy job перед применением миграций:

```bash
docker compose exec -T postgres pg_dump -U postgres fin_u_ch > backups/backup-$(date +%Y%m%d-%H%M%S).sql
```

## 🧪 Testing Strategy

### Unit Tests (Jest)

**Coverage target**: 60% минимум

**Что тестируем**:

- Утилиты (date, money, validation)
- Сервисы (auth, operations, reports)
- Бизнес-логика (salary calculation, plan expansion)

**Пример**:

```typescript
describe('calculateSalary', () => {
  it('should calculate total with contributions and income tax', () => {
    const result = calculateSalary({
      baseWage: 100000,
      contributionsPct: 30,
      incomeTaxPct: 13,
    });

    expect(result.total).toBe(143000);
    expect(result.contributions).toBe(30000);
    expect(result.incomeTax).toBe(13000);
  });
});
```

### Integration Tests (Jest)

**Что тестируем**:

- API endpoints (request → response)
- Database operations (Prisma)
- Multi-tenancy isolation

**Пример**:

```typescript
describe('POST /api/operations', () => {
  it('should create operation with companyId filter', async () => {
    const response = await request(app)
      .post('/api/operations')
      .set('Authorization', `Bearer ${token}`)
      .send(operationData);

    expect(response.status).toBe(201);
    expect(response.body.companyId).toBe(userCompanyId);
  });
});
```

### E2E Tests (Playwright)

**Что тестируем**:

- Полные пользовательские сценарии
- UI взаимодействия
- Интеграция frontend ↔ backend

**Пример**:

```typescript
test('should create operation and see it in list', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.goto('/operations');
  await page.click('text=Create Operation');
  // ... fill form
  await page.click('text=Save');

  await expect(page.locator('.operation-list')).toContainText('New Operation');
});
```

## 🚨 Troubleshooting

### CI/CD Fails

#### Проблема: AI Review fails с "API key invalid"

**Решение**:

1. Проверьте `ANTHROPIC_API_KEY` в GitHub Secrets
2. Проверьте баланс в Anthropic Console
3. Убедитесь что ключ не истек

#### Проблема: Deploy fails на SSH connection

**Решение**:

1. Проверьте что VPS доступен: `ping vps-host`
2. Проверьте `VPS_SSH_KEY` в Secrets (должен быть приватный ключ)
3. Проверьте firewall: `ufw status`
4. Проверьте вручную: `ssh -i ~/.ssh/key user@vps-host`

#### Проблема: Docker build fails с "out of memory"

**Решение**:

1. Увеличьте memory для Docker в GitHub Actions
2. Оптимизируйте Dockerfile (multi-stage builds)
3. Очистите кэш: `docker system prune -a`

#### Проблема: Migrations fail на production

**Решение**:

1. Проверьте что backup создан
2. Проверьте DATABASE_URL на VPS
3. Проверьте логи PostgreSQL: `docker compose logs postgres`
4. Откатите к предыдущей версии если нужно

### Local Development Issues

#### Проблема: Husky hooks не работают

**Решение**:

```bash
# Переустановить husky
rm -rf .husky
pnpm install
npx husky install
```

#### Проблема: Type check fails локально

**Решение**:

```bash
# Пересобрать shared package
pnpm --filter @fin-u-ch/shared build

# Очистить TypeScript cache
rm -rf apps/*/dist
rm -rf packages/*/dist
```

## 📚 Дополнительные ресурсы

- [GIT_GUIDE.md](./GIT_GUIDE.md) - Работа с Git (коммиты, PR, workflow)
- [SETUP_EXTERNAL.md](./SETUP_EXTERNAL.md) - Настройка GitHub Secrets и VPS
- [DEV_GUIDE.md](./DEV_GUIDE.md) - Гид для разработчиков
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Архитектура проекта
- [docs/ai-context/](../docs/ai-context/) - Контекст для AI review

## 📝 Версионирование

Проект следует **Semantic Versioning** (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes
- **MINOR**: Новые фичи (обратная совместимость)
- **PATCH**: Багфиксы

Версия указывается в `package.json` и автоматически тегируется при деплое в production.

---

**Последнее обновление**: 2024-01-07  
**Версия документа**: 2.0
