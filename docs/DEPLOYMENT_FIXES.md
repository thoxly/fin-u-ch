# Deployment Fixes - 7 октября 2025

Полный список исправлений для успешного деплоя на VPS.

## 🔴 Проблема 1: Manifest Unknown

### Симптом

```
Error response from daemon: manifest unknown
web Error manifest unknown
```

### Причина

Несоответствие в формировании имён Docker образов:

- CI/CD пушил: `ghcr.io/thoxly/fin-u-ch-api:latest`
- VPS пытался пулить: `ghcr.io/thoxly/fin-u-ch:latest` (без суффикса `-api`)

### Решение

**Коммит:** `b8dd5f7`

1. **Исправлен docker-compose.prod.yml:**

   ```yaml
   # Было:
   image: ${DOCKER_IMAGE_PREFIX:-thoxly/fin-u-ch-api}

   # Стало:
   image: ${DOCKER_IMAGE_PREFIX:-thoxly}/fin-u-ch-api
   ```

2. **Обновлён env.example:**

   ```env
   DOCKER_IMAGE_PREFIX=thoxly  # Только org/username
   ```

3. **Добавлен автоматический шаг в CI/CD:**
   ```yaml
   - name: Ensure VPS environment variables
     # Автоматически устанавливает DOCKER_IMAGE_PREFIX на VPS
   ```

## 🔴 Проблема 2: Prisma OpenSSL Error

### Симптом

```
Error: Could not parse schema engine response: SyntaxError: Unexpected token E in JSON at position 0
prisma:warn Prisma failed to detect the libssl/openssl version to use
```

### Причина

Alpine Linux в Docker образах не имеет OpenSSL, необходимого для работы Prisma.

### Решение

**Коммит:** `4d14fd5`

Добавлена установка OpenSSL в Dockerfile:

```dockerfile
# Install OpenSSL for Prisma
RUN apk add --no-cache openssl
```

Изменённые файлы:

- `ops/docker/api.Dockerfile` (builder + production stages)
- `ops/docker/worker.Dockerfile` (builder + production stages)

Дополнительно:

- Убран устаревший атрибут `version: '3.9'` из docker-compose файлов

## 🔴 Проблема 3: Health Check HTTPS Error

### Симптом

```
curl: (7) Failed to connect to *** port 443 after 120 ms: Couldn't connect to server
```

### Причина

Health check пытался подключиться по HTTPS, но SSL не настроен на VPS.

### Решение

**Коммит:** `ee8aa79`

Изменён health check в CI/CD:

```yaml
# Было:
curl -f https://${{ secrets.VPS_HOST }}/api/health

# Стало:
curl -f http://${{ secrets.VPS_HOST }}/api/health
```

Также увеличен sleep с 10 до 15 секунд для полного запуска сервисов.

## ✅ Финальная конфигурация

### docker-compose.prod.yml

```yaml
services:
  api:
    image: ${DOCKER_REGISTRY:-ghcr.io}/${DOCKER_IMAGE_PREFIX:-thoxly}/fin-u-ch-api:${IMAGE_TAG:-latest}
  web:
    image: ${DOCKER_REGISTRY:-ghcr.io}/${DOCKER_IMAGE_PREFIX:-thoxly}/fin-u-ch-web:${IMAGE_TAG:-latest}
  worker:
    image: ${DOCKER_REGISTRY:-ghcr.io}/${DOCKER_IMAGE_PREFIX:-thoxly}/fin-u-ch-worker:${IMAGE_TAG:-latest}
```

### Dockerfile (api/worker)

```dockerfile
FROM node:18-alpine AS builder
RUN apk add --no-cache openssl
# ...

FROM node:18-alpine
RUN apk add --no-cache openssl
# ...
```

### .env на VPS

```env
DOCKER_REGISTRY=ghcr.io
DOCKER_IMAGE_PREFIX=thoxly
IMAGE_TAG=latest
```

## 🔴 Проблема 4: Prisma Client Not Found

### Симптом

```
Error: Cannot find module '.prisma/client/default'
ELIFECYCLE Command failed with exit code 1
```

### Причина

В production stage Dockerfile выполнялся `pnpm install --prod`, который перезаписывал `node_modules` и удалял сгенерированный Prisma Client.

### Решение

**Коммит:** `3026525`

Убран `pnpm install --prod` и используются `node_modules` из builder stage:

```dockerfile
# Было:
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Стало:
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
# Без pnpm install
```

Изменённые файлы:

- `ops/docker/api.Dockerfile`
- `ops/docker/worker.Dockerfile`

## 📊 Коммиты

```
3026525 - fix: preserve Prisma Client in Docker images
ee8aa79 - fix: use HTTP instead of HTTPS for health check
4d14fd5 - fix: add OpenSSL to Docker images for Prisma compatibility
b8dd5f7 - fix: correct Docker image naming in production deployment
```

## 🎯 Результат

После всех исправлений деплой должен проходить успешно:

1. ✅ Docker образы с правильными именами
2. ✅ OpenSSL установлен для Prisma
3. ✅ Health check использует HTTP
4. ✅ Автоматическое обновление .env на VPS

## 🔍 Проверка после деплоя

```bash
# SSH в VPS
ssh root@83.166.244.139

# Проверить запущенные контейнеры
docker ps

# Проверить логи API
docker logs fin-u-ch-api

# Проверить health endpoint
curl http://83.166.244.139/api/health

# Проверить переменные окружения
cd /opt/fin-u-ch
cat .env | grep DOCKER_IMAGE_PREFIX
# Должно быть: DOCKER_IMAGE_PREFIX=thoxly
```

## 📚 Дополнительно

- Все изменения применяются автоматически через CI/CD
- GHCR токен настроен в GitHub Secrets
- SSH ключ для VPS настроен
- Branch protection bypass для main (для быстрых hotfix)

## 🚀 Следующие шаги

1. Настроить SSL сертификат (Let's Encrypt)
2. Обновить health check на HTTPS после настройки SSL
3. Настроить мониторинг и алерты
4. Добавить автоматические бэкапы БД
