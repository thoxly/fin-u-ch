# Ручное обновление Docker на сервере

## Подключение к серверу

```bash
ssh -i ~/.ssh/id_rsa_server root@83.166.244.139
```

## Быстрое решение (рекомендуется)

Выполните все команды одной строкой:

```bash
cd /opt/fin-u-ch && \
echo "Pulling latest images..." && \
docker compose -f docker-compose.prod.yml pull api web worker && \
echo "Stopping containers..." && \
docker compose -f docker-compose.prod.yml stop api web worker && \
echo "Removing old containers..." && \
docker compose -f docker-compose.prod.yml rm -f api web worker && \
echo "Running migrations..." && \
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy && \
echo "Starting with new images..." && \
docker compose -f docker-compose.prod.yml up -d --force-recreate api web worker && \
echo "Waiting for services..." && \
sleep 30 && \
echo "Checking status..." && \
docker compose -f docker-compose.prod.yml ps && \
echo "✅ Update complete!"
```

## Пошаговое решение

### 1. Перейти в директорию проекта

```bash
cd /opt/fin-u-ch
```

### 2. Проверить текущие образы

```bash
docker images | grep fin-u-ch
```

### 3. Login в GitHub Container Registry (если необходимо)

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u thoxly --password-stdin
```

Или используйте токен из .env файла:

```bash
source .env
echo "$GHCR_TOKEN" | docker login ghcr.io -u $DOCKER_IMAGE_PREFIX --password-stdin
```

### 4. Удалить локальные образы (опционально, но рекомендуется)

```bash
# Удалить все fin-u-ch образы
docker rmi -f $(docker images | grep fin-u-ch | awk '{print $3}')
```

### 5. Pull свежих образов

```bash
docker compose -f docker-compose.prod.yml pull api web worker
```

### 6. Остановить и удалить старые контейнеры

```bash
docker compose -f docker-compose.prod.yml stop api web worker
docker compose -f docker-compose.prod.yml rm -f api web worker
```

### 7. Применить миграции БД

```bash
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
```

### 8. Запустить с новыми образами

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate api web worker
```

### 9. Проверить статус

```bash
docker compose -f docker-compose.prod.yml ps
```

### 10. Проверить логи

```bash
# Все сервисы
docker compose -f docker-compose.prod.yml logs -f

# Конкретный сервис
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f worker
```

### 11. Проверить health

```bash
curl http://localhost/api/health
```

### 12. Очистить старые образы

```bash
docker image prune -af --filter "until=168h"
docker container prune -f
```

## Диагностика проблем

### Проверить переменные окружения

```bash
cat .env | grep DOCKER
```

Должно быть:

```
DOCKER_REGISTRY=ghcr.io
DOCKER_IMAGE_PREFIX=thoxly
IMAGE_TAG=latest
```

### Проверить какие образы используются

```bash
docker compose -f docker-compose.prod.yml config | grep image
```

### Проверить что образы скачались

```bash
docker images | grep fin-u-ch
```

Вы должны увидеть образы с тегом `latest` и временем создания (свежие):

```
ghcr.io/thoxly/fin-u-ch-api     latest    abc123    2 minutes ago    500MB
ghcr.io/thoxly/fin-u-ch-web     latest    def456    2 minutes ago    50MB
ghcr.io/thoxly/fin-u-ch-worker  latest    ghi789    2 minutes ago    480MB
```

### Проверить что контейнеры используют правильные образы

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

### Полная перезагрузка (если ничего не помогло)

```bash
cd /opt/fin-u-ch

# Остановить всё
docker compose -f docker-compose.prod.yml down

# Удалить все образы
docker rmi -f $(docker images | grep fin-u-ch | awk '{print $3}')

# Заново pull
docker compose -f docker-compose.prod.yml pull

# Запустить
docker compose -f docker-compose.prod.yml up -d
```

## Автоматизация через скрипт

Скопируйте скрипт на сервер:

```bash
# На локальной машине
scp -i ~/.ssh/id_rsa_server ops/scripts/force-docker-update.sh root@83.166.244.139:/opt/fin-u-ch/

# На сервере
ssh -i ~/.ssh/id_rsa_server root@83.166.244.139
cd /opt/fin-u-ch
chmod +x force-docker-update.sh
./force-docker-update.sh
```

## Проверка что CI/CD работает правильно

После ручного обновления, проверьте что в следующий раз CI/CD сработает автоматически:

### Проверить GitHub Secrets

В репозитории Settings → Secrets → Actions должны быть:

- `GHCR_TOKEN` - GitHub Personal Access Token с правами на GHCR
- `VPS_HOST` = `83.166.244.139`
- `VPS_USER` = `root`
- `VPS_SSH_KEY` - приватный ключ для SSH

### Проверить права на GHCR образы

GitHub Container Registry → Packages → Visibility должен быть:

- **Private** с доступом для GitHub Actions

### Тестовый деплой

Сделайте небольшое изменение и push в `main`:

```bash
git checkout main
echo "# Test deploy $(date)" >> README.md
git add README.md
git commit -m "test: force CI/CD deploy"
git push origin main
```

Проверьте в Actions что деплой прошёл успешно.

## Дополнительная диагностика

### Проверить образы в GHCR

```bash
# Локально
docker login ghcr.io -u thoxly
docker pull ghcr.io/thoxly/fin-u-ch-api:latest
docker inspect ghcr.io/thoxly/fin-u-ch-api:latest | grep Created
```

### Сравнить образы локально и на сервере

```bash
# На сервере
ssh -i ~/.ssh/id_rsa_server root@83.166.244.139 "docker images | grep fin-u-ch"

# Локально (если есть Docker)
docker images | grep fin-u-ch
```

## Возможные причины проблемы

1. **Docker кэширует старые образы** - решается через `--pull always`
2. **Неправильный IMAGE_TAG в .env** - должен быть `latest`
3. **Отсутствует авторизация в GHCR** - нужен валидный GHCR_TOKEN
4. **Образы не собираются в CI/CD** - проверить job `docker-build` в Actions
5. **Образы не пушатся в GHCR** - проверить GHCR_TOKEN и права

## Мониторинг после обновления

```bash
# Статус в реальном времени
watch -n 2 'docker compose -f docker-compose.prod.yml ps'

# Логи в реальном времени
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Использование ресурсов
docker stats

# Health check
watch -n 5 'curl -s http://localhost/api/health | jq'
```
