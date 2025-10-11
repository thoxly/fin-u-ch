# Docker Cleanup Strategy

Документация по управлению дисковым пространством Docker на VPS.

## 🎯 Проблема

Docker накапливает неиспользуемые ресурсы после каждого деплоя:

- **Старые образы** (после обновления до новой версии)
- **Остановленные контейнеры** (если деплой failed)
- **Неиспользуемые volumes**
- **Build cache**
- **Networks**

Без регулярной очистки диск может заполниться.

## ✅ Решение: Автоматический cleanup в CI/CD

**Стратегия**: Cleanup выполняется автоматически после каждого деплоя в production.

### Как работает

При каждом push в `main`:

1. ✅ Собираются новые Docker образы
2. ✅ Образы публикуются в GHCR
3. ✅ Деплой на VPS:
   - Pull новых образов
   - Применение миграций
   - Остановка старых контейнеров
   - Удаление старых контейнеров
   - Запуск новых контейнеров
   - **🧹 Cleanup неиспользуемых ресурсов**

### Что удаляется

```bash
# В .github/workflows/ci-cd.yml (deploy job)

# 1. Остановленные контейнеры
docker container prune -f

# 2. Неиспользуемые образы старше 7 дней
docker image prune -af --filter "until=168h"

# 3. Неиспользуемые volumes
docker volume prune -f

# 4. Неиспользуемые networks
docker network prune -f
```

### Что НЕ удаляется

- ✅ **Запущенные контейнеры** - работают дальше
- ✅ **Образы используемые контейнерами** - остаются
- ✅ **Volumes с данными** - только неиспользуемые удаляются
- ✅ **Свежие образы** (< 7 дней) - остаются для возможности rollback

---

## 📊 Мониторинг

### Проверка использования диска

```bash
# На VPS - общее использование
ssh root@vps "df -h /"

# Docker использование
ssh root@vps "docker system df"
```

**Пример результата:**

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          12        6         2.757GB   1.673GB (60%)
Containers      6         6         1.044kB   0B (0%)
Local Volumes   12        3         48.86MB   792B (0%)
Build Cache     0         0         0B        0B
```

### Проверка что cleanup работает

```bash
# 1. Посмотреть логи последнего деплоя
gh run list --branch main --limit 1

# 2. Посмотреть детали cleanup в логах
gh run view <run-id> --log | grep -A 10 "cleanup\|prune"

# 3. Проверить сколько места освободилось
ssh root@vps "docker system df"
```

---

## 🧪 Ручной cleanup (если нужно)

Если нужно освободить место **между деплоями**:

### Безопасный cleanup (рекомендуется)

```bash
ssh root@vps

# Остановленные контейнеры
docker container prune -f

# Неиспользуемые образы старше 7 дней
docker image prune -af --filter "until=168h"

# Неиспользуемые volumes
docker volume prune -f

# Неиспользуемые networks
docker network prune -f
```

### Агрессивный cleanup (осторожно!)

```bash
ssh root@vps

# Удалить ВСЁ неиспользуемое (включая свежие образы)
docker system prune -af --volumes

# ⚠️ Внимание: удалит все неиспользуемые образы,
# включая те что нужны для быстрого rollback
```

---

## ⚙️ Настройка (для разработчиков)

### Изменение политики хранения

В `.github/workflows/ci-cd.yml` можно изменить фильтры:

```yaml
# Хранить образы 3 дня вместо 7
docker image prune -af --filter "until=72h"

# Хранить образы 14 дней (для редких деплоев)
docker image prune -af --filter "until=336h"

# Удалять все неиспользуемые образы (агрессивно)
docker image prune -af
```

### Добавление логирования

Можно добавить логирование результатов cleanup:

```yaml
- name: Cleanup and log results
  run: |
    ssh ... << 'EOF'
      echo "Before cleanup:"
      docker system df
      
      docker image prune -af --filter "until=168h"
      
      echo "After cleanup:"
      docker system df
    EOF
```

---

## 🚨 Troubleshooting

### Проблема: Диск заполнен

**Симптомы:**

```
Error: no space left on device
```

**Решение:**

1. **Проверить что занимает место:**

```bash
ssh root@vps
df -h /
du -sh /var/lib/docker/*
```

2. **Экстренный cleanup:**

```bash
# Остановить ненужные сервисы
docker compose -f docker-compose.prod.yml stop pgadmin

# Агрессивная очистка
docker system prune -af --volumes

# Очистка логов
truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

3. **Перезапустить приложение:**

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Проблема: Cleanup удалил нужные образы

**Решение:**
Образы автоматически скачаются при следующем деплое или можно вручную:

```bash
ssh root@vps
cd /opt/fin-u-ch
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Проблема: После cleanup контейнеры не запускаются

**Причина:** Возможно удалились volumes с данными

**Решение:**

```bash
# Восстановить volumes из backup
ssh root@vps
cd /opt/fin-u-ch

# Проверить что volumes существуют
docker volume ls

# Если нужно - восстановить БД из backup
# (см. docs/BACKUP_STRATEGY.md)
```

---

## 📈 Метрики и алерты (опционально)

### Простой мониторинг через GitHub Actions

Можно добавить проверку использования диска в deploy job:

```yaml
- name: Check disk usage
  run: |
    ssh ... << 'EOF'
      DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
      echo "Disk usage: ${DISK_USAGE}%"
      
      if [ $DISK_USAGE -gt 80 ]; then
        echo "⚠️  WARNING: Disk usage is high (${DISK_USAGE}%)"
        exit 1
      fi
    EOF
```

### Интеграция с мониторингом

Если используете Prometheus/Grafana:

- **Node Exporter** - метрики диска
- **cAdvisor** - метрики Docker контейнеров
- Алерт при disk usage > 80%

---

## 💡 Best Practices

### ✅ DO (Рекомендуется)

- Проверять `docker system df` после деплоя
- Использовать фильтр `until=168h` для безопасности
- Логировать результаты cleanup в CI/CD
- Мониторить использование диска

### ❌ DON'T (Не рекомендуется)

- Не удалять volumes без backup
- Не использовать `docker system prune -af --volumes` в автоматическом режиме
- Не хранить логи внутри контейнеров (они растут)
- Не забывать про monitoring

---

## 📚 Связанные документы

- [CI_CD.md](./CI_CD.md) - CI/CD Pipeline (где настроен cleanup)
- [SETUP_EXTERNAL.md](./SETUP_EXTERNAL.md) - Настройка VPS
- [BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md) - Стратегия бэкапов

---

## 📊 Полезные команды

```bash
# === Мониторинг ===

# Docker использование
ssh root@vps "docker system df"

# Детальная информация
ssh root@vps "docker system df -v"

# Общее использование диска
ssh root@vps "df -h /"

# Размер директории Docker
ssh root@vps "du -sh /var/lib/docker"

# === Cleanup ===

# Безопасный cleanup
ssh root@vps "docker image prune -af --filter 'until=168h'"

# Проверить что можно удалить (dry-run)
ssh root@vps "docker image prune -a --filter 'until=168h'"

# Агрессивный cleanup (всё неиспользуемое)
ssh root@vps "docker system prune -af"

# === Информация ===

# Список всех образов
ssh root@vps "docker images"

# Список контейнеров (включая остановленные)
ssh root@vps "docker ps -a"

# Список volumes
ssh root@vps "docker volume ls"
```

---

**Последнее обновление**: 2024-10-11  
**Автор**: DevOps Team  
**Стратегия**: Автоматический cleanup в CI/CD после каждого деплоя
