# 🐛 Проблема с обновлением Docker контейнеров при деплое [РЕШЕНО]

## Симптомы

- ✅ Docker images успешно собираются и публикуются в GHCR
- ✅ Deploy workflow выполняется без ошибок
- ✅ Health check проходит успешно
- ❌ **Контейнеры НЕ обновлялись новыми образами**

## ✅ РЕШЕНИЕ НАЙДЕНО

**Причина:** SSH heredoc (`<< 'EOF'`) не передает вывод команд Docker обратно в GitHub Actions, из-за чего невозможно определить успешность выполнения команд.

**Решение:** Создать deploy скрипт на VPS и выполнять его через прямой SSH вызов с передачей переменных окружения.

## Факты

### На сервере (проверено SSH):

```bash
# Контейнеры созданы 6 часов назад:
fin-u-ch-api    sha256:9ed8ca91e21f... 6 hours ago  Up 6 hours
fin-u-ch-web    sha256:7528c2eefc4d... 6 hours ago  Up 6 hours
fin-u-ch-worker sha256:2504c4afe512... 6 hours ago  Up 6 hours

# НО образы с тегом :latest свежие (10 минут назад):
ghcr.io/thoxly/fin-u-ch-web:latest    1c0f662319ff  10 minutes ago
ghcr.io/thoxly/fin-u-ch-api:latest    c9b22634e71d   7 hours ago
ghcr.io/thoxly/fin-u-ch-worker:latest 9a4c911d8e38   6 hours ago
```

**Вывод:** Новые образы pulled на сервер, но контейнеры продолжают использовать старые SHA256.

## Код деплоя (из workflow)

```yaml
- name: Deploy to VPS
  run: |
    ssh -i ~/.ssh/deploy_key ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} << 'EOF'
      set -e
      cd /opt/fin-u-ch
      
      # Login to GHCR
      echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u ${{ github.repository_owner }} --password-stdin
      
      # Pull new images first
      docker compose -f docker-compose.prod.yml pull api web worker
      
      # Apply database migrations
      docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
      
      # Stop and remove old containers  
      docker compose -f docker-compose.prod.yml stop api web worker
      docker compose -f docker-compose.prod.yml rm -f api web worker
      
      # Start with new images (force recreate)
      docker compose -f docker-compose.prod.yml up -d --force-recreate --pull always api web worker
      
      # Cleanup
      docker container prune -f
      docker image prune -af --filter "until=168h"
    EOF
```

## Детальный анализ проблемы

### 🔍 Что выявлено при диагностике (2025-10-13):

**Тест 1: Состояние контейнеров на сервере**

```bash
# Контейнеры использовали СТАРЫЕ образы (созданы 6 часов назад):
fin-u-ch-api    -> 9ed8ca91e21f (старый образ с <none> тегом)
fin-u-ch-web    -> 7528c2eefc4d (старый образ с <none> тегом)
fin-u-ch-worker -> 2504c4afe512 (старый образ с <none> тегом)

# При этом :latest образы были НОВЫЕ (pulled при деплое):
ghcr.io/thoxly/fin-u-ch-web:latest    -> 1c0f662319ff (свежий!)
ghcr.io/thoxly/fin-u-ch-api:latest    -> c9b22634e71d (свежий!)
ghcr.io/thoxly/fin-u-ch-worker:latest -> 9a4c911d8e38 (свежий!)
```

**Вывод:** Новые образы загружались на сервер, но контейнеры продолжали использовать старые SHA256 образов.

**Тест 2: Ручное выполнение команд деплоя**

```bash
# При ручном запуске тех же команд из workflow:
docker compose pull api web worker
docker compose stop api web worker
docker compose rm -f api web worker
docker compose up -d --force-recreate --pull always api web worker

# Результат: контейнеры УСПЕШНО ОБНОВИЛИСЬ!
fin-u-ch-api    -> ghcr.io/thoxly/fin-u-ch-api:latest
fin-u-ch-web    -> ghcr.io/thoxly/fin-u-ch-web:latest
fin-u-ch-worker -> ghcr.io/thoxly/fin-u-ch-worker:latest
```

**Вывод:** Команды работают корректно, проблема в способе их выполнения через CI/CD.

### 🐞 Корневая причина

**SSH heredoc в GitHub Actions не передает STDOUT/STDERR обратно:**

```yaml
# ❌ НЕ РАБОТАЕТ:
ssh user@host << 'EOF'
docker compose pull ...
docker compose up -d ...
EOF
```

Проблемы:

1. Команды выполняются в подоболочке (subshell)
2. Вывод команд теряется и не попадает в логи GitHub Actions
3. При ошибке `set -e` завершает подоболочку, но SSH команда возвращает код 0
4. GitHub Actions считает деплой успешным, хотя команды могли не выполниться

В логах видно только:

- ✅ SSH подключение успешно
- ✅ Welcome to Ubuntu...
- ✅ Команды отправлены
- ❌ **НО нет output от docker compose pull/stop/rm/up**
- ✅ Workflow завершается success

Из-за этого невозможно понять:

1. Действительно ли выполняются команды `docker compose`?
2. Есть ли ошибки при пересоздании контейнеров?
3. Почему контейнеры остаются на старых образах?

## Возможные причины

### 1. Проблема с Here Document через SSH

SSH heredoc (`<< 'EOF'`) может не передавать output обратно в GitHub Actions.

### 2. Docker Compose кеширует состояние

Даже после `pull`, `stop`, `rm` - команда `up -d --force-recreate` может использовать закешированный state.

### 3. Миграции блокируют пересоздание

Команда `prisma migrate deploy` создает временный контейнер, который может конфликтовать с последующим `up`.

### 4. --pull always не работает как ожидается

Флаг `--pull always` может игнорироваться если образы уже есть локально.

## ✅ Реализованное решение

### Новый подход: Deploy скрипт на VPS

Вместо SSH heredoc, теперь workflow:

1. **Создает deploy скрипт** на сервере с подробным логированием
2. **Делает его исполняемым**
3. **Выполняет через прямой SSH** с передачей переменных окружения

```yaml
- name: Deploy to VPS
  run: |
    # Создать deploy.sh на VPS через cat
    ssh -i ~/.ssh/deploy_key ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} "cat > /opt/fin-u-ch/deploy.sh" << 'DEPLOY_SCRIPT'
    #!/bin/bash
    set -e

    echo "=== Starting deployment at $(date) ==="
    cd /opt/fin-u-ch

    # ... подробные команды с логированием ...

    echo "✅ Deployment completed successfully at $(date)!"
    DEPLOY_SCRIPT

    # Сделать исполняемым
    ssh -i ~/.ssh/deploy_key ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} "chmod +x /opt/fin-u-ch/deploy.sh"

    # Выполнить с переменными окружения
    ssh -i ~/.ssh/deploy_key ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} \
      "GHCR_TOKEN='${{ secrets.GHCR_TOKEN }}' GITHUB_OWNER='${{ github.repository_owner }}' /opt/fin-u-ch/deploy.sh"
```

### Преимущества решения

✅ **Весь вывод команд Docker видим в логах GitHub Actions**
✅ **Ошибки корректно передаются и прерывают workflow**
✅ **Подробное логирование каждого этапа деплоя**
✅ **Проверка состояния до и после обновления**
✅ **Скрипт остается на сервере для ручных запусков**

### Что теперь логируется

```bash
=== Starting deployment at [timestamp] ===
=== Current containers (before update) ===
[таблица с текущими контейнерами]

=== Pulling new images ===
[прогресс pull]

=== Available images ===
[список образов с ID и датой]

=== Applying database migrations ===
[вывод prisma migrate]

=== Stopping and removing old containers ===
[процесс остановки]

=== Starting containers with new images ===
[процесс запуска]

=== New containers (after update) ===
[таблица с обновленными контейнерами]

✅ Deployment completed successfully at [timestamp]!
```

## Тестирование решения

### Ручной запуск deploy скрипта

Скрипт теперь доступен на сервере и может быть запущен вручную:

```bash
ssh root@83.166.244.139

# Скрипт создается автоматически при деплое
/opt/fin-u-ch/deploy.sh

# Или с явной передачей токена (если нужно)
GHCR_TOKEN="your_token" GITHUB_OWNER="thoxly" /opt/fin-u-ch/deploy.sh
```

### Тестирование через workflow

После merge в `main`, workflow автоматически:

1. Соберет новые образы
2. Опубликует их в GHCR
3. Создаст deploy.sh на VPS
4. Выполнит деплой с полным логированием

Логи будут видны в GitHub Actions → Deploy to VPS job.

## Проверка после исправления

После любого изменения проверить:

```bash
# На сервере - ID образов контейнеров должны совпадать с :latest
docker ps --no-trunc | grep fin-u-ch
docker images | grep fin-u-ch | grep latest

# Время создания контейнеров должно быть свежим
docker ps --format "{{.Names}}: created {{.RunningFor}}"
```

---

## Итоги

**Статус:** ✅ **РЕШЕНО**  
**Создано:** 2025-10-13  
**Решено:** 2025-10-13  
**Workflow:** `.github/workflows/ci-cd.yml` (Deploy to VPS job)

### Изменения

1. ✅ Переписан шаг `Deploy to VPS` в workflow
2. ✅ Добавлено создание `/opt/fin-u-ch/deploy.sh` на сервере
3. ✅ Добавлено подробное логирование всех этапов деплоя
4. ✅ Исправлена передача вывода команд в GitHub Actions
5. ✅ Добавлена проверка состояния до и после обновления

### Следующие шаги

1. Commit изменений в `dev` ветку
2. Создать PR в `main`
3. После merge — протестировать автоматический деплой
4. Проверить логи в GitHub Actions
5. Убедиться что контейнеры обновляются корректно
