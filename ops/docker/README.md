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

### Вариант 1: Только инфраструктура (БД + Redis)

Для обычной разработки с запуском приложений через `pnpm dev`:

```bash
# Запустить инфраструктуру
docker-compose up -d

# Проверить статус
docker-compose ps

# Остановить
docker-compose down

# Просмотр логов
docker-compose logs -f
```

### Вариант 2: Полный стек в Docker (как в production)

Для локального тестирования всего стека в контейнерах:

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
# http://localhost - Frontend (через Nginx)
# http://localhost/api - API (через Nginx)
# http://localhost:4000 - API напрямую
# http://localhost:8080 - Frontend напрямую
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
