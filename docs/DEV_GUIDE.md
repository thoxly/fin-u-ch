# DEV_GUIDE

Короткий практический гид для разработчиков. Описывает, как поднять проект локально, как работать с репозиторием, как писать код и как он уезжает в прод. Без воды.

---

## 1) Источники истины и приоритет

1. **ARCHITECTURE.md** — структура монорепо, модули, общая схема.
2. **CI_CD.md** — как собираем/деплоим (VPS + Docker Compose, GHCR, миграции в CI).
3. **DOMAIN_MODEL.md** — сущности и правила расчётов.
4. **API.md** — эндпоинты и контракт.
5. **PROJECT_OVERVIEW.md** — контекст и границы MVP.

> Примечание: упоминания про Vercel/Render в PROJECT_OVERVIEW устарели. Актуальный деплой — **VPS + Docker Compose**.

---

## 2) Предпосылки

- Node 18+, pnpm 9+ (для локальной разработки вне Docker).
- Docker / Docker Compose (локально и в проде).
- GitHub аккаунт и доступ к репозиторию/Secrets.

---

## 3) Репозиторий (монорепо)

```
/
├─ apps/
│  ├─ web/      # React + TS + Vite + Tailwind
│  ├─ api/      # Node + Express + TS + Prisma
│  └─ worker/   # фоновые задачи/cron
├─ packages/
│  └─ shared/   # общие типы/enum/константы
├─ ops/
│  └─ docker/   # Dockerfile'ы и docker-compose.yml (локально)
├─ scripts/     # миграции/сиды/утилиты
└─ docs/        # архитектура, API, CI/CD и т.д.
```

---

## 4) Окружения и переменные

Минимум переменных (все есть в `env.example`, секреты — в GitHub Secrets):

- `DATABASE_URL` — строка подключения к Postgres
  - **Сценарий 1 (гибридный):** `postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev`
  - **Сценарий 2 (полный Docker):** `postgresql://postgres:postgres@localhost:5433/fin_u_ch_dev`
- `REDIS_URL` — строка подключения к Redis (для кэша отчётов)
  - **Сценарий 1:** `redis://localhost:6379`
  - **Сценарий 2:** `redis://localhost:6380`
- `JWT_SECRET` — секрет для JWT
- `VITE_API_URL` — API URL для frontend
  - **Локальная разработка:** `/api` (через Vite proxy)
  - **Production:** `/api` (через Nginx)
- `ANTHROPIC_API_KEY` — для AI Code Review
- Деплой на VPS: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

> **Важно:** Для локальной разработки (Сценарий 1) используйте стандартные порты (5432, 6379).  
> Файл `.env` в корне автоматически подхватывается всеми приложениями. В CI секреты берутся из GitHub Secrets.

---

## 5) Быстрый старт локально

### Сценарий 1: Гибридный подход (рекомендуется ⭐)

**Что:** Docker только для БД/Redis, приложения локально с горячей перезагрузкой

1. Скопируй переменные:

   ```bash
   cp env.example .env
   ```

2. Подними инфраструктуру (PostgreSQL, Redis):

   ```bash
   cd ops/docker
   docker-compose up -d
   # Порты: PostgreSQL 5432, Redis 6379
   ```

3. Прогони миграции:

   ```bash
   cd apps/api
   npx prisma migrate deploy
   ```

4. Запусти приложения локально:

   ```bash
   # В отдельных терминалах
   cd apps/api && pnpm dev      # localhost:4000 (nodemon - горячая перезагрузка)
   cd apps/web && pnpm dev      # localhost:5173 (Vite HMR)
   cd apps/worker && pnpm dev   # фоновые задачи

   # Или все вместе из корня
   pnpm dev
   ```

5. Открой браузер: **http://localhost:5173**

**Архитектура:**

```
Браузер → localhost:5173/api/...
       ↓ (Vite Proxy из vite.config.ts)
       → localhost:4000/api/...
       ↓ (Express API)
       → Docker: PostgreSQL (5432), Redis (6379)
```

**Плюсы:**

- ✅ Мгновенная горячая перезагрузка (nodemon + Vite HMR)
- ✅ Легко дебажить, видны все логи
- ✅ Быстрая разработка
- ✅ Изолированная инфраструктура в Docker

---

### Сценарий 2: Полный стек в Docker

**Что:** ВСЁ в Docker (API, Web, Worker, Nginx, PostgreSQL, Redis)  
**Когда:** Тестирование перед деплоем, проверка Nginx конфигурации

1. Собери образы:

   ```bash
   pnpm docker:build
   ```

2. Запусти полный стек:

   ```bash
   pnpm docker:up
   # Порты: PostgreSQL 5433 (!), Redis 6380 (!) - нестандартные
   ```

3. Прогони миграции в контейнере:

   ```bash
   cd ops/docker
   docker-compose -f docker-compose.local.yml exec api npx prisma migrate deploy
   ```

4. Открой браузер: **http://localhost** (через Nginx)

**Доступ:**

- `http://localhost` → Frontend через Nginx (как в production)
- `http://localhost/api` → API через Nginx (как в production)
- `http://localhost:4000` → API напрямую
- `http://localhost:8080` → Frontend напрямую

**Плюсы:**

- ✅ Полная имитация production
- ✅ Тестирует Nginx роутинг
- ✅ Проверяет Docker образы

**Минусы:**

- ❌ Нужно пересобирать при изменениях
- ❌ Нет горячей перезагрузки

**Почему нестандартные порты (5433, 6380)?**  
Чтобы избежать конфликтов с локальными PostgreSQL/Redis или с Сценарием 1.
Можно одновременно держать инфраструктуру на 5432/6379 и полный стек на 5433/6380.

---

### Переключение между сценариями

**С гибридного → на полный Docker:**

```bash
# 1. Остановить локальные процессы (Ctrl+C)
# 2. Остановить инфраструктуру
cd ops/docker && docker-compose down
# 3. Запустить полный стек
pnpm docker:up
```

**С полного Docker → на гибридный:**

```bash
# 1. Остановить полный стек
pnpm docker:down
# 2. Запустить только инфраструктуру
cd ops/docker && docker-compose up -d
# 3. Запустить приложения локально
pnpm dev
```

---

## 6) Git‑флоу и PR‑процесс

> **Подробный гид**: См. [GIT_GUIDE.md](./GIT_GUIDE.md) для детального описания Git workflow.

**Краткая версия:**

- Ветки: `feature/<...>` → `dev` → `main`.
- Коммиты: **Conventional Commits** (пример: `feat: add planfact endpoint`).
- Перед PR:
  ```bash
  pnpm lint
  pnpm test           # запуск Jest тестов
  pnpm test:e2e       # запуск Playwright E2E тестов
  pnpm build
  npm run ai-review   # локальная проверка агентом (если скрипт включён)
  ```
- Открываешь PR в `dev` или в `main` (по политике релизов). В CI пойдут: lint/build/test + AI review. Мержим только при ✅ AI review + ✅ человеческий ревью.

**Чеклист PR**

- [ ] Миграции присутствуют и откатываемы.
- [ ] API‑контракты задокументированы (docs/API.md) и не ломают обратную совместимость без версии.
- [ ] Обновлены индексы/квери под большие объёмы (operations/plans).
- [ ] UI не ломает базовую навигацию, нет блокирующих регрессий.
- [ ] Обновлён CHANGELOG.md (кратко: Added/Changed/Fixed/Removed).

---

## 7) Бэкенд: правила и конвенции

**Модули**: auth, companies, users, catalogs (articles/accounts/departments/counterparties/deals/salaries), operations, plans, reports, recurrence, salary‑engine, permissions.

**Тенантность**

- Всегда фильтруем/пишем по `companyId`.
- Middleware `tenant` извлекает `companyId` из JWT/контекста.

**Модели/миграции**

- Prisma. Миграции создаются через `prisma migrate dev` и именуются автоматически.
- Откаты через `prisma migrate reset` или откат к предыдущей миграции.

**Индексы (минимум)**

- operations: `(companyId, operationDate)`, `(companyId, articleId, operationDate)`.
- plans: `(companyId, startDate, repeat)`.
- articles: `(companyId, parentId)`.

**Отчёты**

- ОДДС (факт): группировка по `activity → type → article → месяц`; `transfer` — только для остатков.
- БДДС (план): разворачиваем `PlanItem.repeat` в помесячные суммы.
- План/факт: ключи сравнения — месяц, `articleId`, `departmentId?`, `dealId?`.

**Зарплаты**

- `Salary`: baseWage, contributionsPct (по умолчанию 30), incomeTaxPct (по умолчанию 13), periodicity=monthly.
- Генерация: ручной триггер `/salary-engine/run {month}` или фоневая джоба.
- Для MVP фиксируем две проводки расхода: ФОТ (начисление) и НДФЛ.

**API (срез)**

- Auth: `/auth/register|login|refresh`.
- Справочники: `/articles|accounts|departments|counterparties|deals|salaries` CRUD.
- Факт: `/operations` (filters: type, dateFrom/to, articleId, dealId, departmentId, counterpartyId).
- План: `/plans` CRUD + фильтры.
- Отчёты: `/reports/dashboard|cashflow|bdds|planfact`.

**Ошибки/валидация**

- Единый error middleware.
- HTTP коды по смыслу (400 валидация, 401/403 auth, 404 not found, 409 конфликт, 500 internal).

---

## 8) Фронтенд: структура и правила

- **pages/** — роутовые страницы.
- **features/** — изолируемые фичи (формы, редакторы).
- **entities/** — доменные обвязки UI.
- **widgets/** — крупные композиции (таблицы/дашборды/чарты).
- **shared/** — api‑клиент (axios), ui‑кит на Tailwind, lib (date/money), config.
- **store/** — Redux Toolkit store (slices, actions, selectors).

**Базовые принципы**

- Вся работа с сервером — через общий axios‑инстанс (JWT в `Authorization: Bearer ...`).
- Денежные значения/валюты форматируем утилитами из `shared/lib`.
- Компоненты не «знают» про тенантность — companyId идёт с JWT.

**State Management (Redux Toolkit)**

- Глобальное состояние управляется через Redux Toolkit.
- **Slices**: auth, catalogs (articles/accounts/etc), operations, plans, reports.
- **RTK Query**: для кэширования API-запросов и автоматической инвалидации.
- **Структура**: `apps/web/src/store/` содержит `store.ts`, `slices/`, `api/`.
- Локальное состояние форм — через React useState/useReducer (не всё в Redux).

---

## 9) Worker (фоновые задачи)

- В `apps/worker/src/jobs/` — отдельные файлы джоб.
- Примеры: `salary.generate.monthly.ts`, `plans.expand.on-demand.ts`.
- Планирование: cron/interval. Конфиги — в `worker/src/config/env.ts`.

---

## 10) CI/CD (как это живёт)

- Триггеры: `push dev` — проверки; `push main` — build → migrate → build docker → deploy.
- Контейнеры публикуются в GHCR с тегом `<app>-<service>:<sha>`.
- Деплой: SSH на VPS → `docker-compose pull && up -d` → auto‑migrate.

**Релиз‑чеклист**

- [ ] Все миграции в `main` и протестированы на стейдже.
- [ ] Семантыка API не сломана для web.
- [ ] Конфиг/Secrets в актуальном состоянии.
- [ ] CHANGELOG.md обновлён.

**Роллбек**

- На VPS:
  1. выбрать предыдущие теги образов,
  2. `docker-compose pull` нужные теги,
  3. `docker-compose up -d`,
  4. откатить миграции при необходимости: `npx prisma migrate reset` (или откат к предыдущей миграции).

---

## 11) Версионирование и миграция данных

### Семантическое версионирование

Проект следует принципам **Semantic Versioning** (`MAJOR.MINOR.PATCH`):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes в API (несовместимость с предыдущими версиями).
- **MINOR** (1.0.0 → 1.1.0): Добавление новых эндпоинтов, функциональности (обратная совместимость).
- **PATCH** (1.0.0 → 1.0.1): Исправление багов, мелкие улучшения.

**Политика версионирования API**:

- Версия API указывается в `package.json` и экспортируется через `/api/version`.
- При добавлении новых эндпоинтов увеличиваем MINOR версию.
- При breaking changes (изменение контракта, удаление полей) — MAJOR версию.
- Изменения версии документируются в `CHANGELOG.md`.

### Скрипты backup/restore

Для экспорта и импорта данных БД используем скрипты в `scripts/`:

**Backup данных** (`scripts/backup-db.ts` или `.sh`):

```bash
pnpm run backup-db
# или через npm: npm run backup-db
```

Скрипт:

- Создаёт дамп PostgreSQL через `pg_dump`.
- Сохраняет в `backups/backup-YYYY-MM-DD-HH-mm-ss.sql`.
- Опционально архивирует в `.tar.gz`.
- Переменные: `DATABASE_URL` из `.env`.

**Restore данных** (`scripts/restore-db.ts` или `.sh`):

```bash
pnpm run restore-db -- backups/backup-2024-01-15.sql
# или через npm: npm run restore-db backups/backup-2024-01-15.sql
```

Скрипт:

- Восстанавливает данные через `psql < backup.sql`.
- **Внимание**: перезаписывает текущие данные (предупреждение перед выполнением).
- Опционально выполняет миграции после восстановления.

**Интеграция в CI/CD**:

- Автоматический backup перед деплоем на production (в GitHub Actions).
- Сохранение backup'ов в артефакты или external storage (S3/GCS).

---

## 12) Частые сценарии (playbooks)

**Добавить новую сущность-справочник**

1. Миграция таблицы + индексы.
2. Модель Prisma в schema.prisma + ассоциации.
3. Сервис/контроллер/роуты (CRUD).
4. Запись в docs/API.md + аннотации Swagger JSDoc.
5. UI: `entities/<name>` + форма в `features/<name>-form` + список в `widgets/`.
6. Мини‑тесты сервиса и схемы валидации (Jest).

**Добавить отчёт**

1. SQL/агрегация в модуле `reports`.
2. Кэширование через Redis (ключ `report:{companyId}:{reportType}:{hash}`).
3. Пагинация/materialized view — по необходимости.
4. DTO в `packages/shared`.
5. Swagger аннотации для эндпоинта.
6. Таблица/чарт в `widgets/`.

**Добавить повторяемую плановую операцию**

1. Поля `repeat`/даты — валидация.
2. Генерация помесячных сумм на лету.
3. Учитывать объединение по ключам план/факт.

**Хотфикс в прод**

- Ветка `hotfix/<id>` → PR в `main` → CI деплой. После — мерджим `main → dev`.

---

## 13) Стайлгайд и качество

- ESLint + Prettier обязательны.
- Типы/DTO — в `packages/shared`.
- Нулебезопасность, проверка входных данных, защита от SQL‑инъекций.
- Минимум unit‑тестов в модулях с бизнес‑логикой (reports, salary‑engine).
- AI‑review — не пропускаем предупреждения «критичного» уровня.

### Принцип простоты кода

Мы решаем практические задачи, а не участвуем в олимпиаде по программированию.
Код должен быть максимально очевидным, легко читаемым и предсказуемым для любого разработчика в команде.

**Основные правила:**

- Пиши код, который проще читать, чем писать.
- Отдавай предпочтение простым структурам и линейной логике.
- Избегай "умных" решений, которые экономят 3 строки, но ломают читаемость.
- Если задачу можно решить в 10 понятных строк — не сокращай её до 3 "эффектных".
- Комментарии нужны для объяснения почему, а не что.

**Метрики простоты (ориентиры):**

| Показатель                            | Цель                     | Комментарий                                         |
| ------------------------------------- | ------------------------ | --------------------------------------------------- |
| Средняя когнитивная сложность функции | ≤ 10                     | Проверяется линтером или SonarQube                  |
| Длина функции                         | ≤ 40 строк               | Длиннее — выноси в подфункции                       |
| Вложенность условий                   | ≤ 3 уровня               | Лучше ранний return, чем if-матрёшки                |
| Использование сторонних абстракций    | Только при необходимости | Не плодим "магические" хелперы                      |
| Именование                            | Самоочевидное            | Не заставляй читать комментарии, чтобы понять смысл |

Цель — код, который поддержит любой член команды без контекста автора.
Простота — это не примитивность, а высшая форма зрелости инженерного мышления.

### Тестирование

**Jest (unit/integration тесты)**

- Тесты размещаются рядом с кодом: `*.test.ts` или `*.spec.ts`.
- Конфиг: `jest.config.js` в корне каждого app (api/web/worker).
- Покрытие: минимум 60% для модулей бизнес-логики (reports, salary-engine, планы).
- Запуск: `pnpm test` (все тесты), `pnpm test:watch` (watch mode).

**Playwright (E2E тесты)**

- Тесты в `apps/web/e2e/` или отдельной папке `tests/e2e/`.
- Конфиг: `playwright.config.ts` в корне web или проекта.
- Критичные флоу: регистрация, логин, создание операции, просмотр отчётов.
- Запуск: `pnpm test:e2e` (в headless режиме), `pnpm test:e2e:ui` (с UI).
- В CI запускаем в headless режиме автоматически на каждый PR.

**Конфигурация Jest** (`jest.config.js`):

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // для api/worker, 'jsdom' для web
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/index.ts'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
```

**Конфигурация Playwright** (`playwright.config.ts`):

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

**Рекомендации по тестированию:**

1. **Unit тесты** (Jest):
   - Покрывают чистые функции, утилиты, сервисы.
   - Мокируем внешние зависимости (БД, API).
   - Примеры: валидация, расчёты зарплаты, генерация отчётов.

2. **Integration тесты** (Jest):
   - Тестируют взаимодействие между слоями (контроллер + сервис + БД).
   - Используем тестовую БД (in-memory или отдельный инстанс).
   - Примеры: создание операции через API, получение отчёта.

3. **E2E тесты** (Playwright):
   - Тестируют полные пользовательские сценарии.
   - Реальный браузер, реальные клики.
   - Примеры: регистрация → создание операции → просмотр дашборда.

---

## 14) Безопасность

- Пароли — только **bcryptjs** (pure JavaScript реализация, без нативных зависимостей).
- JWT (access/refresh). Храним access в памяти клиента, refresh — по политике (MVP: в httpOnly cookie или в хранилище сервера).
- Логи без персональных данных/секретов.

---

## 15) Краткая справка по технологиям

### Redux Toolkit (Frontend State Management)

- **Где**: `apps/web/src/store/`
- **Зачем**: Централизованное управление состоянием приложения
- **Что**: Slices для auth, catalogs, operations, plans, reports
- **RTK Query**: Автоматическое кэширование и инвалидация API запросов

### Redis (Cache)

- **Где**: Отдельный сервис в docker-compose, подключение через `config/redis.ts`
- **Зачем**: Кэширование тяжёлых отчётов (ОДДС, план/факт)
- **TTL**: 5-15 минут
- **Инвалидация**: При изменении операций/планов

### Jest (Unit/Integration Testing)

- **Где**: `*.test.ts` / `*.spec.ts` рядом с кодом
- **Конфиг**: `jest.config.js` в api/web/worker
- **Запуск**: `pnpm test`, `pnpm test:watch`
- **Покрытие**: минимум 60% для бизнес-логики

### Playwright (E2E Testing)

- **Где**: `apps/web/e2e/`
- **Конфиг**: `playwright.config.ts`
- **Запуск**: `pnpm test:e2e`, `pnpm test:e2e:ui`
- **Браузеры**: Chromium, Firefox, WebKit

### OpenAPI / Swagger

- **URL**: `/api-docs`
- **Конфиг**: `apps/api/src/config/swagger.ts`
- **Аннотации**: JSDoc комментарии в контроллерах
- **Формат**: OpenAPI 3.0

### Nginx Reverse Proxy

- **Конфиг**: `ops/nginx/nginx.conf`
- **Роутинг**: `/` → web, `/api/*` → api, `/api-docs` → swagger
- **SSL**: Сертификаты в `ops/nginx/ssl/`
- **Порты**: 80 (HTTP), 443 (HTTPS)

### Семантическое версионирование

- **Формат**: MAJOR.MINOR.PATCH
- **MAJOR**: Breaking changes
- **MINOR**: Новые фичи (обратная совместимость)
- **PATCH**: Багфиксы
- **Где**: `package.json`, Git теги после деплоя

### Backup/Restore Scripts

- **Backup**: `pnpm run backup-db` → `backups/backup-YYYY-MM-DD.sql`
- **Restore**: `pnpm run restore-db -- path/to/backup.sql`
- **CI/CD**: Автоматический backup перед миграциями в production

---

## 16) Термины

- **ОДДС** — отчёт о движении денежных средств (факт).
- **БДДС** — бюджет движения денежных средств (план).
- **ФОТ** — фонд оплаты труда.
- **Tenant** — компания в multi‑tenant модели.
- **RTK Query** — часть Redux Toolkit для работы с API.
- **SemVer** — Semantic Versioning (семантическое версионирование).
- **E2E** — End-to-End тестирование.

---

## 17) Связанные документы

- [GIT_GUIDE.md](./GIT_GUIDE.md) — детальный гид по работе с Git
- [CI_CD.md](./CI_CD.md) — CI/CD pipeline и AI review
- [ARCHITECTURE.md](./ARCHITECTURE.md) — архитектура проекта
- [API.md](./API.md) — API документация
- [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) — доменная модель

## 18) Контакты/поддержка

- Вопросы по архитектуре/деплою — к тимлиду.
- Правки в документацию — PR в `docs/` с коротким описанием изменения.
