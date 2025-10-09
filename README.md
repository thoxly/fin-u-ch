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

2. **Настроить переменные окружения**:

   ```bash
   # Создать .env файл из шаблона (env.example)
   pnpm env:setup
   # или вручную
   cp env.example .env

   # Для локальной разработки значения уже готовы!
   # Проверить текущие настройки
   pnpm env:current
   ```

   **Важно:**
   - `env.example` - шаблон в Git (без реальных секретов)
   - `.env` - ваш личный файл (не попадает в Git)

3. **Запустить инфраструктуру (PostgreSQL, Redis, PgAdmin)**:

   ```bash
   # Вариант 1: Только БД и Redis для разработки (рекомендуется)
   docker-compose -f ops/docker/docker-compose.yml up -d
   # Порты: PostgreSQL 5432, Redis 6379

   # Вариант 2: Полный стек для тестирования как в production
   # pnpm docker:up
   # Порты: PostgreSQL 5433, Redis 6380 (нестандартные, чтобы не конфликтовать!)
   ```

   **Примечание:** Нестандартные порты (5433, 6380) используются в `docker-compose.local.yml`
   для возможности одновременного запуска локальных приложений и Docker инфраструктуры без конфликтов.

4. **Прогнать миграции БД**:

   ```bash
   cd apps/api
   npx prisma migrate deploy
   ```

5. **Запустить приложения локально** (с горячей перезагрузкой):

   ```bash
   # В разных терминалах или используйте tmux/screen
   cd apps/api && pnpm dev       # API: http://localhost:4000 (nodemon)
   cd apps/web && pnpm dev       # Frontend: http://localhost:5173 (Vite HMR)
   cd apps/worker && pnpm dev    # Worker (фоновые задачи)

   # Или все вместе из корня (параллельно)
   pnpm dev
   ```

6. **Открыть в браузере**: http://localhost:5173

   **Архитектура запросов:**

   ```
   Браузер → http://localhost:5173/api/...
          ↓ (Vite Proxy)
          → http://localhost:4000/api/...
          ↓ (Express API)
          → PostgreSQL (5432) & Redis (6379)
   ```

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
- [ENV Setup](docs/ENV_SETUP.md) — управление переменными окружения
- [CI/CD Pipeline](docs/CI_CD.md) — CI/CD процесс и AI review

### 🛡️ Защита и бэкапы (Для DevOps)

- \*\*[Protection Summary](docs/PROTECTION_SUMMARY.md)
- [Backup Strategy](docs/BACKUP_STRATEGY.md) — полная стратегия бэкапов и восстановления
- [GitHub Protection Checklist](docs/GITHUB_PROTECTION_CHECKLIST.md) — настройка защиты репозитория
- [Scripts Documentation](scripts/README.md) — документация backup скриптов

### Архитектура и API

- [Архитектура](docs/ARCHITECTURE.md)
- [API документация](docs/API.md)
- [Доменная модель](docs/DOMAIN_MODEL.md)

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

### Основные команды

```bash
# Сборка всех пакетов
pnpm build

# Линтинг
pnpm lint

# Форматирование
pnpm format

# Проверка типов
pnpm type-check

# Тесты
pnpm test
pnpm test:e2e

# Prisma Studio (БД UI)
cd apps/api && npx prisma studio

# Логи Docker
docker-compose -f ops/docker/docker-compose.yml logs -f
```

### Управление окружениями

```bash
# Создать .env из примера
pnpm env:setup

# Показать текущее окружение
pnpm env:current

# Список доступных .env файлов
pnpm env:list

# Переключиться на development
pnpm env:dev

# Переключиться на production
pnpm env:prod
```

Подробнее: [ENV Setup Guide](docs/ENV_SETUP.md)

### 🔧 Troubleshooting

#### 502 Bad Gateway после режима сна / смены сети

```bash
# Быстрое решение
pkill -f "nodemon" && pkill -f "vite"
cd ops/docker && docker compose restart && cd ../..
pnpm dev
```

Подробнее: [DEV_GUIDE.md - Перезапуск после режима сна](docs/DEV_GUIDE.md#-перезапуск-после-режима-сна-или-смены-сети)

### Backup и восстановление

```bash
# На VPS - Настройка автоматических бэкапов (первый раз)
sudo /opt/fin-u-ch/scripts/setup-backups.sh

# Ручной бэкап БД
/opt/fin-u-ch/scripts/backup-db.sh

# Проверка здоровья бэкапов
/opt/fin-u-ch/scripts/check-backups.sh

# Восстановление из бэкапа
/opt/fin-u-ch/scripts/restore-db.sh
```

Подробнее: [Backup Strategy](docs/BACKUP_STRATEGY.md) | [Scripts README](scripts/README.md)

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
| 8    | CI/CD                 | ✅     |
| 9    | Настройка VPS         | ✅     |
| 10   | Первый деплой         | ✅     |
