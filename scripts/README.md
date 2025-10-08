# 🔧 Scripts Directory

Коллекция полезных скриптов для управления проектом Fin-U-CH.

---

## 📦 Backup Scripts

### 🗄️ `backup-db.sh`

Автоматический бэкап базы данных PostgreSQL.

**Использование**:

```bash
# Запустить вручную
./scripts/backup-db.sh

# Настроить автоматический запуск (cron)
0 3 * * * /opt/fin-u-ch/scripts/backup-db.sh
```

**Что делает**:

- Создаёт дамп PostgreSQL
- Сжимает файл (gzip)
- Удаляет старые бэкапы (> 30 дней)
- Логирует результаты

**Требования**:

- Docker Compose должен быть запущен
- Контейнер PostgreSQL должен быть активен

**Расположение бэкапов**: `/opt/fin-u-ch/backups/`

---

### 🔙 `restore-db.sh`

Восстановление базы данных из бэкапа.

**Использование**:

```bash
# Восстановить из конкретного бэкапа
./scripts/restore-db.sh backups/backup-20240108-030001.sql.gz

# Восстановить из последнего бэкапа
./scripts/restore-db.sh
```

**Что делает**:

- Создаёт safety backup текущей БД
- Останавливает API и Worker
- Восстанавливает БД из указанного бэкапа
- Запускает сервисы обратно
- Проверяет health endpoint

**⚠️ ВНИМАНИЕ**: Операция перезапишет текущую базу данных!

---

### 🩺 `check-backups.sh`

Проверка здоровья системы бэкапов.

**Использование**:

```bash
./scripts/check-backups.sh
```

**Что проверяет**:

- Наличие бэкапов
- Возраст последнего бэкапа (не старше 30 часов)
- Размер бэкапов (не меньше 100KB)
- Ошибки в логах

**Exit codes**:

- `0` - Всё OK
- `1` - Обнаружены проблемы

**Можно использовать в мониторинге**:

```bash
# В cron
0 */12 * * * /opt/fin-u-ch/scripts/check-backups.sh || echo "ALERT: Backup health check failed!"
```

---

### ⚙️ `setup-backups.sh`

Автоматическая настройка системы бэкапов на VPS.

**Использование** (на VPS):

```bash
sudo ./scripts/setup-backups.sh
```

**Что делает**:

1. Создаёт директорию `/opt/fin-u-ch/backups/`
2. Устанавливает права на скрипты (`chmod +x`)
3. Настраивает cron для автоматических бэкапов
4. Запускает тестовый бэкап

**Cron задачи**:

- Бэкап БД: ежедневно в 3:00 AM
- Health check: каждые 12 часов

**Требования**:

- Запустить на VPS
- Права root или sudo

---

## 🤖 AI Review Scripts

### `ai-review/`

Директория с AI Code Review агентом для GitHub Actions.

См. [ai-review/README.md](./ai-review/README.md) для деталей.

**Основные файлы**:

- `src/index.ts` - главный скрипт
- `src/claude-reviewer.ts` - интеграция с Claude API
- `src/github-client.ts` - работа с GitHub API
- `src/context-loader.ts` - загрузка контекста проекта

---

## 📋 Быстрые команды

### На VPS

```bash
# Полная настройка бэкапов (первый раз)
sudo /opt/fin-u-ch/scripts/setup-backups.sh

# Ручной бэкап
/opt/fin-u-ch/scripts/backup-db.sh

# Проверить здоровье бэкапов
/opt/fin-u-ch/scripts/check-backups.sh

# Восстановить последний бэкап
/opt/fin-u-ch/scripts/restore-db.sh

# Посмотреть доступные бэкапы
ls -lht /opt/fin-u-ch/backups/

# Посмотреть лог бэкапов
tail -50 /opt/fin-u-ch/backups/backup.log

# Проверить cron задачи
crontab -l
```

### Локально

```bash
# AI Review работает автоматически в GitHub Actions
# Но можно запустить локально для тестирования:
cd scripts/ai-review
pnpm install
pnpm build
pnpm start
```

---

## 🛡️ Рекомендации по бэкапам

### Расписание

- **Ежедневные полные бэкапы**: 3:00 AM (низкая нагрузка)
- **Health checks**: Каждые 12 часов
- **Ручной бэкап**: Перед важными изменениями

### Retention Policy

- **Локально на VPS**: 30 дней
- **Внешнее хранилище** (рекомендуется): 90+ дней
- **Критические бэкапы**: Бессрочно

### Off-site Backup (рекомендуется настроить)

Для максимальной надёжности настройте копирование бэкапов во внешнее хранилище:

```bash
# Пример: копирование в S3
aws s3 sync /opt/fin-u-ch/backups/ s3://my-backups/fin-u-ch/ --exclude "*.log"

# Пример: копирование через rsync на другой сервер
rsync -avz /opt/fin-u-ch/backups/ user@backup-server:/backups/fin-u-ch/

# Можно добавить в cron после backup-db.sh
```

---

## 🚨 Troubleshooting

### Проблема: backup-db.sh fails

**Решение**:

1. Проверьте что PostgreSQL контейнер запущен: `docker compose ps postgres`
2. Проверьте логи: `docker compose logs postgres`
3. Проверьте права на директорию: `ls -la /opt/fin-u-ch/backups/`
4. Проверьте свободное место: `df -h`

### Проблема: restore-db.sh fails

**Решение**:

1. Проверьте что бэкап файл не повреждён: `gunzip -t backup.sql.gz`
2. Проверьте safety backup создан
3. Откатитесь к safety backup если нужно
4. Проверьте логи PostgreSQL

### Проблема: Cron задачи не запускаются

**Решение**:

1. Проверьте cron сервис: `sudo systemctl status cron`
2. Проверьте задачи установлены: `crontab -l`
3. Проверьте права на скрипты: `ls -l /opt/fin-u-ch/scripts/`
4. Проверьте cron логи: `grep CRON /var/log/syslog`

---

## 📚 Дополнительная документация

- [Backup Strategy](../docs/BACKUP_STRATEGY.md) - Полная стратегия бэкапов и восстановления
- [CI/CD Pipeline](../docs/CI_CD.md) - CI/CD процесс
- [Dev Guide](../docs/DEV_GUIDE.md) - Руководство для разработчиков

---

**Последнее обновление**: 2024-01-08
