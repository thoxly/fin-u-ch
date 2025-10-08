# Docker Infrastructure

Эта директория содержит Docker конфигурацию для локальной разработки и production деплоя.

## Файлы

### Docker Compose

- `docker-compose.yml` - Локальная разработка (postgres, redis, pgadmin)
- `docker-compose.local.yml` - Полный стек локально (все сервисы как в production)
- `docker-compose.prod.yml` - Production deployment (все сервисы)

### Dockerfiles

- `api.Dockerfile` - Backend API (Express + Prisma)
- `web.Dockerfile` - Frontend (React + Nginx)
- `worker.Dockerfile` - Background jobs (Node-cron)

## Локальная разработка

### Вариант 1: Только инфраструктура (БД + Redis) ⭐ Рекомендуется

**Для кого:** Обычная разработка с горячей перезагрузкой  
**Файл:** `docker-compose.yml`  
**Порты:** PostgreSQL `5432`, Redis `6379` (стандартные)

```bash
# Запустить инфраструктуру
docker-compose up -d

# Проверить статус
docker-compose ps

# Открыть логи
docker-compose logs -f

# Остановить
docker-compose down
```

**Затем запустите приложения локально:**

```bash
cd /Users/shoxy/Projects/fin-u-ch
cd apps/api && pnpm dev    # localhost:4000 (nodemon)
cd apps/web && pnpm dev    # localhost:5173 (Vite HMR)
```

**Архитектура:**

```
┌────────────────────────────┐
│  Локально                  │
│  - API (4000)   nodemon    │
│  - Vite (5173)  HMR        │
└───────────┬────────────────┘
            │
            ↓ порты 5432, 6379
┌────────────────────────────┐
│  Docker                    │
│  - PostgreSQL (5432)       │
│  - Redis (6379)            │
└────────────────────────────┘
```

### Вариант 2: Полный стек в Docker (как в production)

**Для кого:** Тестирование перед деплоем, проверка Nginx конфигурации  
**Файл:** `docker-compose.local.yml`  
**Порты:** PostgreSQL `5433`, Redis `6380` ⚠️ **Нестандартные!**

```bash
# Из корня проекта
pnpm docker:build    # Собрать все образы
pnpm docker:up       # Запустить
pnpm docker:ps       # Статус
pnpm docker:logs     # Логи
pnpm docker:down     # Остановить

# Или напрямую:
cd ops/docker
docker compose -f docker-compose.local.yml up -d

# После запуска прогнать миграции:
docker compose -f docker-compose.local.yml exec api npx prisma migrate deploy

# Приложение доступно на:
# http://localhost      - Frontend (через Nginx)
# http://localhost/api  - API (через Nginx)
# http://localhost:4000 - API напрямую
# http://localhost:8080 - Frontend напрямую
```

**Архитектура:**

```
┌─────────────────────────────────────┐
│  Docker Containers                  │
├─────────────────────────────────────┤
│  Nginx (80)                         │
│    ├─ / → Web (8080)                │
│    └─ /api → API (4000)             │
│                                     │
│  API (4000) ────→ PostgreSQL (5433) │
│                └→ Redis (6380)      │
│                                     │
│  Web (8080)                         │
│  Worker                             │
└─────────────────────────────────────┘
```

**⚠️ Почему нестандартные порты (5433, 6380)?**

Чтобы избежать конфликтов с:

- Локальным PostgreSQL/Redis на вашей машине
- Вариантом 1 (`docker-compose.yml`) на стандартных портах

Это позволяет одновременно запускать оба сценария для тестирования или переключаться между ними без конфликтов портов.

**Внимание:** При использовании Варианта 2 убедитесь, что `.env` содержит правильные порты:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/fin_u_ch_dev
REDIS_URL=redis://localhost:6380
```

## Production

### 1. Создать .env файл

Создайте `.env` в этой директории со следующими переменными:

```env
# Database
POSTGRES_DB=fin_u_ch
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-strong-password

# Database URL
DATABASE_URL=postgresql://postgres:your-strong-password@postgres:5432/fin_u_ch

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Docker Registry
DOCKER_REGISTRY=ghcr.io
DOCKER_IMAGE_PREFIX=your-org
IMAGE_TAG=latest

# Примечание: DOCKER_IMAGE_PREFIX - это только GitHub org/username
# Полные имена образов будут: ghcr.io/your-org/fin-u-ch-api:latest и т.д.

# Nginx
NGINX_CONFIG=nginx.conf
SSL_CERT_PATH=./nginx/ssl
```

### 2. Собрать образы

```bash
cd /Users/shoxy/Projects/fin-u-ch

# API
docker build -t fin-u-ch/api:latest -f ops/docker/api.Dockerfile .

# Web
docker build -t fin-u-ch/web:latest -f ops/docker/web.Dockerfile .

# Worker
docker build -t fin-u-ch/worker:latest -f ops/docker/worker.Dockerfile .
```

### 3. Запустить

```bash
cd ops/docker
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Прогнать миграции

```bash
docker-compose -f docker-compose.prod.yml exec api pnpm prisma:deploy
```

### 5. Проверить

```bash
# Статус сервисов
docker-compose -f docker-compose.prod.yml ps

# Логи
docker-compose -f docker-compose.prod.yml logs -f

# Открыть в браузере
# http://localhost (или ваш домен)
# http://localhost/api-docs (Swagger)
```

## Сравнение сценариев

| Характеристика              | Вариант 1 (Гибрид) ⭐      | Вариант 2 (Полный Docker)        |
| --------------------------- | -------------------------- | -------------------------------- |
| **Файл compose**            | `docker-compose.yml`       | `docker-compose.local.yml`       |
| **PostgreSQL порт**         | 5432 (стандартный)         | 5433                             |
| **Redis порт**              | 6379 (стандартный)         | 6380                             |
| **API**                     | Локально (4000)            | Docker (4000)                    |
| **Web**                     | Локально (5173)            | Docker (8080)                    |
| **Горячая перезагрузка**    | ✅ Да (nodemon + Vite HMR) | ❌ Нет                           |
| **Скорость разработки**     | ⚡ Быстрая                 | 🐌 Медленная (rebuild)           |
| **Тестирование production** | ❌ Нет                     | ✅ Да                            |
| **Nginx роутинг**           | ❌ Нет                     | ✅ Да                            |
| **Когда использовать**      | Ежедневная разработка      | Перед деплоем, проверка конфигов |

## Размеры образов

После оптимизации:

- API: ~150-200 MB
- Web: ~40-50 MB
- Worker: ~150-200 MB

## Troubleshooting

### Контейнер не запускается

```bash
docker-compose logs <service-name>
docker inspect <container-id>
```

### Не подключается к БД

```bash
docker-compose ps postgres
docker-compose exec postgres psql -U postgres -d fin_u_ch
```

### Nginx 502 Bad Gateway

```bash
docker-compose ps api
docker-compose logs api
docker-compose exec nginx ping api
```

## Документация

Полная документация: [../../docs/PHASE6_RESULTS.md](../../docs/PHASE6_RESULTS.md)
