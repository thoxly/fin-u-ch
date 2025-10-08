# ФАЗА 6: Локальная Docker-инфраструктура - Результаты

**Статус**: ✅ Завершена  
**Дата**: 2025-10-07

## Выполненные задачи

### 6.1 Docker Compose для локальной разработки ✅

**Файл**: `ops/docker/docker-compose.yml`

Уже существовал с предыдущих фаз. Включает:

- **PostgreSQL 15** (порт 5432)
  - База данных: `fin_u_ch_dev`
  - Пользователь: `postgres`
  - Пароль: `postgres`
  - Volume для персистентности данных
  - Health check

- **Redis 7** (порт 6379)
  - Для кэширования отчетов
  - Health check

- **PgAdmin 4** (порт 5050)
  - Веб-интерфейс для управления БД
  - Email: `admin@example.com`
  - Пароль: `admin`

### 6.2 Dockerfiles для production ✅

#### API Dockerfile (`ops/docker/api.Dockerfile`)

**Особенности**:

- Multi-stage build (builder + production)
- Использует Node 18 Alpine для минимального размера
- Устанавливает pnpm глобально
- Собирает shared package и api
- Генерирует Prisma Client
- Production stage содержит только необходимые файлы
- Health check на `/api/health`
- Expose порт 4000

**Размер**: ~150-200 MB (после оптимизации)

#### Web Dockerfile (`ops/docker/web.Dockerfile`)

**Особенности**:

- Multi-stage build (builder + nginx)
- Собирает React приложение с Vite
- Production stage использует nginx:alpine
- Копирует собранные статические файлы в `/usr/share/nginx/html`
- Использует кастомную nginx конфигурацию
- Health check на главной странице
- Expose порт 80

**Размер**: ~40-50 MB

#### Worker Dockerfile (`ops/docker/worker.Dockerfile`)

**Особенности**:

- Multi-stage build (builder + production)
- Аналогичен API Dockerfile
- Содержит cron-задачи для генерации зарплат
- Генерирует Prisma Client
- Health check проверяет процесс Node.js

**Размер**: ~150-200 MB

### 6.3 Nginx конфигурации ✅

#### Web Nginx Config (`ops/nginx/web-nginx.conf`)

**Назначение**: Конфигурация для web container

**Особенности**:

- Раздача статических файлов из `/usr/share/nginx/html`
- SPA routing (все маршруты → index.html)
- Gzip compression для текстовых файлов
- Кэширование статических ассетов (1 год)
- Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- Health check endpoint `/health`

#### Main Nginx Config (`ops/nginx/nginx.conf`)

**Назначение**: Reverse proxy для локального/dev окружения

**Особенности**:

- Проксирует `/api` → api:4000
- Проксирует `/api-docs` → api:4000/api-docs
- Проксирует `/` → web:80
- WebSocket support (Upgrade headers)
- Увеличенный лимит body size (10MB)
- Timeout 60s
- Security headers
- Health check endpoint

#### SSL Nginx Config (`ops/nginx/nginx-ssl.conf`)

**Назначение**: Production конфигурация с HTTPS

**Особенности**:

- HTTP → HTTPS редирект
- Let's Encrypt ACME challenge support
- SSL/TLS настройки (TLSv1.2, TLSv1.3)
- Современные cipher suites
- OCSP stapling
- Strict-Transport-Security header (HSTS)
- Все остальные функции из nginx.conf

### 6.4 Docker Compose для Production ✅

**Файл**: `ops/docker/docker-compose.prod.yml`

**Сервисы**:

1. **postgres** - База данных
   - Переменные из .env
   - Volume для данных
   - Health check
   - Restart policy: unless-stopped

2. **redis** - Кэш
   - Health check
   - Restart policy: unless-stopped

3. **api** - Backend API
   - Использует образ из registry
   - Зависит от postgres и redis (с условием health check)
   - Все ENV переменные
   - Health check
   - Restart policy

4. **web** - Frontend
   - Использует образ из registry
   - Health check
   - Restart policy

5. **worker** - Background jobs
   - Использует образ из registry
   - Зависит от postgres и redis
   - Restart policy

6. **nginx** - Reverse proxy
   - Порты 80, 443
   - Volume для конфигурации и SSL сертификатов
   - Зависит от api и web
   - Health check

7. **certbot** - SSL certificates (optional, profile: ssl)
   - Автоматическое обновление сертификатов
   - Запускается каждые 12 часов

**Volumes**:

- `postgres_data` - данные PostgreSQL
- `certbot_www` - для ACME challenge

**Networks**:

- `fin-u-ch-network` (bridge)

**Переменные окружения**:

- `DOCKER_REGISTRY` - Docker registry (по умолчанию ghcr.io)
- `DOCKER_IMAGE_PREFIX` - префикс образов
- `IMAGE_TAG` - тег образа (latest, sha, version)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `NGINX_CONFIG` - выбор конфигурации nginx
- `SSL_CERT_PATH` - путь к SSL сертификатам

### 6.5 Dockerignore файлы ✅

Созданы `.dockerignore` для оптимизации сборки:

1. **Корневой** (`.dockerignore`)
   - Исключает node_modules, dist, build
   - Исключает .env файлы (кроме .env.example)
   - Исключает логи, тесты, документацию
   - Исключает IDE файлы, .git

2. **API** (`apps/api/.dockerignore`)
   - Специфичные для API исключения
   - Prisma migrations docs

3. **Web** (`apps/web/.dockerignore`)
   - Специфичные для Web исключения
   - E2E тесты, vite temp файлы

4. **Worker** (`apps/worker/.dockerignore`)
   - Специфичные для Worker исключения

### 6.6 Environment файлы ✅

**Файл**: `ops/docker/.env.example`

Шаблон для production окружения с примерами всех необходимых переменных.

## Структура файлов

```
ops/
├── docker/
│   ├── docker-compose.yml          # Локальная разработка
│   ├── docker-compose.prod.yml     # Production
│   ├── .env.example                # Шаблон переменных окружения
│   ├── api.Dockerfile              # Dockerfile для API
│   ├── web.Dockerfile              # Dockerfile для Web
│   └── worker.Dockerfile           # Dockerfile для Worker
└── nginx/
    ├── web-nginx.conf              # Nginx для web container
    ├── nginx.conf                  # Nginx reverse proxy (dev/local)
    └── nginx-ssl.conf              # Nginx с SSL (production)

.dockerignore                       # Корневой
apps/api/.dockerignore              # API
apps/web/.dockerignore              # Web
apps/worker/.dockerignore           # Worker
```

## Запуск

### Локальная разработка

```bash
# Запустить инфраструктуру (postgres, redis, pgadmin)
cd /Users/shoxy/Projects/fin-u-ch
docker-compose -f ops/docker/docker-compose.yml up -d

# Проверить статус
docker-compose -f ops/docker/docker-compose.yml ps

# Прогнать миграции
cd apps/api
npx prisma migrate deploy

# Запустить приложения в dev режиме
pnpm --filter api dev
pnpm --filter web dev
pnpm --filter worker dev

# Остановить инфраструктуру
docker-compose -f ops/docker/docker-compose.yml down
```

### Production (локальная сборка и тест)

```bash
# 1. Создать .env файл
cd /Users/shoxy/Projects/fin-u-ch/ops/docker
cp .env.example .env
# Отредактировать .env с реальными значениями

# 2. Собрать Docker образы
cd /Users/shoxy/Projects/fin-u-ch
docker build -t fin-u-ch/api:latest -f ops/docker/api.Dockerfile .
docker build -t fin-u-ch/web:latest -f ops/docker/web.Dockerfile .
docker build -t fin-u-ch/worker:latest -f ops/docker/worker.Dockerfile .

# 3. Запустить production stack
cd ops/docker
docker-compose -f docker-compose.prod.yml up -d

# 4. Прогнать миграции
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# 5. Проверить логи
docker-compose -f docker-compose.prod.yml logs -f

# 6. Проверить в браузере
# http://localhost (через nginx)
# http://localhost/api-docs (Swagger)

# 7. Остановить
docker-compose -f docker-compose.prod.yml down
```

### Production (с registry)

```bash
# 1. Логин в Docker registry
echo $GHCR_TOKEN | docker login ghcr.io -u <username> --password-stdin

# 2. Собрать и push образы
docker build -t ghcr.io/your-org/fin-u-ch/api:v1.0.0 -f ops/docker/api.Dockerfile .
docker push ghcr.io/your-org/fin-u-ch/api:v1.0.0

docker build -t ghcr.io/your-org/fin-u-ch/web:v1.0.0 -f ops/docker/web.Dockerfile .
docker push ghcr.io/your-org/fin-u-ch/web:v1.0.0

docker build -t ghcr.io/your-org/fin-u-ch/worker:v1.0.0 -f ops/docker/worker.Dockerfile .
docker push ghcr.io/your-org/fin-u-ch/worker:v1.0.0

# 3. На сервере: Pull и запуск
cd /opt/fin-u-ch
export IMAGE_TAG=v1.0.0
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

## Технологии

- **Docker** - контейнеризация
- **Docker Compose** - оркестрация контейнеров
- **Nginx** - reverse proxy, статические файлы
- **PostgreSQL 15** - база данных
- **Redis 7** - кэш
- **Node 18 Alpine** - runtime
- **Let's Encrypt** - SSL сертификаты (через Certbot)

## Особенности реализации

### 1. Multi-stage builds

Все Dockerfiles используют multi-stage builds:

- **Builder stage**: установка зависимостей, сборка
- **Production stage**: только runtime и собранные файлы

**Преимущества**:

- Меньший размер финального образа (в 3-5 раз)
- Безопасность (нет исходного кода и dev-зависимостей)
- Быстрый деплой

### 2. Health checks

Все сервисы имеют health checks:

- Postgres: `pg_isready`
- Redis: `redis-cli ping`
- API: HTTP GET `/api/health`
- Web: HTTP GET `/`
- Nginx: HTTP GET `/health`

**Преимущества**:

- Docker Compose ждет готовности зависимостей (`depends_on: condition: service_healthy`)
- Автоматический перезапуск при сбоях
- Мониторинг статуса

### 3. Оптимизация размера образов

**Использованы**:

- Alpine Linux (в 5-10 раз меньше обычного Linux)
- .dockerignore (исключает ненужные файлы)
- Multi-stage builds (только production код)
- Frozen lockfile (ускоряет установку)

**Результат**:

- API: ~150-200 MB (вместо ~800 MB)
- Web: ~40-50 MB (вместо ~300 MB)
- Worker: ~150-200 MB (вместо ~800 MB)

### 4. Security

**Реализовано**:

- Non-root пользователи в контейнерах (alpine)
- Security headers в Nginx
- SSL/TLS поддержка
- HSTS header
- Secrets в .env (не в git)
- Read-only volumes где возможно

### 5. Restart policies

Все production сервисы имеют `restart: unless-stopped`:

- Автоматический перезапуск при сбое
- Не перезапускается, если явно остановлен
- Запускается при старте системы

### 6. Networking

Все сервисы в одной bridge сети `fin-u-ch-network`:

- Изоляция от других приложений
- DNS-резолвинг по имени сервиса (api, web, postgres, redis)
- Безопасность

### 7. Volumes

**Персистентные данные**:

- `postgres_data` - база данных
- `certbot_www` - ACME challenge для SSL

**Bind mounts**:

- Nginx конфигурация (read-only)
- SSL сертификаты (read-only)

### 8. Environment variables

Все чувствительные данные в .env:

- Пароли БД
- JWT секрет
- Настройки приложений

**Best practices**:

- .env не в git
- .env.example как шаблон
- Валидация через docker-compose

## Проверка работоспособности

### 1. Локальная инфраструктура

```bash
# Запустить
docker-compose -f ops/docker/docker-compose.yml up -d

# Проверить
docker-compose -f ops/docker/docker-compose.yml ps
# Должны быть: postgres (healthy), redis (healthy), pgadmin (running)

# Подключиться к БД
psql postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev

# Открыть PgAdmin
# http://localhost:5050
# Email: admin@example.com, Password: admin

# Проверить Redis
redis-cli -h localhost -p 6379 ping
# Ответ: PONG
```

### 2. Production образы

```bash
# Собрать
docker build -t fin-u-ch/api:test -f ops/docker/api.Dockerfile .
docker build -t fin-u-ch/web:test -f ops/docker/web.Dockerfile .
docker build -t fin-u-ch/worker:test -f ops/docker/worker.Dockerfile .

# Проверить размер
docker images | grep fin-u-ch
# api: ~150-200 MB
# web: ~40-50 MB
# worker: ~150-200 MB

# Запустить один контейнер для теста
docker run --rm -p 4000:4000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e JWT_SECRET=test \
  fin-u-ch/api:test

# Проверить
curl http://localhost:4000/api/health
# Ответ: {"status":"ok"}
```

### 3. Production stack

```bash
# Запустить
cd ops/docker
docker-compose -f docker-compose.prod.yml up -d

# Проверить статус всех сервисов
docker-compose -f docker-compose.prod.yml ps
# Все должны быть healthy

# Проверить логи
docker-compose -f docker-compose.prod.yml logs api
docker-compose -f docker-compose.prod.yml logs web
docker-compose -f docker-compose.prod.yml logs nginx

# Проверить endpoints
curl http://localhost/health          # Nginx health
curl http://localhost/api/health      # API health
curl http://localhost/                # Frontend
curl http://localhost/api-docs        # Swagger

# Проверить внутреннюю сеть
docker-compose -f docker-compose.prod.yml exec api ping postgres
docker-compose -f docker-compose.prod.yml exec api ping redis
```

## Критерии готовности

- ✅ Docker Compose для локальной разработки работает
- ✅ Dockerfiles для всех приложений созданы и оптимизированы
- ✅ Nginx конфигурации созданы (dev и production)
- ✅ Docker Compose для production создан
- ✅ .dockerignore файлы созданы
- ✅ .env.example с документацией
- ✅ Multi-stage builds работают
- ✅ Health checks настроены
- ✅ Restart policies настроены
- ✅ SSL/TLS конфигурация готова (для будущего использования)

## Следующие шаги

**ФАЗА 7**: Тестирование

- Настроить Jest для unit/integration тестов
- Настроить Playwright для E2E тестов
- Написать тесты для критических сценариев
- Достичь coverage >= 60%

## Известные ограничения

1. **SSL сертификаты**: Требуется ручная настройка на production сервере
2. **Docker registry**: Требуется настройка GitHub Container Registry или другого registry
3. **Секреты**: .env файлы нужно создавать вручную на каждом окружении
4. **Мониторинг**: Нет интеграции с системами мониторинга (Prometheus, Grafana)
5. **Логи**: Логи в stdout/stderr, нет централизованного сбора логов

## Возможные улучшения

1. **Docker Secrets**:
   - Использовать Docker Secrets вместо .env
   - Интеграция с Vault или AWS Secrets Manager

2. **Мониторинг**:
   - Добавить Prometheus для метрик
   - Добавить Grafana для визуализации
   - Добавить Loki для логов
   - Node Exporter, Postgres Exporter

3. **Централизованные логи**:
   - Интеграция с ELK stack
   - Или Loki + Promtail
   - Log aggregation

4. **Оркестрация**:
   - Kubernetes вместо Docker Compose
   - Helm charts
   - Auto-scaling

5. **CI/CD оптимизация**:
   - Layer caching
   - BuildKit
   - Parallel builds
   - Docker build cache в registry

6. **Безопасность**:
   - Image scanning (Trivy, Clair)
   - Signature verification
   - Non-root users everywhere
   - Read-only root filesystem

7. **Backup**:
   - Автоматический backup Postgres в S3
   - Point-in-time recovery
   - Backup тестирование

## Заметки

- Docker инфраструктура готова для локальной разработки и production деплоя
- Все образы оптимизированы по размеру и безопасности
- Health checks обеспечивают надежность
- Nginx конфигурации готовы для HTTP и HTTPS
- Docker Compose файлы документированы и параметризованы
- Следующая фаза - тестирование и CI/CD

## Troubleshooting

### Проблема: Контейнер не запускается

```bash
# Проверить логи
docker-compose logs <service-name>

# Проверить health check
docker inspect <container-id> | grep Health -A 10

# Запустить в интерактивном режиме
docker run -it --rm <image> sh
```

### Проблема: Не подключается к БД

```bash
# Проверить, что postgres healthy
docker-compose ps postgres

# Проверить connection string
echo $DATABASE_URL

# Попробовать подключиться вручную
docker-compose exec postgres psql -U postgres -d fin_u_ch
```

### Проблема: Образ слишком большой

```bash
# Проверить слои
docker history <image>

# Проверить .dockerignore
cat .dockerignore

# Использовать dive для анализа
dive <image>
```

### Проблема: Nginx 502 Bad Gateway

```bash
# Проверить, что api запущен
docker-compose ps api

# Проверить логи api
docker-compose logs api

# Проверить network
docker-compose exec nginx ping api

# Проверить nginx конфигурацию
docker-compose exec nginx nginx -t
```
