# Fin-U-CH

Система финансового учета для малых команд с планированием (БДДС) и отчетностью (ОДДС).

## 🚀 Технологии

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Redux Toolkit
- **Backend**: Node.js 18 + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Worker**: Node-cron для фоновых задач
- **Infrastructure**: Docker + Docker Compose + Nginx

## 📦 Быстрый старт

### Локальная разработка

1. **Установить зависимости**:

   ```bash
   pnpm install
   ```

2. **Запустить инфраструктуру (PostgreSQL, Redis, PgAdmin)**:

   ```bash
   docker-compose -f ops/docker/docker-compose.yml up -d
   ```

3. **Прогнать миграции БД**:

   ```bash
   cd apps/api
   npx prisma migrate deploy
   ```

4. **Запустить приложения**:

   ```bash
   # В разных терминалах или используйте tmux/screen
   pnpm --filter api dev       # API: http://localhost:4000
   pnpm --filter web dev       # Frontend: http://localhost:3000
   pnpm --filter worker dev    # Worker (фоновые задачи)
   ```

5. **Открыть в браузере**: http://localhost:3000

### Production (Docker)

```bash
# Собрать образы
docker build -t fin-u-ch/api:latest -f ops/docker/api.Dockerfile .
docker build -t fin-u-ch/web:latest -f ops/docker/web.Dockerfile .
docker build -t fin-u-ch/worker:latest -f ops/docker/worker.Dockerfile .

# Настроить .env
cd ops/docker
cp .env.example .env
# Отредактировать .env с реальными значениями

# Запустить
docker-compose -f docker-compose.prod.yml up -d

# Прогнать миграции
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

## 📚 Документация

### Для разработчиков

- [Git Guide](docs/GIT_GUIDE.md) — работа с Git, коммиты, PR процесс
- [Dev Guide](docs/DEV_GUIDE.md) — гид для разработчиков
- [CI/CD Pipeline](docs/CI_CD.md) — CI/CD процесс и AI review

### Архитектура и API

- [Архитектура](docs/ARCHITECTURE.md)
- [API документация](docs/API.md)
- [Доменная модель](docs/DOMAIN_MODEL.md)

### Результаты разработки

- [План разработки](docs/IMPLEMENTATION_ROADMAP.md)
- [Результаты Фаз](docs/)
  - [Фаза 1: Подготовка](docs/PHASE1_RESULTS.md)
  - [Фаза 2: Общие компоненты](docs/PHASE2_RESULTS.md)
  - [Фаза 3: Backend API](docs/PHASE3_RESULTS.md)
  - [Фаза 4: Worker](docs/PHASE4_RESULTS.md)
  - [Фаза 5: Frontend](docs/PHASE5_RESULTS.md)
  - [Фаза 6: Docker инфраструктура](docs/PHASE6_RESULTS.md)

## 🏗️ Структура проекта

```
fin-u-ch/
├── apps/
│   ├── api/          # Backend API (Express + Prisma)
│   ├── web/          # Frontend (React + Vite)
│   └── worker/       # Background jobs (Node-cron)
├── packages/
│   └── shared/       # Общие типы и константы
├── ops/
│   ├── docker/       # Docker files
│   └── nginx/        # Nginx конфигурации
└── docs/             # Документация
```

## 🎯 Основные возможности

- ✅ Аутентификация (JWT)
- ✅ Справочники (статьи, счета, контрагенты, сделки, подразделения)
- ✅ Операции (доходы, расходы, переводы)
- ✅ Планирование (БДДС) с повторениями
- ✅ Отчеты (Dashboard, ОДДС, БДДС, План vs Факт)
- ✅ Автоматическая генерация зарплатных операций
- ✅ Multi-tenant (изоляция по компаниям)
- ✅ Кэширование отчетов (Redis)
- ✅ API документация (Swagger)

## 🔧 Полезные команды

```bash
# Сборка всех пакетов
pnpm build

# Линтинг
pnpm lint

# Форматирование
pnpm format

# Prisma Studio (БД UI)
cd apps/api && npx prisma studio

# Логи Docker
docker-compose -f ops/docker/docker-compose.yml logs -f
```

## 📊 Статус разработки

| Фаза | Название              | Статус |
| ---- | --------------------- | ------ |
| 1    | Подготовка окружения  | ✅     |
| 2    | Общие компоненты      | ✅     |
| 3    | Backend API           | ✅     |
| 4    | Worker                | ✅     |
| 5    | Frontend              | ✅     |
| 6    | Docker инфраструктура | ✅     |
| 7    | Тестирование          | ⏳     |
| 8    | CI/CD                 | ⏳     |
| 9    | Настройка VPS         | ⏳     |
| 10   | Первый деплой         | ⏳     |

## 📝 Лицензия

MIT
