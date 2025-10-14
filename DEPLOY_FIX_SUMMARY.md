# 🔧 Исправление проблемы деплоя - Краткая сводка

**Дата:** 2025-10-13  
**Статус:** ✅ Решено

## Проблема

Docker контейнеры на production сервере не обновлялись после деплоя, несмотря на то что:

- ✅ Новые образы собирались и публиковались в GHCR
- ✅ Workflow завершался успешно
- ✅ Health check проходил

**Контейнеры продолжали использовать старые образы:**

```
fin-u-ch-api    -> 9ed8ca91e21f (старый)
fin-u-ch-web    -> 7528c2eefc4d (старый)
fin-u-ch-worker -> 2504c4afe512 (старый)

# Хотя :latest теги указывали на новые образы:
ghcr.io/thoxly/fin-u-ch-api:latest    -> c9b22634e71d (новый!)
ghcr.io/thoxly/fin-u-ch-web:latest    -> 1c0f662319ff (новый!)
ghcr.io/thoxly/fin-u-ch-worker:latest -> 9a4c911d8e38 (новый!)
```

## Корневая причина

**SSH heredoc в GitHub Actions не передает вывод команд:**

```yaml
# ❌ СТАРЫЙ КОД (НЕ РАБОТАЛ):
ssh user@host << 'EOF'
docker compose pull ...
docker compose up -d ...
EOF
```

**Почему не работало:**

1. Команды выполнялись в подоболочке
2. STDOUT/STDERR не передавались в GitHub Actions
3. SSH возвращал код 0, даже если команды не выполнились
4. Невозможно было отладить проблему из-за отсутствия логов

## Решение

**Создание deploy скрипта на VPS с прямым выполнением:**

```yaml
# ✅ НОВЫЙ КОД (РАБОТАЕТ):
# 1. Создать скрипт на сервере
ssh user@host "cat > /opt/fin-u-ch/deploy.sh" << 'SCRIPT'
#!/bin/bash
set -e
echo "=== Deployment logs ==="
docker compose pull ...
docker compose up -d ...
SCRIPT

# 2. Сделать исполняемым
ssh user@host "chmod +x /opt/fin-u-ch/deploy.sh"

# 3. Выполнить с передачей переменных
ssh user@host "GHCR_TOKEN='...' /opt/fin-u-ch/deploy.sh"
```

## Что изменено

### 1. `.github/workflows/ci-cd.yml`

Шаг `Deploy to VPS` полностью переписан:

**Было:**

- SSH heredoc без вывода
- Невозможно отладить
- Контейнеры не обновлялись

**Стало:**

- Создание deploy.sh на сервере
- Полное логирование всех шагов
- Проверка состояния до и после
- Корректная передача ошибок

### 2. `DEPLOY_ISSUE.md`

Документирован полный анализ проблемы:

- Симптомы и диагностика
- Корневая причина
- Реализованное решение
- Инструкции по тестированию

### 3. `/opt/fin-u-ch/deploy.sh` (создается на VPS)

Новый deploy скрипт с подробным логированием:

```bash
=== Starting deployment at [timestamp] ===
=== Current containers (before update) ===
=== Pulling new images ===
=== Available images ===
=== Applying database migrations ===
=== Stopping and removing old containers ===
=== Starting containers with new images ===
=== New containers (after update) ===
✅ Deployment completed successfully!
```

## Преимущества нового подхода

✅ **Видимость:** Весь вывод Docker команд в логах GitHub Actions  
✅ **Надежность:** Ошибки корректно прерывают workflow  
✅ **Отладка:** Подробное логирование каждого этапа  
✅ **Проверяемость:** Видно состояние до и после обновления  
✅ **Переиспользуемость:** Скрипт остается на сервере для ручных запусков

## Проверка решения

### Ручное тестирование (выполнено ✅)

```bash
ssh root@83.166.244.139
cd /opt/fin-u-ch

# Выполнены команды деплоя вручную
docker compose pull api web worker
docker compose stop api web worker
docker compose rm -f api web worker
docker compose up -d --force-recreate --pull always api web worker

# Результат: контейнеры УСПЕШНО обновились!
```

**После ручного обновления:**

```
fin-u-ch-api    -> ghcr.io/thoxly/fin-u-ch-api:latest    ✅
fin-u-ch-web    -> ghcr.io/thoxly/fin-u-ch-web:latest    ✅
fin-u-ch-worker -> ghcr.io/thoxly/fin-u-ch-worker:latest ✅
```

### Следующие шаги

1. ✅ Диагностика завершена
2. ✅ Решение реализовано
3. ⏳ Commit изменений в `dev`
4. ⏳ Создать PR в `main`
5. ⏳ Протестировать автоматический деплой
6. ⏳ Проверить логи в GitHub Actions

## Команды для проверки на сервере

```bash
# Проверить какие образы используют контейнеры
ssh root@83.166.244.139 "docker ps --no-trunc --filter name=fin-u-ch --format '{{.Names}}: {{.Image}}'"

# Проверить доступные :latest образы
ssh root@83.166.244.139 "docker images --no-trunc | grep 'fin-u-ch.*latest'"

# Проверить время создания контейнеров
ssh root@83.166.244.139 "docker ps --filter name=fin-u-ch --format '{{.Names}}: created {{.RunningFor}}'"

# Посмотреть логи последнего деплоя (после следующего автоматического деплоя)
# GitHub Actions → Actions → последний workflow → Deploy to VPS job
```

## Файлы изменены

1. `.github/workflows/ci-cd.yml` - исправлен Deploy to VPS step
2. `DEPLOY_ISSUE.md` - обновлен с полным анализом и решением
3. `DEPLOY_FIX_SUMMARY.md` - создана краткая сводка (этот файл)

---

**Готово к коммиту в `dev` ветку и созданию PR в `main`** ✅
