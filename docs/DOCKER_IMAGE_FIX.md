# Docker Image Naming Fix

## Проблема

При деплое на VPS возникала ошибка `manifest unknown` - Docker не мог найти образы в GHCR.

## Причина

Несоответствие в формировании имён Docker образов:

### Было (неправильно):

**docker-compose.prod.yml:**

```yaml
api:
  image: ${DOCKER_REGISTRY:-ghcr.io}/${DOCKER_IMAGE_PREFIX:-thoxly/fin-u-ch-api}:${IMAGE_TAG:-latest}
```

**VPS .env:**

```env
DOCKER_IMAGE_PREFIX=thoxly/fin-u-ch
```

**Результат:** `ghcr.io/thoxly/fin-u-ch:latest` ❌ (нет суффикса `-api`)

### CI/CD пушит:

```
ghcr.io/thoxly/fin-u-ch-api:latest
ghcr.io/thoxly/fin-u-ch-web:latest
ghcr.io/thoxly/fin-u-ch-worker:latest
```

## Решение

### 1. Исправлен docker-compose.prod.yml

```yaml
api:
  image: ${DOCKER_REGISTRY:-ghcr.io}/${DOCKER_IMAGE_PREFIX:-thoxly}/fin-u-ch-api:${IMAGE_TAG:-latest}

web:
  image: ${DOCKER_REGISTRY:-ghcr.io}/${DOCKER_IMAGE_PREFIX:-thoxly}/fin-u-ch-web:${IMAGE_TAG:-latest}

worker:
  image: ${DOCKER_REGISTRY:-ghcr.io}/${DOCKER_IMAGE_PREFIX:-thoxly}/fin-u-ch-worker:${IMAGE_TAG:-latest}
```

### 2. Обновлён env.example

```env
DOCKER_IMAGE_PREFIX=thoxly  # Только org/username, без имени проекта
```

### 3. Добавлен шаг в CI/CD

Теперь перед деплоем CI/CD автоматически обновляет `.env` на VPS:

```yaml
- name: Ensure VPS environment variables
  run: |
    ssh -i ~/.ssh/deploy_key ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} << 'EOF'
      cd /opt/fin-u-ch
      sed -i "s|^DOCKER_IMAGE_PREFIX=.*|DOCKER_IMAGE_PREFIX=${{ github.repository_owner }}|g" .env
    EOF
```

## Правильный формат

**DOCKER_IMAGE_PREFIX** должен содержать **только** GitHub org/username:

- ✅ `DOCKER_IMAGE_PREFIX=thoxly`
- ❌ `DOCKER_IMAGE_PREFIX=thoxly/fin-u-ch`
- ❌ `DOCKER_IMAGE_PREFIX=thoxly/fin-u-ch-api`

Полное имя образа формируется так:

```
${DOCKER_REGISTRY}/${DOCKER_IMAGE_PREFIX}/fin-u-ch-{api|web|worker}:${IMAGE_TAG}
                    └─────┬──────┘ └──────────┬─────────┘
                       org/user          имя проекта + суффикс
```

Результат: `ghcr.io/thoxly/fin-u-ch-api:latest` ✅

## Проверка

После деплоя проверить:

```bash
# На VPS
cd /opt/fin-u-ch
cat .env | grep DOCKER_IMAGE_PREFIX
# Должно быть: DOCKER_IMAGE_PREFIX=thoxly

# Проверить какие образы используются
docker compose -f docker-compose.prod.yml config | grep image:
# Должно быть:
# image: ghcr.io/thoxly/fin-u-ch-api:latest
# image: ghcr.io/thoxly/fin-u-ch-web:latest
# image: ghcr.io/thoxly/fin-u-ch-worker:latest
```

## Файлы изменены

1. `ops/docker/docker-compose.prod.yml` - исправлена структура имён образов
2. `env.example` - обновлён пример DOCKER_IMAGE_PREFIX
3. `.github/workflows/ci-cd.yml` - добавлен шаг обновления .env на VPS
4. `ops/docker/README.md` - обновлена документация

## Дата исправления

7 октября 2025
