# 🛡️ Стратегия бэкапов и восстановления

## Цель

Обеспечить полную защиту проекта от потери данных и возможность быстрого восстановления после любых проблем.

## 🔐 Уровни защиты

### 1. Git - Контроль версий кода ✅

**Что защищено**: Весь исходный код, конфигурации, документация

**Где хранится**:

- GitHub: https://github.com/thoxly/fin-u-ch.git
- Локальные копии у всех разработчиков

**Как восстановить**:

```bash
# Клонировать репозиторий
git clone https://github.com/thoxly/fin-u-ch.git

# Откатиться к конкретному коммиту
git checkout <commit-hash>

# Откатиться к предыдущему коммиту
git reset --hard HEAD~1
```

**Автоматическое резервирование**: Да, каждый push создаёт новую версию в GitHub

---

### 2. Docker Images - Версии приложения ✅

**Что защищено**: Собранные версии API, Web, Worker

**Где хранится**: GitHub Container Registry (GHCR)

**Формат тегов**:

- `ghcr.io/thoxly/fin-u-ch-api:latest` - последняя версия
- `ghcr.io/thoxly/fin-u-ch-api:6cb34bc` - конкретный commit

**Как откатиться к предыдущей версии**:

```bash
# На VPS
ssh root@83.166.244.139
cd /opt/fin-u-ch

# Посмотреть доступные версии
docker images | grep fin-u-ch-api

# Изменить IMAGE_TAG в .env на нужный commit
nano .env
# IMAGE_TAG=6cb34bc

# Перезапустить с нужной версией
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate api web worker
```

**Автоматическое резервирование**: Да, при каждом merge в main

**Срок хранения**: Бессрочно (можно настроить retention policy)

---

### 3. База данных - Критические данные ⚠️ ТРЕБУЕТ НАСТРОЙКИ

**Что защищено**:

- Пользователи
- Компании
- Операции
- Справочники
- Планы
- Отчёты

**Текущее состояние**:

- ✅ Создаётся backup перед каждым деплоем (в CI/CD)
- ⚠️ НЕ настроены регулярные автоматические бэкапы
- ⚠️ НЕ настроено хранение вне VPS

**Где должны храниться бэкапы**:

1. `/opt/fin-u-ch/backups/` на VPS (локально)
2. Внешнее хранилище (S3, Backblaze, etc.) - РЕКОМЕНДУЕТСЯ
3. Локальная машина (периодически скачивать)

---

## 📋 Чек-лист защиты проекта

### GitHub Repository Protection

- [ ] **Branch Protection для `main`**
  - [ ] Require pull request before merging
  - [ ] Require 1+ approvals
  - [ ] Require status checks (CI/CD)
  - [ ] Dismiss stale reviews
  - [ ] Require conversation resolution
  - [ ] Block force pushes
  - [ ] Block deletions

- [ ] **Branch Protection для `dev`**
  - [ ] Require pull request before merging
  - [ ] Require status checks (CI/CD)
  - [ ] Block force pushes

- [ ] **Repository Settings**
  - [ ] Enable vulnerability alerts
  - [ ] Enable Dependabot security updates
  - [ ] Enable Dependabot version updates
  - [ ] Require 2FA for contributors
  - [ ] Limit who can push to repository

### Backup Systems

- [ ] **Автоматические бэкапы БД**
  - [ ] Ежедневные полные бэкапы (cron на VPS)
  - [ ] Еженедельные бэкапы на внешнее хранилище
  - [ ] Тестирование восстановления из бэкапа (раз в месяц)
  - [ ] Retention policy (хранить 30 дней)

- [ ] **Мониторинг бэкапов**
  - [ ] Уведомления при неудачном бэкапе
  - [ ] Проверка размера бэкапов
  - [ ] Проверка возраста последнего бэкапа

### Disaster Recovery

- [ ] **Документация**
  - [ ] Процедура восстановления базы данных
  - [ ] Процедура отката к предыдущей версии кода
  - [ ] Процедура восстановления VPS с нуля
  - [ ] Контакты и доступы (безопасно хранятся)

- [ ] **Тестирование**
  - [ ] Тест восстановления из бэкапа (раз в квартал)
  - [ ] Тест отката версии приложения
  - [ ] Проверка работы CI/CD pipeline

### Monitoring & Alerts

- [ ] **Health Checks**
  - [ ] API health endpoint работает
  - [ ] Monitoring в CI/CD после деплоя
  - [ ] Внешний uptime monitoring (UptimeRobot, etc.)

- [ ] **Уведомления**
  - [ ] GitHub Actions уведомления (email/Slack)
  - [ ] Уведомления о неудачном деплое
  - [ ] Уведомления о критических ошибках в логах

---

## 🔄 Автоматические бэкапы БД

### Скрипт для ежедневных бэкапов

Файл: `/opt/fin-u-ch/scripts/backup-db.sh`

```bash
#!/bin/bash
set -e

# Конфигурация
BACKUP_DIR="/opt/fin-u-ch/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup-${DATE}.sql"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Создать директорию если не существует
mkdir -p $BACKUP_DIR

echo "[$(date)] Starting database backup..." | tee -a $LOG_FILE

# Создать бэкап
cd /opt/fin-u-ch
docker compose exec -T postgres pg_dump -U postgres fin_u_ch > $BACKUP_FILE

# Проверить что файл создан
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date)] Backup completed successfully: $BACKUP_FILE ($SIZE)" | tee -a $LOG_FILE

    # Сжать бэкап
    gzip $BACKUP_FILE
    echo "[$(date)] Backup compressed: ${BACKUP_FILE}.gz" | tee -a $LOG_FILE
else
    echo "[$(date)] ERROR: Backup failed!" | tee -a $LOG_FILE
    exit 1
fi

# Удалить старые бэкапы (старше RETENTION_DAYS дней)
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Old backups cleaned (older than $RETENTION_DAYS days)" | tee -a $LOG_FILE

echo "[$(date)] Backup process completed" | tee -a $LOG_FILE
```

### Настройка cron на VPS

```bash
# На VPS
crontab -e

# Добавить задачу (каждый день в 3:00 утра)
0 3 * * * /opt/fin-u-ch/scripts/backup-db.sh
```

---

## 🔙 Процедуры восстановления

### 1. Восстановление из бэкапа БД

```bash
# На VPS
ssh root@83.166.244.139
cd /opt/fin-u-ch/backups

# Посмотреть доступные бэкапы
ls -lh backup-*.sql.gz

# Выбрать нужный бэкап и распаковать
gunzip backup-20240108-030001.sql.gz

# Остановить API и Worker (чтобы не было конфликтов)
cd /opt/fin-u-ch
docker compose stop api worker

# Восстановить базу данных
docker compose exec -T postgres psql -U postgres -d fin_u_ch < backups/backup-20240108-030001.sql

# Запустить сервисы обратно
docker compose start api worker

# Проверить что всё работает
curl http://localhost/api/health
```

### 2. Откат к предыдущей версии приложения

```bash
# Вариант А: Откат через Git
cd /Users/shoxy/Projects/fin-u-ch
git log --oneline -20  # Найти нужный commit
git checkout <commit-hash>
git push origin main --force  # ⚠️ ОСТОРОЖНО! Это перезапишет main

# Вариант Б: Откат через Docker tags (РЕКОМЕНДУЕТСЯ)
# На VPS
ssh root@83.166.244.139
cd /opt/fin-u-ch

# Посмотреть теги образов
docker images | grep fin-u-ch

# Изменить IMAGE_TAG в .env
nano .env
# IMAGE_TAG=d7a6f6a  # Предыдущий commit

# Применить изменения
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate api web worker

# Проверить
curl http://83.166.244.139/api/health
```

### 3. Полное восстановление VPS с нуля

Если VPS полностью слетел:

```bash
# 1. Настроить новый VPS (см. docs/SETUP_VPS.md)
# 2. Установить Docker и Docker Compose
# 3. Клонировать проект
cd /opt
git clone https://github.com/thoxly/fin-u-ch.git
cd fin-u-ch

# 4. Создать .env файл с правильными переменными
nano .env
# (скопировать из безопасного хранилища паролей)

# 5. Восстановить backup базы данных
# (скачать последний backup из внешнего хранилища)

# 6. Запустить сервисы
docker compose -f ops/docker/docker-compose.prod.yml up -d

# 7. Восстановить данные
docker compose exec -T postgres psql -U postgres -d fin_u_ch < latest-backup.sql

# 8. Проверить работу
curl http://localhost/api/health
```

---

## 📊 Мониторинг бэкапов

### Проверка последнего бэкапа

```bash
# На VPS
ssh root@83.166.244.139
cd /opt/fin-u-ch/backups

# Показать последние бэкапы
ls -lht backup-*.sql.gz | head -5

# Проверить лог бэкапов
tail -20 backup.log

# Проверить размер последнего бэкапа
du -h $(ls -t backup-*.sql.gz | head -1)
```

### Скрипт проверки здоровья бэкапов

Файл: `/opt/fin-u-ch/scripts/check-backups.sh`

```bash
#!/bin/bash

BACKUP_DIR="/opt/fin-u-ch/backups"
MAX_AGE_HOURS=30  # Максимальный возраст последнего бэкапа

# Найти последний бэкап
LATEST_BACKUP=$(ls -t $BACKUP_DIR/backup-*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ ERROR: No backups found!"
    exit 1
fi

# Проверить возраст
AGE_SECONDS=$(( $(date +%s) - $(stat -c %Y "$LATEST_BACKUP") ))
AGE_HOURS=$(( $AGE_SECONDS / 3600 ))

if [ $AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    echo "⚠️ WARNING: Latest backup is $AGE_HOURS hours old (max: $MAX_AGE_HOURS)"
    echo "   $LATEST_BACKUP"
    exit 1
else
    SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
    echo "✅ OK: Latest backup is $AGE_HOURS hours old ($SIZE)"
    echo "   $LATEST_BACKUP"
fi
```

---

## 🔐 Безопасное хранение секретов

### Что нужно хранить в безопасном месте:

1. **GitHub Secrets**:
   - ANTHROPIC_API_KEY
   - VPS_HOST
   - VPS_USER
   - VPS_SSH_KEY
   - GHCR_TOKEN

2. **Production .env**:
   - DATABASE_URL (пароль PostgreSQL)
   - JWT_SECRET
   - REDIS_URL

3. **SSH ключи**:
   - Приватный ключ для доступа к VPS
   - GitHub deploy keys

**Рекомендуемые инструменты**:

- 1Password / Bitwarden - для паролей и секретов
- GitHub Secrets - для CI/CD
- Encrypted USB / Cloud Storage - для бэкапов ключей

---

## 📝 План действий при инциденте

### Сценарий 1: Сломали код в main

1. **Немедленно откатиться к предыдущей версии**:

   ```bash
   # На VPS, изменить IMAGE_TAG на предыдущий commit
   ssh root@83.166.244.139
   cd /opt/fin-u-ch
   # Найти предыдущий working commit: git log --oneline
   # Обновить .env: IMAGE_TAG=<previous-commit>
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate api web worker
   ```

2. **Создать hotfix ветку**:

   ```bash
   git checkout main
   git checkout -b hotfix/fix-critical-bug
   # Исправить баг
   git commit -m "fix: critical bug"
   git push origin hotfix/fix-critical-bug
   ```

3. **Быстрый review и merge**
4. **Деплой пройдёт автоматически**

### Сценарий 2: Потеряли данные в БД

1. **Немедленно остановить приложение**:

   ```bash
   ssh root@83.166.244.139
   cd /opt/fin-u-ch
   docker compose stop api worker
   ```

2. **Восстановить из последнего бэкапа** (см. выше)

3. **Проверить целостность данных**

4. **Запустить приложение**

### Сценарий 3: VPS недоступен

1. **Проверить доступность**: `ping 83.166.244.139`

2. **Связаться с хостинг провайдером**

3. **Если VPS потерян** - восстановить на новом сервере (см. выше)

---

## ✅ Еженедельный чек-лист

Каждую неделю проверять:

- [ ] Последний backup не старше 24 часов
- [ ] Размер бэкапа адекватный (не 0 байт, не слишком большой)
- [ ] CI/CD прошёл успешно на последнем деплое
- [ ] Нет critical уязвимостей в GitHub Security
- [ ] Доступен VPS и все сервисы работают
- [ ] Логи не содержат критических ошибок

---

## 📚 Дополнительные ресурсы

- [GitHub Docs - Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [PostgreSQL Backup & Restore](https://www.postgresql.org/docs/current/backup.html)
- [Docker Backup Strategies](https://docs.docker.com/storage/volumes/#back-up-restore-or-migrate-data-volumes)

---

**Последнее обновление**: 2024-01-08  
**Автор**: AI Assistant
