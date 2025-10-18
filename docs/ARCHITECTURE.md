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
│     │  │  ├─ auth.ts
│     │  │  ├─ catalogs.ts
│     │  │  ├─ operations.ts
│     │  │  ├─ reports.ts
│     │  │  └─ notifications.ts
│     │  ├─ constants/
│     │  │  ├─ config.ts
│     │  │  └─ enums.ts
│     │  ├─ schemas/
│     │  │  └─ notifications.ts
│     │  └─ index.ts
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
   │     │  │  ├─ dashboard/
   │     │  │  ├─ cashflow/
   │     │  │  ├─ bdds/
   │     │  │  ├─ dds/
   │     │  │  ├─ planfact/
   │     │  │  └─ utils/
   │     │  ├─ demo/            # демо-система
   │     │  │  ├─ demo.service.ts
   │     │  │  ├─ demo-catalogs.service.ts
   │     │  │  ├─ demo-data-generator.service.ts
   │     │  │  └─ demo.routes.ts
   │     │  ├─ recurrence/     # общая утилита повторений
   │     │  └─ permissions/
   │     ├─ utils/             # date, money, validation
   │     └─ routes.ts          # сборка всех *.routes
   └─ worker/                  # фоновые задачи/cron
      ├─ jest.config.js         # конфиг Jest для тестов воркера
      ├─ src/
      │  ├─ index.ts           # загрузка джобов/планировщика
      │  ├─ jobs/
      │  │  └─ salary.generate.monthly.ts
      │  └─ config/
      │     ├─ env.ts
      │     ├─ logger.ts
      │     └─ prisma.ts
      └─ package.json
```

## Общая схема

- **Frontend (SPA)**: React + TS + Vite + Tailwind + Axios + React Router + Redux Toolkit (управление состоянием).
- **Backend (REST API)**: Node + Express + TS + Prisma.
- **DB**: PostgreSQL (одна БД, multi-tenant через companyId в каждой таблице; индексы по companyId + дате).
- **Cache**: Redis (кэширование отчётов и тяжёлых вычислений).
- **Reverse Proxy**: Nginx (маршрутизация запросов между frontend/backend, SSL termination).
- **Auth**: JWT (access+refresh). Пароли через bcryptjs (pure JavaScript).
- **API Documentation**: автоматическая генерация OpenAPI через swagger-jsdoc + swagger-ui-express.
- **Testing**: Jest (unit/integration тесты), Playwright (E2E тесты).
- **Монорепо**: /apps/web, /apps/api, /apps/worker, /packages/shared (типы/enum-ы).
- **Фоновые задачи** (Worker App):
  - Генерация зарплатных операций по расписанию (ежемесячно) — как отдельный воркер/cron.
  - «Разворачивание» планов в календарную сетку при вычислении отчётов на лету.

## Модули backend

- **auth** (JWT, refresh).
- **companies, users** (включая UI настройки).
- **catalogs**: articles, accounts, departments, counterparties, deals, salaries.
- **operations** (факт).
- **plans** (PlanItem).
- **reports** (dashboard, cashflow/ODDS, plan-vs-fact BDDs, DDS).
- **demo** (автоматическое создание демо-пользователя с тестовыми данными).
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
- **TTL**: 5-15 минут (настраивается, по умолчанию 300 секунд).
- **Инвалидация**: при создании/обновлении операций или планов сбрасываем кэш для соответствующей компании.
- **Формат**: JSON (сериализованный результат отчёта).
- **Реализация**: `apps/api/src/modules/reports/utils/cache.ts`

Конфигурация Redis:

- Хост/порт/пароль через переменные окружения (`REDIS_URL`).
- Для локальной разработки — Redis в docker-compose.
- Подключение: `apps/api/src/config/redis.ts` с retry стратегией.

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

## Worker App

Отдельное приложение для выполнения фоновых задач и cron-задач.

### Основные возможности

- **Генерация зарплатных операций**: Автоматическое создание операций по зарплате ежемесячно
- **Планировщик задач**: Использует `node-cron` для запуска задач по расписанию
- **Graceful shutdown**: Корректное завершение работы с отключением от БД

### Структура

```
apps/worker/src/
├── index.ts              # Точка входа, настройка cron задач
├── jobs/
│   └── salary.generate.monthly.ts  # Генерация зарплатных операций
└── config/
    ├── env.ts            # Переменные окружения
    ├── logger.ts         # Winston логгер
    └── prisma.ts         # Prisma клиент
```

### Расписание

- **Зарплатные операции**: `0 0 1 * *` (1-е число каждого месяца в 00:00)
- **Часовой пояс**: `Europe/Moscow`

### Зависимости

- `@prisma/client` - доступ к базе данных
- `node-cron` - планировщик задач
- `winston` - логирование
- `dotenv` - переменные окружения

### Запуск

```bash
cd apps/worker
pnpm dev    # режим разработки с hot reload
pnpm build  # сборка для production
pnpm start  # запуск production версии
```

## Статус реализации

### ✅ Полностью реализовано

- **API**: Все основные endpoints работают
- **Demo System**: Полная система демо-данных
- **Reports API**: Все типы отчетов реализованы в backend (Dashboard, Cashflow/ОДДС, BDDS, Plan-Fact, DDS)
- **Worker App**: Автоматическая генерация зарплатных операций
- **Caching**: Redis кэширование для отчетов
- **Multi-tenancy**: Полная изоляция данных по companyId
- **Frontend**: Все основные страницы и функционал
- **Notifications System**: Полная система уведомлений с Redux store и UI компонентами
- **UI Customization**: Настройка иконок навигации и тем компании
- **Theme System**: Поддержка светлой/темной темы с автоматическим определением
- **Responsive Design**: Адаптивный дизайн для всех устройств

### ⚠️ Частично реализовано

- **Soft Delete**: Поля есть в схеме, но не используются в сервисах
- **Swagger Documentation**: Основные endpoints документированы, некоторые каталоги без полной документации
- **Dashboard Charts**: График на дашборде помечен как заглушка (требует библиотеку recharts)
- **Plan vs Fact в CashflowTable**: Плановые значения в отчете ОДДС вычисляются как заглушка (TODO комментарии в коде)
- **GeneratedSalaryOperation**: Тип определен в shared, но не используется в коде
- **Article Hierarchy**: Поле parentId есть в схеме, но иерархия не реализована в UI

### ❌ Не реализовано

- **Recurrence System**: Нет отдельной системы для шаблонов повторяющихся операций
- **User Management**: Нет расширенного управления пользователями (роли, права)
- **Import/Export**: Нет импорта банковских выписок или экспорта данных
- **Advanced Permissions**: Только базовая изоляция по companyId
- **Article Hierarchy UI**: Иерархия статей не отображается в интерфейсе
- **Plan vs Fact Calculations**: Плановые значения в отчетах вычисляются как заглушки

### ⚠️ Частично реализовано / Требует доработки

- **Dashboard Charts**: График на дашборде помечен как заглушка (требует библиотеку recharts)
- **Plan vs Fact в CashflowTable**: Плановые значения в отчете ОДДС вычисляются как заглушка
- **GeneratedSalaryOperation**: Тип определен в shared, но не используется в коде
- **Article Hierarchy**: Поле parentId есть в схеме, но иерархия не реализована в UI
