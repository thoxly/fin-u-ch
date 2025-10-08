# IMPLEMENTATION ROADMAP

План пошаговой реализации проекта с нуля до production-деплоя.

**Текущее состояние**: Есть только документация. Нет ни одной строки кода, нет настроек, есть пустой VPS с SSH-доступом и пустой GitHub репозиторий.

**Цель**: Полностью работающая система финансового учета с автоматическим деплоем на VPS.

---

## 📊 Общая временная оценка

- **Неделя 1 (7 дней)**: Backend + Database
- **Неделя 2 (7 дней)**: Frontend + Reports
- **Неделя 3 (3 дня)**: Deployment + Infrastructure
- **Итого**: ~17 рабочих дней для MVP

---

## ФАЗА 1: Подготовка локального окружения

**Длительность**: 1 день  
**Статус**: ✅ Completed

### 1.1 Настройка локальной машины

- [x] Проверить/установить Node.js 18+ (v23.7.0 ✅)
  ```bash
  node --version  # должно быть >= 18.0.0
  ```
- [x] Проверить/установить pnpm 9+ (10.11.0 ✅)
  ```bash
  npm install -g pnpm@latest
  pnpm --version  # должно быть >= 9.0.0
  ```
- [x] Проверить/установить Docker и Docker Compose (28.3.0, v2.38.1 ✅)
  ```bash
  docker --version
  docker-compose --version
  ```
- [x] Настроить Git и SSH для GitHub (Git установлен ✅)
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your@email.com"
  ssh -T git@github.com
  ```
- [x] Клонировать репозиторий (если еще не сделано) (✅)
  ```bash
  git clone git@github.com:<org>/fin-u-ch.git
  cd fin-u-ch
  ```

### 1.2 Создание структуры монорепозитория

- [x] Создать корневой `package.json` с workspaces ✅
- [x] Создать `pnpm-workspace.yaml` ✅
- [x] Создать `.gitignore` (node_modules, .env, dist, build, .DS_Store) ✅
- [x] Создать `env.example` с шаблоном переменных ✅
- [x] Создать структуру директорий: ✅
  ```
  mkdir -p apps/web apps/api apps/worker
  mkdir -p packages/shared
  mkdir -p ops/docker ops/nginx
  mkdir -p scripts
  ```

**Критерий готовности**: ✅ Структура папок создана, `pnpm install` выполнен успешно (130 пакетов)

---

## ФАЗА 2: Базовая настройка общих компонентов

**Длительность**: 1 день  
**Статус**: ✅ Completed

### 2.1 Packages/Shared (общие типы и константы)

- [x] Инициализировать `packages/shared/package.json`
  ```json
  {
    "name": "@fin-u-ch/shared",
    "version": "0.1.0",
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "scripts": {
      "build": "tsc",
      "dev": "tsc --watch"
    }
  }
  ```
- [x] Настроить TypeScript (`tsconfig.json`)
- [x] Создать файловую структуру:
  ```
  packages/shared/src/
    ├── types/
    │   ├── auth.ts         # User, Company, Tokens
    │   ├── catalogs.ts     # Article, Account, Department, etc.
    │   ├── operations.ts   # Operation, PlanItem
    │   └── reports.ts      # Dashboard, Cashflow, PlanFact
    ├── constants/
    │   ├── enums.ts        # OperationType, Activity, Periodicity
    │   └── config.ts       # валюты, проценты
    └── index.ts            # re-exports
  ```
- [x] Реализовать основные типы из DOMAIN_MODEL.md:
  - `Company`, `User`
  - `Account`, `Department`, `Counterparty`, `Deal`, `Article`
  - `Operation`, `PlanItem`, `Salary`
  - Enum: `OperationType`, `Activity`, `Periodicity`, `CounterpartyCategory`
- [x] Добавить build скрипт и проверить сборку

### 2.2 Конфигурация линтеров и форматеров

- [x] Установить зависимости в корне (уже установлены в Фазе 1)
- [x] Создать `.eslintrc.js` в корне (уже создан в Фазе 1)
- [x] Создать `.prettierrc` в корне (уже создан в Фазе 1)
- [x] Добавить скрипты в корневой `package.json` (уже добавлены)
- [x] Проверить: `pnpm lint` и `pnpm format`

**Критерий готовности**: ✅ `pnpm build` в корне собирает `packages/shared` без ошибок.

---

## ФАЗА 3: Backend API

**Длительность**: 3-4 дня  
**Статус**: ✅ Completed

### 3.1 Базовая структура API

- [ ] Инициализировать `apps/api/package.json`
- [ ] Установить зависимости:
  ```bash
  cd apps/api
  pnpm add express cors helmet dotenv
  pnpm add bcryptjs jsonwebtoken
  pnpm add @prisma/client prisma
  pnpm add ioredis
  pnpm add -D typescript ts-node nodemon @types/node @types/express
  pnpm add -D @types/bcryptjs @types/jsonwebtoken @types/cors
  ```
- [ ] Настроить TypeScript (`tsconfig.json`)
- [ ] Создать структуру файлов:
  ```
  apps/api/src/
    ├── server.ts           # entry point
    ├── app.ts              # express app setup
    ├── config/
    │   ├── env.ts          # environment variables
    │   ├── db.ts           # Prisma client
    │   ├── redis.ts        # Redis client
    │   ├── logger.ts       # winston/pino
    │   └── swagger.ts      # OpenAPI config
    ├── middlewares/
    │   ├── error.ts        # error handler
    │   ├── auth.ts         # JWT verification
    │   └── tenant.ts       # companyId extraction
    ├── utils/
    │   ├── jwt.ts          # token generation
    │   ├── hash.ts         # bcryptjs helpers
    │   └── validation.ts   # input validation
    └── modules/
        └── (будут созданы далее)
  ```
- [ ] Создать `server.ts` и `app.ts` (базовый Express сервер)
- [ ] Добавить скрипты в `package.json`:
  ```json
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
  ```
- [ ] Создать `nodemon.json` для hot-reload

### 3.2 Настройка Prisma и базы данных

- [ ] Инициализировать Prisma:
  ```bash
  cd apps/api
  npx prisma init
  ```
- [ ] Создать `prisma/schema.prisma` со всеми моделями (из DOMAIN_MODEL.md):
  - `Company` (id, name, currencyBase, createdAt, updatedAt, deletedAt)
  - `User` (id, companyId, email, passwordHash, isActive, ...)
  - `Account` (id, companyId, name, number, currency, openingBalance, excludeFromTotals, isActive, ...)
  - `Department` (id, companyId, name, description, ...)
  - `Counterparty` (id, companyId, name, inn, category, ...)
  - `Deal` (id, companyId, name, amount, departmentId, counterpartyId, ...)
  - `Article` (id, companyId, name, parentId, type, activity, indicator, isActive, ...)
  - `Operation` (id, companyId, type, operationDate, amount, currency, accountId, sourceAccountId, targetAccountId, articleId, ...)
  - `PlanItem` (id, companyId, type, startDate, endDate, amount, currency, articleId, repeat, status, ...)
  - `Salary` (id, companyId, employeeCounterpartyId, departmentId, baseWage, contributionsPct, incomeTaxPct, periodicity, effectiveFrom, effectiveTo, ...)
  - `GeneratedSalaryOperation` (опционально)
- [ ] Добавить индексы:
  - `@@index([companyId, operationDate])` на Operation
  - `@@index([companyId, articleId, operationDate])` на Operation
  - `@@index([companyId, startDate, repeat])` на PlanItem
  - `@@index([companyId, parentId])` на Article
- [ ] Создать первую миграцию:
  ```bash
  npx prisma migrate dev --name init
  ```
- [ ] Создать seed-скрипт `scripts/seed-dev.ts`:
  - Создать тестовую компанию
  - Создать тестового пользователя
  - Создать базовые статьи (доходы/расходы)
  - Создать несколько счетов
  - Создать тестовые операции

### 3.3 Модули Auth и базовые

- [ ] **auth module** (`src/modules/auth/`):
  - `auth.service.ts`: register, login, refresh, hash password, verify password, generate tokens
  - `auth.controller.ts`: POST /register, POST /login, POST /refresh
  - `auth.routes.ts`: роутинг
  - Типы: RegisterDTO, LoginDTO, TokensResponse
- [ ] **companies module** (`src/modules/companies/`):
  - CRUD компаний (для будущего admin-интерфейса)
- [ ] **users module** (`src/modules/users/`):
  - CRUD пользователей
  - GET /me (текущий пользователь)
- [ ] Middleware `middlewares/auth.ts`:
  - Проверка JWT токена
  - Извлечение userId из payload
- [ ] Middleware `middlewares/tenant.ts`:
  - Извлечение companyId из User
  - Добавление в req.companyId
- [ ] Middleware `middlewares/error.ts`:
  - Единый обработчик ошибок
  - HTTP статус коды (400, 401, 403, 404, 409, 500)
- [ ] Подключить модули в `app.ts`

### 3.4 Справочники (Catalogs)

- [ ] **articles module** (`src/modules/catalogs/articles/`):
  - CRUD: GET, POST, PATCH, DELETE /api/articles
  - Поддержка иерархии (parentId)
  - Фильтр по companyId
- [ ] **accounts module** (`src/modules/catalogs/accounts/`):
  - CRUD: GET, POST, PATCH, DELETE /api/accounts
  - Поля: currency, openingBalance, excludeFromTotals
- [ ] **departments module** (`src/modules/catalogs/departments/`):
  - CRUD: GET, POST, PATCH, DELETE /api/departments
- [ ] **counterparties module** (`src/modules/catalogs/counterparties/`):
  - CRUD: GET, POST, PATCH, DELETE /api/counterparties
  - Поле category (enum: supplier|customer|gov|employee|other)
- [ ] **deals module** (`src/modules/catalogs/deals/`):
  - CRUD: GET, POST, PATCH, DELETE /api/deals
  - Связи с department, counterparty
- [ ] **salaries module** (`src/modules/catalogs/salaries/`):
  - CRUD: GET, POST, PATCH, DELETE /api/salaries
  - Поля расчета: baseWage, contributionsPct, incomeTaxPct

### 3.5 Операции и Планы

- [ ] **operations module** (`src/modules/operations/`):
  - CRUD: GET, POST, PATCH, DELETE /api/operations
  - GET фильтры: type, dateFrom, dateTo, articleId, dealId, departmentId, counterpartyId
  - Валидация:
    - Для income/expense: обязательны accountId, articleId
    - Для transfer: обязательны sourceAccountId, targetAccountId (должны отличаться)
  - Поддержка валют (currency)
- [ ] **plans module** (`src/modules/plans/`):
  - CRUD: GET, POST, PATCH, DELETE /api/plans
  - Поля repeat: none|daily|weekly|monthly|quarterly|semiannual|annual
  - Поле status: active|paused|archived
  - Генерация помесячных сумм (утилита в service):
    - Функция expandPlan(planItem, startDate, endDate) → MonthlyAmount[]

### 3.6 Отчеты

- [ ] **reports module** (`src/modules/reports/`):
  - Структура:
    ```
    reports/
      ├── dashboard/
      │   ├── dashboard.service.ts
      │   ├── dashboard.controller.ts
      │   └── dashboard.routes.ts
      ├── cashflow/      # ОДДС (факт)
      ├── bdds/          # БДДС (план)
      ├── planfact/      # План vs Факт
      └── utils/
          ├── cache.ts   # Redis cache helpers
          └── date.ts    # date range helpers
    ```

- [ ] **dashboard report** (`reports/dashboard/`):
  - GET /api/reports/dashboard?periodFrom=...&periodTo=...&mode=plan|fact|both
  - Возвращает:
    - Общие суммы: income, expense, netProfit
    - Остатки по счетам: balancesByAccount[]
    - Временные серии для графиков: series[]
  - Кэшировать результаты в Redis

- [ ] **cashflow report** (`reports/cashflow/`):
  - GET /api/reports/cashflow?periodFrom=...&periodTo=...&activity=...
  - ОДДС (факт): группировка по activity → type → article → месяц
  - Transfer операции не влияют на доходы/расходы, только на остатки
  - Формат ответа: таблица по месяцам

- [ ] **bdds report** (`reports/bdds/`):
  - GET /api/reports/bdds?periodFrom=...&periodTo=...
  - БДДС (план): разворачивание PlanItem с учетом repeat
  - Группировка по месяцам и статьям
  - Формат ответа: таблица плана

- [ ] **planfact report** (`reports/planfact/`):
  - GET /api/reports/planfact?periodFrom=...&periodTo=...&level=article|department|deal
  - Сравнение план vs факт
  - Ключи сравнения: month, articleId, departmentId?, dealId?
  - Формат: rows[] с полями: key, month, plan, fact, delta

### 3.7 Redis и кэширование

- [ ] Установить ioredis (если еще не установлено)
- [ ] Создать `config/redis.ts`:
  - Подключение к Redis через REDIS_URL
  - Export клиента
- [ ] Создать `utils/cache.ts`:
  - `cacheReport(key, data, ttl)` - сохранить отчет в кэш
  - `getCachedReport(key)` - получить из кэша
  - `invalidateReportCache(companyId)` - удалить все кэши компании
- [ ] Интегрировать кэширование в reports:
  - Ключ: `report:{companyId}:{reportType}:{hash(params)}`
  - TTL: 5-15 минут
  - Инвалидация при создании/изменении операций или планов

### 3.8 Swagger документация

- [ ] Установить зависимости:
  ```bash
  pnpm add swagger-jsdoc swagger-ui-express
  pnpm add -D @types/swagger-jsdoc @types/swagger-ui-express
  ```
- [ ] Создать `config/swagger.ts`:
  - Настроить OpenAPI 3.0
  - Базовая информация: title, version, description
  - Security schemes: JWT Bearer
- [ ] Добавить JSDoc аннотации для эндпоинтов:
  ```typescript
  /**
   * @swagger
   * /api/operations:
   *   get:
   *     summary: Get all operations
   *     tags: [Operations]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: dateFrom
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: List of operations
   */
  ```
- [ ] Настроить endpoint `/api-docs` в `app.ts`
- [ ] Проверить доступность: `http://localhost:4000/api-docs`

**Критерий готовности**: API полностью функционален, все эндпоинты работают, Swagger доступен.

---

## ФАЗА 4: Worker (фоновые задачи)

**Длительность**: 1 день  
**Статус**: ✅ Completed

### 4.1 Базовая структура Worker

- [x] Инициализировать `apps/worker/package.json`
- [x] Установить зависимости:
  ```bash
  cd apps/worker
  pnpm add node-cron
  pnpm add @prisma/client
  pnpm add dotenv
  pnpm add -D typescript ts-node nodemon @types/node @types/node-cron
  ```
- [x] Настроить TypeScript
- [x] Создать структуру:
  ```
  apps/worker/src/
    ├── index.ts              # entry point, scheduler
    ├── config/
    │   └── env.ts            # environment variables
    ├── jobs/
    │   └── salary.generate.monthly.ts
    └── utils/
        └── prisma.ts         # Prisma client
  ```
- [x] Создать `index.ts` с node-cron scheduler

### 4.2 Реализация задач

- [x] **salary.generate.monthly** (`jobs/salary.generate.monthly.ts`):
  - Функция `generateSalaryOperations(month: string)`:
    - Получить все активные Salary записи (effectiveFrom <= month <= effectiveTo)
    - Для каждой записи:
      - Рассчитать baseWage
      - Рассчитать взносы: baseWage \* contributionsPct / 100
      - Рассчитать НДФЛ: baseWage \* incomeTaxPct / 100
      - Создать 2-3 операции расхода:
        1. ФОТ (начисление) - статья "Зарплата"
        2. Взносы - статья "Взносы"
        3. НДФЛ - статья "НДФЛ"
    - Создать запись GeneratedSalaryOperation (опционально)
  - Расписание: cron('0 0 1 \* \*') - каждое 1 число месяца в 00:00
- [x] Добавить функцию для ручного запуска (runSalaryGenerationManually)
- [x] Логирование выполнения задач

**Критерий готовности**: ✅ Worker запускается, можно вручную сгенерировать зарплатные операции.

---

## ФАЗА 5: Frontend

**Длительность**: 4-5 дней  
**Статус**: ✅ Completed

### 5.1 Базовая структура Web

- [ ] Инициализировать `apps/web/package.json`
- [ ] Установить зависимости:
  ```bash
  cd apps/web
  pnpm add react react-dom react-router-dom
  pnpm add @reduxjs/toolkit react-redux
  pnpm add axios
  pnpm add date-fns
  pnpm add -D vite @vitejs/plugin-react
  pnpm add -D typescript @types/react @types/react-dom
  pnpm add -D tailwindcss postcss autoprefixer
  pnpm add -D eslint eslint-plugin-react
  ```
- [ ] Настроить Vite (`vite.config.ts`):
  - Плагин React
  - Proxy для API: `/api` → `http://localhost:4000/api`
  - Алиасы путей (@shared, @components)
- [ ] Инициализировать Tailwind:
  ```bash
  npx tailwindcss init -p
  ```
- [ ] Настроить `tailwind.config.js` (paths, theme)
- [ ] Создать структуру:
  ```
  apps/web/src/
    ├── main.tsx              # entry point
    ├── App.tsx               # root component
    ├── app/
    │   ├── router.tsx        # React Router setup
    │   └── providers.tsx     # Redux Provider, etc.
    ├── pages/
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   └── RegisterPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── OperationsPage.tsx
    │   ├── PlansPage.tsx
    │   ├── ReportsPage.tsx
    │   └── catalogs/
    │       ├── ArticlesPage.tsx
    │       ├── AccountsPage.tsx
    │       ├── DepartmentsPage.tsx
    │       ├── CounterpartiesPage.tsx
    │       ├── DealsPage.tsx
    │       └── SalariesPage.tsx
    ├── features/
    │   ├── operation-form/
    │   ├── plan-editor/
    │   └── salary-wizard/
    ├── entities/
    │   ├── article/
    │   ├── account/
    │   ├── operation/
    │   └── plan/
    ├── widgets/
    │   ├── CashflowTable/
    │   └── PlanVsFactChart/
    ├── store/
    │   ├── store.ts
    │   ├── slices/
    │   │   ├── authSlice.ts
    │   │   ├── catalogsSlice.ts
    │   │   ├── operationsSlice.ts
    │   │   ├── plansSlice.ts
    │   │   └── reportsSlice.ts
    │   └── api/
    │       └── apiSlice.ts       # RTK Query
    └── shared/
        ├── api/
        │   ├── axios.ts          # axios instance
        │   └── interceptors.ts   # JWT interceptor
        ├── ui/
        │   ├── Button.tsx
        │   ├── Input.tsx
        │   ├── Select.tsx
        │   ├── Modal.tsx
        │   ├── Table.tsx
        │   ├── DatePicker.tsx
        │   ├── Card.tsx
        │   └── Layout.tsx
        ├── lib/
        │   ├── date.ts           # date formatting
        │   ├── money.ts          # currency formatting
        │   └── utils.ts
        └── config/
            └── env.ts            # env variables
  ```
- [ ] Создать `index.html` и `main.tsx`

### 5.2 Redux Store и API Client

- [ ] Настроить Redux store (`store/store.ts`):
  - Configure store с middleware
  - RTK Query API slice
- [ ] Создать API slice (`store/api/apiSlice.ts`):
  - Base query с axios
  - Endpoints для всех модулей (auth, catalogs, operations, plans, reports)
  - Auto-generated hooks (useGetOperationsQuery, etc.)
- [ ] Настроить axios instance (`shared/api/axios.ts`):
  - Base URL из env
  - Request interceptor: добавление JWT в headers
  - Response interceptor: обработка 401 (refresh token)
- [ ] Создать slices:
  - **authSlice**: login, logout, setTokens, user state
  - **catalogsSlice**: articles, accounts, departments, counterparties, deals, salaries
  - **operationsSlice**: операции с фильтрами
  - **plansSlice**: планы
  - **reportsSlice**: кэш отчетов (опционально, если не используем RTK Query)

### 5.3 Базовые UI компоненты (shared/ui)

- [ ] **Button.tsx**: стилизованная кнопка (primary, secondary, danger)
- [ ] **Input.tsx**: текстовое поле с label и error
- [ ] **Select.tsx**: выпадающий список
- [ ] **Modal.tsx**: модальное окно
- [ ] **Table.tsx**: таблица с сортировкой и пагинацией
- [ ] **DatePicker.tsx**: выбор даты (можно использовать react-datepicker)
- [ ] **Card.tsx**: карточка для виджетов
- [ ] **Layout.tsx**: основной layout с header, sidebar, content

### 5.4 Аутентификация

- [ ] **LoginPage** (`pages/auth/LoginPage.tsx`):
  - Форма: email, password
  - Submit → dispatch login action → сохранить tokens
  - Redirect на Dashboard
- [ ] **RegisterPage** (`pages/auth/RegisterPage.tsx`):
  - Форма: email, password, companyName
  - Submit → POST /api/auth/register → сохранить tokens
  - Redirect на Dashboard
- [ ] **PrivateRoute** component:
  - Проверка наличия токена
  - Redirect на Login если не авторизован
- [ ] Настроить роутинг в `app/router.tsx`:
  - Public routes: /login, /register
  - Private routes: /dashboard, /operations, /plans, /reports, /catalogs/\*

### 5.5 Страница Dashboard

- [ ] **DashboardPage** (`pages/DashboardPage.tsx`):
  - Загрузка данных: GET /api/reports/dashboard
  - Виджеты:
    - Карточки с цифрами: Доходы, Расходы, Чистая прибыль
    - Остатки по счетам (таблица)
    - График план vs факт (line chart, можно использовать recharts или chart.js)
  - Фильтры: period (dateFrom/dateTo), mode (plan/fact/both)

### 5.6 Страница Operations

- [ ] **OperationsPage** (`pages/OperationsPage.tsx`):
  - Загрузка данных: GET /api/operations с фильтрами
  - Таблица операций:
    - Колонки: Дата, Тип, Сумма, Статья, Счет, Контрагент, Сделка
    - Кнопки: Редактировать, Удалить
  - Фильтры: type, dateFrom/To, articleId, dealId, departmentId, counterpartyId
  - Кнопка "Создать операцию" → открыть модальное окно с формой
- [ ] **OperationForm** (`features/operation-form/OperationForm.tsx`):
  - Поля: type (select), operationDate, amount, currency, account (select), article (select), counterparty (optional), deal (optional), department (optional), description
  - Для transfer: sourceAccount, targetAccount вместо account
  - Submit → POST /api/operations или PATCH /api/operations/:id
  - Валидация

### 5.7 Страница Plans

- [ ] **PlansPage** (`pages/PlansPage.tsx`):
  - Загрузка данных: GET /api/plans
  - Таблица планов:
    - Колонки: Тип, Дата начала, Дата окончания, Сумма, Статья, Повторение, Статус
    - Кнопки: Редактировать, Удалить
  - Кнопка "Создать план" → форма
- [ ] **PlanForm** (`features/plan-editor/PlanForm.tsx`):
  - Поля: type, startDate, endDate (optional), amount, currency, article, account, repeat (select: none|daily|weekly|monthly|etc.), status
  - Submit → POST /api/plans или PATCH /api/plans/:id

### 5.8 Страница Reports

- [ ] **ReportsPage** (`pages/ReportsPage.tsx`):
  - Вкладки: ОДДС (факт), БДДС (план), План vs Факт
  - Фильтры: periodFrom, periodTo, другие параметры
- [ ] **Вкладка ОДДС** (факт):
  - Загрузка: GET /api/reports/cashflow
  - Таблица: группировка по activity → type → article → месяцы
- [ ] **Вкладка БДДС** (план):
  - Загрузка: GET /api/reports/bdds
  - Таблица: план по месяцам и статьям
- [ ] **Вкладка План vs Факт**:
  - Загрузка: GET /api/reports/planfact
  - Таблица: месяц, статья, план, факт, дельта
  - Опционально: визуализация (chart)

### 5.9 Страницы справочников (Catalogs)

- [ ] **ArticlesPage**: CRUD статей с иерархией (tree view или flat list)
- [ ] **AccountsPage**: CRUD счетов
- [ ] **DepartmentsPage**: CRUD подразделений
- [ ] **CounterpartiesPage**: CRUD контрагентов
- [ ] **DealsPage**: CRUD сделок
- [ ] **SalariesPage**: CRUD зарплат + кнопка "Сгенерировать операции" → POST /api/salary-engine/run

**Критерий готовности**: Frontend полностью функционален, все страницы работают, можно выполнять все операции через UI.

---

## ФАЗА 6: Локальная Docker-инфраструктура

**Длительность**: 1 день  
**Статус**: ✅ Completed

### 6.1 Docker Compose для локальной разработки

- [x] Создать `ops/docker/docker-compose.yml`:

  ```yaml
  version: '3.9'
  services:
    postgres:
      image: postgres:15-alpine
      environment:
        POSTGRES_DB: fin_u_ch_dev
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
      ports:
        - '5432:5432'
      volumes:
        - postgres_data:/var/lib/postgresql/data

    redis:
      image: redis:7-alpine
      ports:
        - '6379:6379'

    pgadmin:
      image: dpage/pgadmin4
      environment:
        PGADMIN_DEFAULT_EMAIL: admin@example.com
        PGADMIN_DEFAULT_PASSWORD: admin
      ports:
        - '5050:80'
      depends_on:
        - postgres

  volumes:
    postgres_data:
  ```

- [x] Создать `.env` для локального окружения:
  ```env
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev
  REDIS_URL=redis://localhost:6379
  JWT_SECRET=your-super-secret-jwt-key-change-in-production
  JWT_ACCESS_EXPIRES_IN=15m
  JWT_REFRESH_EXPIRES_IN=7d
  PORT=4000
  NODE_ENV=development
  ```
- [x] Запустить: `docker-compose -f ops/docker/docker-compose.yml up -d`
- [x] Прогнать миграции:
  ```bash
  cd apps/api
  npx prisma migrate deploy
  ```
- [x] Запустить seed:
  ```bash
  npx ts-node ../../scripts/seed-dev.ts
  ```

### 6.2 Dockerfiles для production

- [x] **api.Dockerfile** (`ops/docker/api.Dockerfile`):

  ```dockerfile
  FROM node:18-alpine AS builder
  WORKDIR /app
  RUN npm install -g pnpm
  COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
  COPY packages ./packages
  COPY apps/api ./apps/api
  RUN pnpm install --frozen-lockfile
  RUN pnpm --filter @fin-u-ch/shared build
  RUN pnpm --filter api build

  FROM node:18-alpine
  WORKDIR /app
  RUN npm install -g pnpm
  COPY --from=builder /app/node_modules ./node_modules
  COPY --from=builder /app/apps/api/dist ./dist
  COPY --from=builder /app/apps/api/prisma ./prisma
  COPY --from=builder /app/apps/api/package.json ./
  EXPOSE 4000
  CMD ["pnpm", "start"]
  ```

- [x] **web.Dockerfile** (`ops/docker/web.Dockerfile`):

  ```dockerfile
  FROM node:18-alpine AS builder
  WORKDIR /app
  RUN npm install -g pnpm
  COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
  COPY packages ./packages
  COPY apps/web ./apps/web
  RUN pnpm install --frozen-lockfile
  RUN pnpm --filter @fin-u-ch/shared build
  RUN pnpm --filter web build

  FROM nginx:alpine
  COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
  COPY ops/nginx/web-nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
  ```

- [x] **worker.Dockerfile** (`ops/docker/worker.Dockerfile`):
  - Аналогично api.Dockerfile, но для apps/worker

### 6.3 Nginx Reverse Proxy

- [x] Создать `ops/nginx/nginx.conf`:

  ```nginx
  upstream api {
      server api:4000;
  }

  upstream web {
      server web:80;
  }

  server {
      listen 80;
      server_name _;

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
          proxy_set_header Host $host;
      }

      # Frontend
      location / {
          proxy_pass http://web;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          try_files $uri $uri/ /index.html;
      }
  }
  ```

- [x] Для production с SSL создать `ops/nginx/nginx-ssl.conf` с HTTPS конфигурацией
- [x] Создать `ops/nginx/web-nginx.conf` для web container
- [x] Создать `ops/docker/docker-compose.prod.yml` для production
- [x] Создать `.dockerignore` файлы для оптимизации
- [x] Создать `ops/docker/.env.example` с документацией

**Критерий готовности**: ✅ `docker-compose up` запускает все сервисы локально, можно открыть приложение в браузере.

---

## ФАЗА 7: Тестирование

**Длительность**: 2 дня  
**Статус**: Pending

### 7.1 Jest (unit/integration тесты)

- [ ] Настроить `jest.config.js` для `apps/api`:
  ```javascript
  module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
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
- [ ] Написать тесты для API:
  - **auth.service.test.ts**: register, login, hash password, verify password
  - **operations.service.test.ts**: создание операций, валидация transfer
  - **plans.service.test.ts**: expandPlan (разворачивание repeat)
  - **reports/dashboard.service.test.ts**: расчет доходов/расходов
  - **utils/date.test.ts**, **utils/money.test.ts**
- [ ] Настроить `jest.config.js` для `apps/web` (testEnvironment: 'jsdom')
- [ ] Написать тесты для Frontend:
  - Компоненты: Button, Input, Modal
  - Redux slices: authSlice actions
  - Utils: date/money форматирование
- [ ] Запустить: `pnpm test` в корне
- [ ] Проверить coverage: `pnpm test -- --coverage`

### 7.2 Playwright (E2E тесты)

- [ ] Установить Playwright:
  ```bash
  cd apps/web
  pnpm add -D @playwright/test
  npx playwright install
  ```
- [ ] Создать `playwright.config.ts`:

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
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  });
  ```

- [ ] Создать папку `apps/web/e2e/`
- [ ] Написать E2E тесты:
  - **auth.spec.ts**: регистрация → логин → logout
  - **operations.spec.ts**: создание операции → просмотр в списке → редактирование → удаление
  - **dashboard.spec.ts**: открыть дашборд → проверить виджеты
  - **reports.spec.ts**: открыть отчет ОДДС → проверить таблицу
- [ ] Запустить: `pnpm test:e2e`
- [ ] Запустить с UI: `pnpm test:e2e:ui`

**Критерий готовности**: Все тесты проходят, coverage >= 60% для бизнес-логики.

---

## ФАЗА 8: CI/CD настройка с AI Code Review

**Длительность**: 2-3 дня  
**Статус**: ✅ Completed

### 8.1 Подготовка AI Code Review инфраструктуры

#### 8.1.1 Создание контекстной базы для Claude

- [ ] Создать `docs/ai-context/` директорию для AI агента:
  ```bash
  mkdir -p docs/ai-context
  ```

> **Важно**: Мы используем существующие документы `PROJECT_OVERVIEW.md`, `ARCHITECTURE.md` и `DOMAIN_MODEL.md` вместо создания дубликатов. Создаем только специализированные файлы для AI review.

- [ ] Создать `docs/ai-context/style-guide.md`:
  - Извлечь правила из `DEV_GUIDE.md` секция 13 "Стайлгайд и качество"
  - Дополнить специфичными правилами для AI:
    - **TypeScript строгие требования**:
      - Запрет `any` (использовать `unknown` или конкретные типы)
      - Explicit return types для всех функций
      - Strict null checks
    - **HTTP запросы**: только через apiClient (`shared/api/axios.ts`)
    - **Обработка ошибок**:
      - try-catch для async операций
      - Error boundaries в React компонентах
      - Централизованный error middleware в API
    - **React паттерны**:
      - Hooks rules (no hooks in conditions/loops)
      - Functional components only
      - Props destructuring
      - Custom hooks naming (useXxx)
    - **Prisma best practices**:
      - Всегда фильтровать по `companyId`
      - Использовать transactions для связанных операций
      - Include/select для оптимизации запросов

- [ ] Создать `docs/ai-context/security-checklist.md`:
  - **OWASP Top 10 адаптированный для проекта**:
    1. SQL Injection Prevention:
       - ✅ Prisma parameterized queries (автоматически)
       - ❌ Никогда не использовать raw SQL без параметров
    2. XSS Prevention:
       - ✅ React automatic escaping
       - ⚠️ DOMPurify для HTML из внешних источников
       - ❌ Запрет `dangerouslySetInnerHTML` без sanitization
    3. CSRF Protection:
       - ✅ SameSite cookies для refresh token
       - ✅ CORS настройки в API
    4. JWT Best Practices:
       - ✅ Access token: 15 минут expiration
       - ✅ Refresh token: 7 дней, rotation on use
       - ❌ Никогда не хранить чувствительные данные в JWT
    5. Input Validation:
       - ✅ Zod schemas на всех входных данных
       - ✅ Валидация на фронте И бэкенде
    6. Sensitive Data:
       - ✅ Env variables для секретов
       - ❌ Не логировать пароли, токены, PII
  - **Multi-tenancy Security**:
    - Всегда проверять `companyId` в middleware
    - Изолировать данные на уровне БД (WHERE companyId = ?)
    - Тесты на data leakage между тенантами

- [ ] Создать `docs/ai-context/common-pitfalls.md`:
  - **Известные проблемы проекта**:
    - Забытые фильтры по `companyId` в Prisma запросах
    - Missing indexes на часто запрашиваемых полях
    - N+1 query проблемы при загрузке связанных данных
  - **Performance bottlenecks**:
    - Отчеты без кэширования (использовать Redis)
    - Отсутствие пагинации на больших списках
    - Индексы: обязательно на `(companyId, operationDate)`, `(companyId, articleId)`
  - **Неочевидные зависимости**:
    - `packages/shared` должен собираться первым
    - Frontend proxy в Vite для `/api` запросов
    - Worker зависит от Prisma migrations
  - **Breaking changes history**:
    - Изменение структуры JWT payload требует logout всех пользователей
    - Миграции с удалением колонок требуют двухэтапного деплоя
    - Изменение enum значений требует обновления существующих записей

#### 8.1.2 Создание скрипта AI Review

- [ ] Создать `scripts/ai-review/` директорию:

  ```bash
  mkdir -p scripts/ai-review
  cd scripts/ai-review
  pnpm init
  ```

- [ ] Установить зависимости:

  ```bash
  pnpm add @anthropic-ai/sdk
  pnpm add @octokit/rest
  pnpm add dotenv
  pnpm add -D typescript @types/node
  ```

- [ ] Создать `scripts/ai-review/src/config.ts`:

  ```typescript
  export const CONFIG = {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8000,
    },
    github: {
      token: process.env.GITHUB_TOKEN!,
      owner: process.env.GITHUB_REPOSITORY_OWNER!,
      repo: process.env.GITHUB_REPOSITORY_NAME!,
    },
    // Используем существующие документы + новые AI-specific файлы
    contextPaths: [
      'docs/PROJECT_OVERVIEW.md', // ✅ уже существует
      'docs/ARCHITECTURE.md', // ✅ уже существует
      'docs/DOMAIN_MODEL.md', // ✅ уже существует
      'docs/ai-context/style-guide.md', // создать
      'docs/ai-context/security-checklist.md', // создать
      'docs/ai-context/common-pitfalls.md', // создать
    ],
    review: {
      maxFilesPerBatch: 10,
      minSeverity: 'low', // low, medium, high, critical
    },
  };
  ```

- [ ] Создать `scripts/ai-review/src/context-loader.ts`:

  ```typescript
  import fs from 'fs/promises';
  import path from 'path';
  import { CONFIG } from './config';

  export async function loadProjectContext(): Promise<string> {
    const contents = await Promise.all(
      CONFIG.contextPaths.map(async (file) => {
        try {
          const content = await fs.readFile(file, 'utf-8');
          return `## ${path.basename(file)}\n\n${content}`;
        } catch (error) {
          console.warn(`Warning: Could not load ${file}. Skipping...`);
          return '';
        }
      })
    );

    return contents.filter(Boolean).join('\n\n---\n\n');
  }
  ```

- [ ] Создать `scripts/ai-review/src/github-client.ts` (полная реализация GitHubClient)
- [ ] Создать `scripts/ai-review/src/claude-reviewer.ts` (полная реализация ClaudeReviewer)
- [ ] Создать `scripts/ai-review/src/index.ts` (основной entry point)
- [ ] Создать `scripts/ai-review/package.json` и `tsconfig.json`

> Полный код этих файлов см. в секции 8.1.2 ниже или в предыдущей версии документа

### 8.2 GitHub Actions Workflow с AI Review

- [ ] Создать `.github/workflows/ci-cd.yml`:

  ```yaml
  name: CI/CD with AI Review
  # ... (полный workflow см. в Приложении A)
  ```

> **Примечание**: Полный workflow файл очень большой (~300 строк). Основные джобы:
>
> - `quick-checks`: Lint, format, type-check (1-2 мин)
> - `ai-code-review`: Claude анализирует PR (2-5 мин)
> - `build`: Сборка всех пакетов (5-10 мин)
> - `test`: Unit + E2E тесты (5-10 мин)
> - `security-scan`: Trivy scan (2-3 мин)
> - `docker-build`: Build & push образов (5-10 мин, только main)
> - `deploy`: Деплой на VPS (2-5 мин, только main)

### 8.3 Pre-commit Hook для внутреннего цикла

- [ ] Установить husky для Git hooks:

  ```bash
  pnpm add -D husky lint-staged
  npx husky init
  ```

- [ ] Создать `.husky/pre-commit` и `scripts/ai-review/quick-check.js`

### 8.4 GitHub Secrets Configuration

- [ ] Добавить в Settings → Secrets and variables → Actions:
  - `ANTHROPIC_API_KEY`: API ключ Claude
  - `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
  - `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

### 8.5 Branch Protection Rules

- [ ] Настроить защиту веток `main` и `dev` с обязательными status checks

### 8.6 Документация

- [ ] Обновить `docs/CI_CD.md` добавив секции про AI Review систему

**Критерий готовности**:

- ✅ AI Code Review работает на всех PR
- ✅ Блокирует merge при critical issues
- ✅ Push в main автоматически деплоит на VPS
- ✅ Используются существующие документы (нет дубликатов)

---

## ФАЗА 9: Настройка VPS

**Длительность**: 1 день  
**Статус**: ⏳ Частично выполнено (ожидание данных от пользователя)

### 9.1 Базовая настройка сервера

- [x] Подключиться по SSH:
  ```bash
  ssh root@83.166.244.139
  ```
- [x] Обновить систему:
  ```bash
  apt update && apt upgrade -y
  ```
- [x] Установить Docker:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  ```
- [x] Установить Docker Compose:
  ```bash
  apt install docker-compose-plugin
  ```
- [x] Проверить:
  ```bash
  docker --version  # v28.5.0
  docker compose version  # v2.40.0
  ```
- [ ] Создать пользователя для деплоя (опционально, не требуется)

### 9.2 Firewall и безопасность

- [x] Установить UFW:
  ```bash
  apt install ufw  # уже установлен v0.36.2
  ```
- [x] Настроить правила:
  ```bash
  ufw allow 22/tcp    # SSH
  ufw allow 80/tcp    # HTTP
  ufw allow 443/tcp   # HTTPS
  ufw enable
  ufw status          # Firewall is active
  ```
- [x] Настроить SSH:
  - Запретить вход по паролю (только по ключу)
  - Отредактировать `/etc/ssh/sshd_config`:
    ```
    PasswordAuthentication no
    PermitRootLogin prohibit-password
    ```
  - Перезапустить SSH: `systemctl restart ssh` ✅

### 9.3 SSL сертификаты

- [ ] Установить certbot:
  ```bash
  apt install certbot
  ```
- [ ] Получить сертификат Let's Encrypt:
  ```bash
  certbot certonly --standalone -d yourdomain.com
  ```
- [ ] Сертификаты будут в `/etc/letsencrypt/live/yourdomain.com/`
- [ ] Настроить auto-renewal:
  ```bash
  certbot renew --dry-run
  ```
- [ ] Скопировать сертификаты в проект:
  ```bash
  mkdir -p /opt/fin-u-ch/ops/nginx/ssl
  cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/fin-u-ch/ops/nginx/ssl/
  cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/fin-u-ch/ops/nginx/ssl/
  ```

### 9.4 Создание структуры проекта на сервере

- [x] Создать директорию:
  ```bash
  mkdir -p /opt/fin-u-ch
  cd /opt/fin-u-ch
  ```
- [x] Создать `.env` файл:
  - Пароли и секреты сгенерированы автоматически
  - POSTGRES_PASSWORD: 32-символьный случайный пароль
  - JWT_SECRET: 64-байтный ключ
- [x] Скопировать `docker-compose.yml` на сервер
- [x] Создать папку для nginx конфига:
  ```bash
  mkdir -p ops/nginx
  ```

### 9.5 Настройка Nginx

- [x] Скопировать `nginx.conf` на сервер
- [ ] Обновить `nginx.conf` для HTTPS (требует SSL сертификаты):

  ```nginx
  server {
      listen 80;
      server_name yourdomain.com;
      return 301 https://$server_name$request_uri;
  }

  server {
      listen 443 ssl http2;
      server_name yourdomain.com;

      ssl_certificate /etc/nginx/ssl/fullchain.pem;
      ssl_certificate_key /etc/nginx/ssl/privkey.pem;

      # ... остальные location блоки
  }
  ```

### 9.6 SSH ключи для GitHub

- [х] Добавить публичный SSH ключ вашей машины в GitHub deploy keys репозитория (для pull образов из GHCR)

**Критерий готовности**:

- ✅ VPS готов к деплою
- ✅ Docker v28.5.0 и Docker Compose v2.40.0 работают
- ✅ Firewall настроен (UFW active)
- ✅ SSH безопасность (только ключи)
- ✅ Структура проекта создана
- ✅ Nginx конфигурация загружена
- ⏳ SSL сертификаты (требует домен)
- ⏳ GHCR доступ (требует token и username)

---

## ФАЗА 10: Первый деплой

**Длительность**: 1 день  
**Статус**: Pending

### 10.1 Ручной деплой (первый раз)

- [ ] На локальной машине собрать и push образы:

  ```bash
  # Логин в GHCR
  echo $GHCR_TOKEN | docker login ghcr.io -u <username> --password-stdin

  # Сборка и push
  docker build -t ghcr.io/<org>/fin-u-ch/api:latest -f ops/docker/api.Dockerfile .
  docker push ghcr.io/<org>/fin-u-ch/api:latest

  docker build -t ghcr.io/<org>/fin-u-ch/web:latest -f ops/docker/web.Dockerfile .
  docker push ghcr.io/<org>/fin-u-ch/web:latest

  docker build -t ghcr.io/<org>/fin-u-ch/worker:latest -f ops/docker/worker.Dockerfile .
  docker push ghcr.io/<org>/fin-u-ch/worker:latest
  ```

- [ ] На VPS:

  ```bash
  cd /opt/fin-u-ch

  # Логин в GHCR
  echo $GHCR_TOKEN | docker login ghcr.io -u <username> --password-stdin

  # Pull образов
  docker compose pull

  # Запустить сервисы
  docker compose up -d

  # Проверить логи
  docker compose logs -f
  ```

- [ ] Прогнать миграции:

  ```bash
  docker compose exec api npx prisma migrate deploy
  ```

- [ ] (Опционально) Загрузить seed данные:
  ```bash
  docker compose exec api node scripts/seed-prod.js
  ```

### 10.2 Проверка работоспособности

- [ ] Открыть в браузере: `https://yourdomain.com`
- [ ] Проверить Swagger: `https://yourdomain.com/api-docs`
- [ ] Зарегистрировать тестового пользователя через UI
- [ ] Создать операцию
- [ ] Посмотреть дашборд
- [ ] Открыть отчеты (ОДДС, БДДС)
- [ ] Проверить логи сервисов:
  ```bash
  docker compose logs api
  docker compose logs web
  docker compose logs worker
  docker compose logs nginx
  ```
- [ ] Проверить health endpoints (если реализованы):
  ```bash
  curl https://yourdomain.com/api/health
  ```

### 10.3 Автоматический деплой через CI/CD

- [ ] Сделать коммит в ветку `main`:
  ```bash
  git add .
  git commit -m "feat: initial release"
  git push origin main
  ```
- [ ] Открыть GitHub Actions и проверить workflow:
  - `lint-build` job должен пройти
  - `test` job должен пройти
  - `docker-build` job должен собрать и push образы
  - `deploy` job должен подключиться к VPS и обновить сервисы
- [ ] Проверить деплой на сервере:
  ```bash
  docker compose ps
  docker compose logs -f
  ```
- [ ] Убедиться, что приложение работает после автодеплоя

**Критерий готовности**: Приложение доступно по HTTPS, все функции работают, автодеплой настроен.

---

## ФАЗА 11: Финальные настройки

**Длительность**: 1 день  
**Статус**: Pending

### 11.1 Мониторинг и логирование

- [ ] Настроить логирование в API:
  - Установить winston или pino
  - Создать `config/logger.ts`
  - Логировать все запросы (express middleware)
  - Логировать ошибки
- [ ] Настроить ротацию логов в Docker:
  - Добавить в `docker-compose.yml`:
    ```yaml
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
    ```
- [ ] Добавить health check endpoints:
  - GET `/api/health` → { status: "ok", uptime: ..., database: "connected" }
  - GET `/health` в worker
- [ ] (Опционально) Настроить мониторинг:
  - UptimeRobot для проверки доступности
  - Или простой cron-скрипт, который проверяет `/api/health`

### 11.2 Бэкап базы данных

- [ ] Создать скрипт `scripts/backup-db.sh`:

  ```bash
  #!/bin/bash
  DATE=$(date +%Y-%m-%d-%H-%M-%S)
  BACKUP_DIR="/opt/fin-u-ch/backups"
  mkdir -p $BACKUP_DIR

  docker compose exec -T postgres pg_dump -U postgres fin_u_ch > $BACKUP_DIR/backup-$DATE.sql

  # Удалить бэкапы старше 30 дней
  find $BACKUP_DIR -name "backup-*.sql" -mtime +30 -delete

  echo "Backup created: backup-$DATE.sql"
  ```

- [ ] Сделать скрипт исполняемым:
  ```bash
  chmod +x scripts/backup-db.sh
  ```
- [ ] Настроить cron для автоматических бэкапов:
  ```bash
  crontab -e
  ```
  Добавить:
  ```
  0 2 * * * /opt/fin-u-ch/scripts/backup-db.sh >> /opt/fin-u-ch/logs/backup.log 2>&1
  ```
  (Каждый день в 2:00 ночи)
- [ ] Проверить восстановление из бэкапа:
  ```bash
  # На тестовой БД:
  docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE test_restore;"
  docker compose exec -T postgres psql -U postgres test_restore < backups/backup-2024-01-01.sql
  ```

### 11.3 Документация и README

- [ ] Обновить корневой `README.md`:

  ````markdown
  # Fin-U-CH - Financial Management System

  Простой финансовый учет для малых команд с планированием (БДДС) и отчетностью (ОДДС).

  ## Технологии

  - Frontend: React 18 + TypeScript + Vite + Tailwind + Redux Toolkit
  - Backend: Node 18 + Express + TypeScript + Prisma
  - Database: PostgreSQL 15
  - Cache: Redis 7
  - Infrastructure: Docker + Nginx + GitHub Actions

  ## Быстрый старт (локально)

  1. Установить зависимости:
     ```bash
     pnpm install
     ```
  ````

  2. Запустить Docker-сервисы:

     ```bash
     docker-compose -f ops/docker/docker-compose.yml up -d
     ```

  3. Прогнать миграции:

     ```bash
     cd apps/api && npx prisma migrate deploy
     ```

  4. Запустить приложения:

     ```bash
     pnpm --filter api dev
     pnpm --filter web dev
     pnpm --filter worker dev
     ```

  5. Открыть в браузере: http://localhost:3000

  ## Документация
  - [Архитектура](docs/ARCHITECTURE.md)
  - [API](docs/API.md)
  - [Доменная модель](docs/DOMAIN_MODEL.md)
  - [CI/CD](docs/CI_CD.md)
  - [Dev Guide](docs/DEV_GUIDE.md)
  - [План разработки](docs/IMPLEMENTATION_ROADMAP.md)

  ## Деплой

  Автоматический деплой на VPS при push в `main` через GitHub Actions.

  ## Лицензия

  MIT

  ```

  ```

- [ ] Проверить актуальность всей документации в `docs/`:
  - ARCHITECTURE.md
  - API.md
  - DOMAIN_MODEL.md
  - CI_CD.md
  - DEV_GUIDE.md
  - IMPLEMENTATION_ROADMAP.md (этот файл)

- [ ] Создать `CHANGELOG.md`:

  ```markdown
  # Changelog

  ## [0.1.0] - 2024-01-01

  ### Added

  - Базовая структура монорепозитория
  - Аутентификация (JWT)
  - CRUD справочников (статьи, счета, контрагенты, сделки, подразделения, зарплаты)
  - Операции (доход, расход, перевод)
  - Планы (БДДС) с повторениями
  - Отчеты (дашборд, ОДДС, БДДС, план vs факт)
  - Worker для генерации зарплатных операций
  - Frontend на React с Redux Toolkit
  - Docker-инфраструктура
  - CI/CD через GitHub Actions
  - Автоматический деплой на VPS
  ```

**Критерий готовности**: Мониторинг работает, бэкапы автоматизированы, документация актуальна.

---

## ФАЗА 12: Опциональные улучшения (После MVP)

**Длительность**: По необходимости  
**Статус**: Pending

### 12.1 AI Review в CI/CD

- [ ] Получить API ключ OpenAI
- [ ] Создать скрипт `scripts/ai-review-ci.js`:
  - Получить diff PR через GitHub API
  - Отправить в OpenAI API с промптом на проверку
  - Создать комментарии в PR через GitHub API
- [ ] Добавить job в `.github/workflows/ci-cd.yml`:
  ```yaml
  ai-review:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - name: Run AI Review
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/ai-review-ci.js
  ```
- [ ] Добавить `OPENAI_API_KEY` в GitHub Secrets

### 12.2 Дополнительные фичи

- [ ] **Импорт банковских выписок**:
  - Endpoint POST /api/import/bank-statement
  - Парсинг CSV/Excel
  - Автоматическое создание операций
  - Сопоставление с контрагентами (fuzzy match)

- [ ] **Расширенные права доступа**:
  - Модель Role (admin, manager, viewer)
  - Связь User → Role
  - Middleware для проверки прав
  - UI для управления ролями

- [ ] **Отчет ОПиУ** (Отчет о прибылях и убытках):
  - Endpoint GET /api/reports/profit-loss
  - Группировка по статьям
  - Расчет валовой прибыли, операционной прибыли, чистой прибыли

- [ ] **Экспорт отчетов**:
  - В Excel: использовать библиотеку exceljs
  - В PDF: использовать puppeteer или pdfkit
  - Endpoints: GET /api/reports/{type}/export?format=xlsx|pdf

- [ ] **Multi-currency поддержка**:
  - Таблица ExchangeRate (date, fromCurrency, toCurrency, rate)
  - Конвертация в базовую валюту компании
  - UI для управления курсами

- [ ] **Дашборд с графиками**:
  - Интеграция с Chart.js или Recharts
  - Графики: динамика доходов/расходов, план vs факт, структура расходов (pie chart)

- [ ] **Уведомления**:
  - Email уведомления (nodemailer)
  - Push-уведомления (web push)
  - Настройки уведомлений для пользователя

- [ ] **Аудит лог**:
  - Таблица AuditLog (userId, action, entity, entityId, changes, timestamp)
  - Middleware для логирования всех изменений
  - UI для просмотра истории изменений

---

## 📊 Трекинг прогресса

### Статусы фаз

- ⏳ Pending - не начата
- 🔄 In Progress - в работе
- ✅ Completed - завершена
- ⚠️ Blocked - заблокирована

| Фаза | Название               | Статус | Прогресс |
| ---- | ---------------------- | ------ | -------- |
| 1    | Подготовка окружения   | ✅     | 100%     |
| 2    | Общие компоненты       | ✅     | 100%     |
| 3    | Backend API            | ✅     | 100%     |
| 4    | Worker                 | ✅     | 100%     |
| 5    | Frontend               | ✅     | 100%     |
| 6    | Docker инфраструктура  | ✅     | 100%     |
| 7    | Тестирование           | ⏳     | 0%       |
| 8    | CI/CD                  | ✅     | 100%     |
| 9    | Настройка VPS          | ⏳     | 0%       |
| 10   | Первый деплой          | ⏳     | 0%       |
| 11   | Финальные настройки    | ⏳     | 0%       |
| 12   | Опциональные улучшения | ⏳     | 0%       |

---

## 🎯 Критерии готовности MVP

### Функциональные требования

- [x] Пользователь может зарегистрироваться и войти в систему
- [x] Пользователь может создавать/редактировать/удалять:
  - Статьи доходов и расходов
  - Счета
  - Контрагентов
  - Подразделения
  - Сделки
  - Зарплаты
- [x] Пользователь может создавать операции (доход, расход, перевод)
- [x] Пользователь может создавать планы с повторениями
- [x] Пользователь может просматривать дашборд с основными показателями
- [x] Пользователь может генерировать отчеты:
  - ОДДС (факт)
  - БДДС (план)
  - План vs Факт
- [x] Система автоматически генерирует зарплатные операции по расписанию

### Технические требования

- [x] Multi-tenant изоляция данных по companyId
- [x] JWT аутентификация с refresh токенами
- [x] Кэширование отчетов в Redis
- [x] API документирована через Swagger
- [x] Docker инфраструктура настроена
- [x] Multi-stage builds для оптимизации образов
- [x] Health checks для всех сервисов
- [x] Nginx reverse proxy настроен
- [ ] Покрытие тестами >= 60% для бизнес-логики
- [ ] E2E тесты для критичных сценариев
- [ ] CI/CD с автоматическим деплоем на VPS
- [ ] HTTPS с SSL сертификатами
- [ ] Автоматические бэкапы базы данных
- [ ] Мониторинг и логирование

---

## 📚 Полезные команды

### Локальная разработка

```bash
# Установка зависимостей
pnpm install

# Сборка всего проекта
pnpm build

# Линтинг
pnpm lint

# Форматирование
pnpm format

# Запуск тестов
pnpm test
pnpm test:e2e

# Запуск dev-серверов
pnpm --filter api dev
pnpm --filter web dev
pnpm --filter worker dev

# Prisma
cd apps/api
npx prisma migrate dev --name <migration_name>
npx prisma migrate deploy
npx prisma studio

# Docker
docker-compose -f ops/docker/docker-compose.yml up -d
docker-compose -f ops/docker/docker-compose.yml logs -f
docker-compose -f ops/docker/docker-compose.yml down
```

### Production (VPS)

```bash
# Подключение
ssh user@<VPS_IP>

# Логи
cd /opt/fin-u-ch
docker compose logs -f
docker compose logs api
docker compose logs web

# Перезапуск сервисов
docker compose restart api
docker compose restart web

# Обновление
docker compose pull
docker compose up -d

# Миграции
docker compose exec api npx prisma migrate deploy

# Бэкап
./scripts/backup-db.sh

# Проверка статуса
docker compose ps
curl https://yourdomain.com/api/health
```

---

## 🆘 Troubleshooting

### Проблема: Не запускается API локально

**Решение:**

1. Проверить, запущен ли PostgreSQL: `docker compose ps`
2. Проверить DATABASE_URL в `.env`
3. Прогнать миграции: `npx prisma migrate deploy`
4. Проверить логи: `docker compose logs postgres`

### Проблема: Frontend не подключается к API

**Решение:**

1. Проверить proxy в `vite.config.ts`
2. Проверить, запущен ли API на порту 4000
3. Проверить CORS настройки в API
4. Открыть DevTools → Network и посмотреть ошибки

### Проблема: Миграции не применяются

**Решение:**

1. Проверить подключение к БД: `npx prisma db pull`
2. Сбросить БД (ВНИМАНИЕ: удалит данные): `npx prisma migrate reset`
3. Проверить синтаксис в `schema.prisma`
4. Попробовать вручную: `psql -U postgres -d fin_u_ch -f prisma/migrations/.../migration.sql`

### Проблема: Docker build падает

**Решение:**

1. Проверить Dockerfile синтаксис
2. Проверить, что все зависимости в package.json
3. Увеличить память Docker (Docker Desktop → Settings → Resources)
4. Очистить кэш: `docker system prune -a`

### Проблема: Деплой через GitHub Actions не работает

**Решение:**

1. Проверить GitHub Secrets (все ли добавлены)
2. Проверить логи в Actions → конкретный workflow
3. Проверить SSH доступ к VPS вручную
4. Проверить права на GHCR_TOKEN (write:packages)

---

## 📞 Контакты и поддержка

- **Issues**: Открывать в GitHub Issues
- **Документация**: См. папку `docs/`
- **Pull Requests**: Приветствуются! Следуйте DEV_GUIDE.md

---

**Последнее обновление**: 2024-01-01  
**Версия документа**: 1.0.0
