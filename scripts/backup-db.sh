#!/bin/bash
set -e

# ========================================
# Скрипт автоматического бэкапа БД
# ========================================
# Использование:
#   ./scripts/backup-db.sh
#
# Для автоматизации добавить в crontab на VPS:
#   0 3 * * * /opt/fin-u-ch/scripts/backup-db.sh
# ========================================

# Конфигурация
BACKUP_DIR="/opt/fin-u-ch/backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup-${DATE}.sql"
LOG_FILE="${BACKUP_DIR}/backup.log"
COMPOSE_FILE="/opt/fin-u-ch/docker-compose.prod.yml"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a $LOG_FILE
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

# Создать директорию если не существует
mkdir -p $BACKUP_DIR

log "=========================================="
log "Starting database backup process"
log "=========================================="

# Проверить что Docker Compose работает
if ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not installed or not accessible"
    exit 1
fi

# Проверить что контейнер PostgreSQL запущен
cd /opt/fin-u-ch
if ! docker compose -f $COMPOSE_FILE ps postgres | grep -q "Up"; then
    log_error "PostgreSQL container is not running"
    exit 1
fi

# Создать бэкап
log "Creating backup: $BACKUP_FILE"
if docker compose -f $COMPOSE_FILE exec -T postgres pg_dump -U postgres fin_u_ch > $BACKUP_FILE; then
    # Проверить что файл создан и не пустой
    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_success "Backup created successfully: $BACKUP_FILE ($SIZE)"
        
        # Сжать бэкап для экономии места
        log "Compressing backup..."
        gzip $BACKUP_FILE
        
        if [ -f "${BACKUP_FILE}.gz" ]; then
            COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
            log_success "Backup compressed: ${BACKUP_FILE}.gz ($COMPRESSED_SIZE)"
        else
            log_error "Failed to compress backup"
            exit 1
        fi
    else
        log_error "Backup file is empty or was not created"
        exit 1
    fi
else
    log_error "Failed to create backup"
    exit 1
fi

# Удалить старые бэкапы (старше RETENTION_DAYS дней)
log "Cleaning old backups (older than $RETENTION_DAYS days)..."
DELETED_COUNT=$(find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ $DELETED_COUNT -gt 0 ]; then
    log_success "Deleted $DELETED_COUNT old backup(s)"
else
    log "No old backups to delete"
fi

# Показать статистику
TOTAL_BACKUPS=$(ls -1 $BACKUP_DIR/backup-*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
log "=========================================="
log "Backup process completed successfully"
log "Total backups: $TOTAL_BACKUPS"
log "Total size: $TOTAL_SIZE"
log "=========================================="

exit 0

