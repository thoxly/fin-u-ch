# ARCHITECTURE

## Структура папок

```
/ (repo root)
├─ package.json                # workspaces + общие скрипты
├─ pnpm-workspace.yaml         # или yarn/npm workspaces
├─ .env.example                # список переменных окружения
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ API.md
│  ├─ DB_SCHEMA.sql
│  └─ DECISIONS.md
├─ ops/                        # инфраструктура
│  ├─ docker/
│  │  ├─ api.Dockerfile
│  │  ├─ web.Dockerfile
│  │  ├─ worker.Dockerfile
│  │  └─ docker-compose.yml    # локалка: api+db+redis+pgadmin
│  ├─ nginx/                   # конфиг реверс-прокси
│  │  ├─ nginx.conf
│  │  └─ ssl/                  # SSL сертификаты (опционально)
│  └─ k8s/                     # манифесты (на будущее)
├─ scripts/                    # утилиты: миграции, сиды, индексы, backup/restore
│  ├─ db-reset.ts
│  ├─ seed-dev.ts
│  ├─ create-indexes.sql
│  ├─ backup-db.ts             # экспорт БД в SQL файл
│  └─ restore-db.ts            # импорт БД из SQL файла
├─ packages/
│  └─ shared/
│     ├─ src/
│     │  ├─ types/             # DTO, enum, общие интерфейсы
│     │  └─ constants/
│     └─ package.json
└─ apps/
   ├─ web/                     # Frontend: React + TS + Vite + Tailwind + Redux Toolkit
   │  ├─ index.html
   │  ├─ vite.config.ts
   │  ├─ jest.config.js         # конфиг Jest
   │  ├─ playwright.config.ts   # конфиг Playwright для E2E тестов
   │  ├─ e2e/                   # E2E тесты (Playwright)
   │  └─ src/
   │     ├─ app/               # init приложения: провайдеры, роутер
   │     │  ├─ router.tsx
   │     │  └─ providers.tsx
   │     ├─ pages/             # роутовые экраны
   │     │  ├─ DashboardPage/
   │     │  ├─ OperationsPage/
   │     │  ├─ PlansPage/
   │     │  └─ ReportsPage/
   │     ├─ features/          # самостоятельные фичи (формы/виджеты)
   │     │  ├─ operation-form/
   │     │  ├─ plan-editor/
   │     │  └─ salary-wizard/
   │     ├─ entities/          # доменные сущности UI-слоя
   │     │  ├─ article/
   │     │  ├─ account/
   │     │  ├─ operation/
   │     │  └─ plan/
   │     ├─ widgets/           # крупные блоки: таблицы/дашборды
   │     │  ├─ CashflowTable/
   │     │  └─ PlanVsFactChart/
   │     ├─ store/            # Redux Toolkit: store, slices, api
   │     │  ├─ store.ts
   │     │  ├─ slices/        # auth, catalogs, operations, plans, reports
   │     │  └─ api/           # RTK Query endpoints
   │     └─ shared/
   │        ├─ api/            # axios-инстанс, rest-хелперы, hooks
   │        ├─ ui/             # базовые UI-компоненты на Tailwind
   │        ├─ lib/            # date/money/utils
   │        └─ config/         # env-маппинг, константы
   ├─ api/                     # Backend: Node + Express + TS + Prisma + PG
   │  ├─ tsconfig.json
   │  ├─ jest.config.js         # конфиг Jest для unit/integration тестов
   │  ├─ prisma/
   │  │  ├─ schema.prisma
   │  │  └─ migrations/
   │  └─ src/
   │     ├─ server.ts          # запуск http
   │     ├─ app.ts             # express app + маршруты + middlewares
   │     ├─ config/
   │     │  ├─ env.ts          # чтение ENV (валидация), конфиги
   │     │  ├─ db.ts           # инициализация Prisma Client
   │     │  ├─ redis.ts        # инициализация Redis Client
   │     │  ├─ swagger.ts      # конфигурация OpenAPI/Swagger
   │     │  └─ logger.ts
   │     ├─ db/
   │     │  ├─ models/         # Prisma модели (автогенерация)
   │     │  └─ seeders/
   │     ├─ middlewares/
   │     │  ├─ auth.ts         # JWT проверка
   │     │  ├─ tenant.ts       # извлечение companyId
   │     │  └─ error.ts        # единый обработчик ошибок
   │     ├─ modules/           # по доменным модулям
   │     │  ├─ auth/
   │     │  │  ├─ auth.model.ts
   │     │  │  ├─ auth.service.ts
   │     │  │  ├─ auth.controller.ts
   │     │  │  └─ auth.routes.ts
   │     │  ├─ companies/
   │     │  ├─ users/
   │     │  ├─ catalogs/
   │     │  │  ├─ articles/
   │     │  │  ├─ accounts/
   │     │  │  ├─ departments/
   │     │  │  ├─ counterparties/
   │     │  │  └─ deals/
   │     │  ├─ salaries/
   │     │  ├─ operations/
   │     │  ├─ plans/
   │     │  ├─ reports/
   │     │  ├─ recurrence/     # общая утилита повторений
   │     │  └─ permissions/
   │     ├─ utils/             # date, money, validation
   │     └─ routes.ts          # сборка всех *.routes
   └─ worker/                  # фоновые задачи/cron
      ├─ jest.config.js         # конфиг Jest для тестов воркера
      ├─ src/
      │  ├─ index.ts           # загрузка джобов/планировщика
      │  ├─ jobs/
      │  │  ├─ salary.generate.monthly.ts
      │  │  └─ plans.expand.on-demand.ts
      │  └─ config/
      │     └─ env.ts
      └─ package.json
```

## Общая схема

- **Frontend (SPA)**: React + TS + Vite + Tailwind + Axios + React Router + Redux Toolkit (управление состоянием).
- **Backend (REST API)**: Node + Express + TS + Prisma.
- **DB**: PostgreSQL (одна БД, multi-tenant через companyId в каждой таблице; индексы по companyId + дате).
- **Cache**: Redis (кэширование отчётов и тяжёлых вычислений).
- **Reverse Proxy**: Nginx (маршрутизация запросов между frontend/backend, SSL termination).
- **Auth**: JWT (access+refresh). Пароли через bcrypt.
- **API Documentation**: автоматическая генерация OpenAPI через swagger-jsdoc + swagger-ui-express.
- **Testing**: Jest (unit/integration тесты), Playwright (E2E тесты).
- **Монорепо**: /apps/web, /apps/api, /packages/shared (типы/enum-ы).
- **Фоновые задачи**:
  - «Разворачивание» планов в календарную сетку при вычислении отчётов на лету (предпочтительно) либо кэш таблицы plan_expanded(month, articleId, amount) (опционально).
  - Генерация зарплатных операций по расписанию (ежемесячно) — как отдельный воркер/cron.
  - Прогон рекуррентных операций (если нужны автовставки факта — можно отложить на v2).

## Модули backend

- **auth** (JWT, refresh).
- **companies, users**.
- **catalogs**: articles, accounts, departments, counterparties, deals, salaries.
- **operations** (факт).
- **plans** (PlanItem).
- **reports** (dashboard, cashflow/ODDS, plan-vs-fact BDDs).
- **recurrence** (общая утилита повторений).
- **salary-engine** (расчёт ФОТ: база/взносы/НДФЛ → операции).
- **permissions** (минимум: в рамках companyId).

## Хранилище и индексация

**Тяжёлые выборки**:

- operations индекс: (companyId, operationDate), (companyId, articleId, operationDate).
- plans индекс: (companyId, startDate, repeat).
- articles индекс: (companyId, parentId).

Денормализации не делаем в MVP. При необходимости — materialized view для ОДДС.

## Отчёты (генерация)

- **ОДДС (факт)**: группировка по activity → type → article → месяц; учёт transfer только на остатках.
- **БДДС (план)**: генерация помесячных сумм из PlanItem (repeat).
- **План/факт**: объединение по ключам (месяц, articleId, …).

### Кэширование отчётов (Redis)

Тяжёлые отчёты (ОДДС, план/факт за большие периоды) кэшируются в Redis:

- **Ключ**: `report:{companyId}:{reportType}:{hash(params)}`.
- **TTL**: 5-15 минут (настраивается).
- **Инвалидация**: при создании/обновлении операций или планов сбрасываем кэш для соответствующей компании.
- **Формат**: JSON (сериализованный результат отчёта).

Конфигурация Redis:

- Хост/порт/пароль через переменные окружения (`REDIS_URL`).
- Для локальной разработки — Redis в docker-compose.

## Nginx Reverse Proxy

Nginx используется как reverse proxy для маршрутизации запросов между frontend и backend.

### Основная конфигурация

Файл: `ops/nginx/nginx.conf`

**Функции:**

1. **Маршрутизация**:
   - `/` → frontend (web) на порту 3000
   - `/api/*` → backend (api) на порту 4000
   - `/api-docs` → Swagger UI документация

2. **SSL Termination**:
   - Обработка HTTPS соединений
   - Сертификаты в `ops/nginx/ssl/` (Let's Encrypt или самоподписанные)
   - Редирект HTTP → HTTPS в production

3. **Load Balancing** (опционально):
   - Балансировка между несколькими инстансами API
   - Health checks для backend сервисов

4. **Кэширование**:
   - Статические файлы frontend (cache-control headers)
   - Сжатие gzip для HTML/CSS/JS

5. **Security Headers**:
   - X-Frame-Options, X-Content-Type-Options
   - CORS настройки для API

### Пример конфигурации

```nginx
upstream api {
    server api:4000;
}

upstream web {
    server web:3000;
}

server {
    listen 80;
    server_name example.com;

    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # API endpoints
    location /api {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Swagger UI
    location /api-docs {
        proxy_pass http://api/api-docs;
    }

    # Frontend
    location / {
        proxy_pass http://web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Деплой

- В docker-compose: Nginx как отдельный сервис, связанный с web и api.
- В production: Nginx запускается первым и слушает порты 80/443.
- Автоматическая перезагрузка конфигурации при изменениях: `nginx -s reload`.
