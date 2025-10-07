# VPS Debugging Guide

## Подключение к серверу

```bash
ssh root@83.166.244.139
```

## 1. Проверка статуса контейнеров

```bash
cd /opt/fin-u-ch
docker ps -a
```

Что искать:

- Все ли контейнеры запущены (Status: Up)?
- Есть ли контейнеры в статусе "Exited" или "Restarting"?

## 2. Проверка логов

### Все сервисы

```bash
docker compose -f docker-compose.prod.yml logs --tail=50
```

### API

```bash
docker logs fin-u-ch-api --tail=50
```

### Web

```bash
docker logs fin-u-ch-web --tail=50
```

### Nginx

```bash
docker logs fin-u-ch-nginx --tail=50
```

### Postgres

```bash
docker logs fin-u-ch-postgres --tail=50
```

### Worker

```bash
docker logs fin-u-ch-worker --tail=50
```

## 3. Проверка сети

### Проверить порты

```bash
netstat -tulpn | grep -E ':(80|443|4000|5432|6379)'
```

### Проверить доступность внутри контейнера

```bash
# Зайти в nginx контейнер
docker exec -it fin-u-ch-nginx sh

# Проверить доступность API
wget -O- http://api:4000/api/health

# Проверить доступность Web
wget -O- http://web/
```

## 4. Проверка переменных окружения

```bash
cd /opt/fin-u-ch
cat .env
```

Должно быть:

```env
DOCKER_IMAGE_PREFIX=thoxly
DOCKER_REGISTRY=ghcr.io
IMAGE_TAG=latest
```

## 5. Проверка образов

```bash
# Список загруженных образов
docker images | grep fin-u-ch

# Должны быть:
# ghcr.io/thoxly/fin-u-ch-api     latest
# ghcr.io/thoxly/fin-u-ch-web     latest
# ghcr.io/thoxly/fin-u-ch-worker  latest
```

## 6. Проверка конфигурации nginx

```bash
# Проверить какой конфиг используется
cat /opt/fin-u-ch/nginx/nginx.conf

# Проверить конфиг внутри контейнера
docker exec fin-u-ch-nginx cat /etc/nginx/conf.d/default.conf
```

## 7. Пересоздание сервисов (если нужно)

```bash
cd /opt/fin-u-ch

# Остановить все
docker compose -f docker-compose.prod.yml down

# Удалить старые образы
docker image prune -a -f

# Залогиниться в GHCR (используйте токен из GitHub)
echo "YOUR_GHCR_TOKEN" | docker login ghcr.io -u thoxly --password-stdin

# Запустить заново
docker compose -f docker-compose.prod.yml up -d

# Посмотреть логи в реальном времени
docker compose -f docker-compose.prod.yml logs -f
```

## 8. Проверка миграций Prisma

```bash
# Проверить статус миграций
docker compose -f docker-compose.prod.yml exec api pnpm prisma migrate status

# Применить миграции вручную
docker compose -f docker-compose.prod.yml exec api pnpm prisma migrate deploy
```

## 9. Проверка health endpoints

```bash
# Изнутри сервера
curl http://localhost/api/health
curl http://localhost:4000/api/health

# Проверить postgres
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U postgres
```

## 10. Типичные проблемы

### Проблема: Контейнеры не запускаются

```bash
# Проверить логи
docker compose -f docker-compose.prod.yml logs

# Проверить ошибки в конкретном сервисе
docker logs fin-u-ch-api 2>&1 | grep -i error
```

### Проблема: Nginx 502 Bad Gateway

```bash
# API не отвечает
docker logs fin-u-ch-api
curl http://api:4000/api/health

# Проблема с сетью
docker network inspect fin-u-ch_fin-u-ch-network
```

### Проблема: Database connection failed

```bash
# Проверить Postgres
docker logs fin-u-ch-postgres

# Проверить DATABASE_URL в .env
cat .env | grep DATABASE_URL

# Подключиться к БД
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d fin_u_ch
```

### Проблема: Образы не найдены

```bash
# Проверить имена образов в docker-compose
docker compose -f docker-compose.prod.yml config | grep image:

# Проверить доступность в registry
docker pull ghcr.io/thoxly/fin-u-ch-api:latest
```

## 11. Полный перезапуск

```bash
cd /opt/fin-u-ch

# Остановить всё
docker compose -f docker-compose.prod.yml down

# Очистить
docker system prune -a -f

# Залогиниться
echo "GHCR_TOKEN" | docker login ghcr.io -u thoxly --password-stdin

# Проверить .env
cat .env

# Запустить
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Применить миграции
docker compose -f docker-compose.prod.yml exec api pnpm prisma migrate deploy

# Проверить
docker ps
curl http://localhost/api/health
```

## 12. Отправить логи обратно

```bash
# Сохранить все логи в файл
docker compose -f docker-compose.prod.yml logs > /tmp/deployment-logs.txt

# Посмотреть размер
ls -lh /tmp/deployment-logs.txt

# Последние 100 строк каждого сервиса
echo "=== API ===" && docker logs fin-u-ch-api --tail=50
echo "=== WEB ===" && docker logs fin-u-ch-web --tail=50
echo "=== NGINX ===" && docker logs fin-u-ch-nginx --tail=50
echo "=== POSTGRES ===" && docker logs fin-u-ch-postgres --tail=50
```
