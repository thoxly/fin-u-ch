#!/bin/bash
set -e

# ========================================
# Скрипт восстановления БД из бэкапа
# ========================================
# Использование:
#   ./scripts/restore-db.sh [backup-file.sql.gz]
#
# Примеры:
#   ./scripts/restore-db.sh backups/backup-20240108-030001.sql.gz
#   ./scripts/restore-db.sh  # Выберет последний бэкап
# ========================================

# Конфигурация
BACKUP_DIR="/opt/fin-u-ch/backups"
COMPOSE_FILE="/opt/fin-u-ch/docker-compose.prod.yml"
TEMP_DIR="/tmp/fin-u-ch-restore"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

log_success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

log_info() {
    echo -e "${BLUE}INFO: $1${NC}"
}

# Проверить аргументы
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    # Найти последний бэкап
    BACKUP_FILE=$(ls -t $BACKUP_DIR/backup-*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$BACKUP_FILE" ]; then
        log_error "No backup files found in $BACKUP_DIR"
        echo "Usage: $0 [backup-file.sql.gz]"
        exit 1
    fi
    
    log_warning "No backup file specified, using latest: $BACKUP_FILE"
fi

# Проверить что файл существует
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Показать информацию о бэкапе
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_DATE=$(stat -c %y "$BACKUP_FILE" | cut -d' ' -f1,2 | cut -d'.' -f1)

echo "=========================================="
log_info "Database Restore"
echo "=========================================="
echo "Backup file: $BACKUP_FILE"
echo "Size: $BACKUP_SIZE"
echo "Created: $BACKUP_DATE"
echo "=========================================="

# Подтверждение
log_warning "This will OVERWRITE the current database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Restore cancelled by user"
    exit 0
fi

# Создать временную директорию
mkdir -p $TEMP_DIR

# Распаковать бэкап если сжат
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log_info "Decompressing backup..."
    DECOMPRESSED_FILE="$TEMP_DIR/$(basename ${BACKUP_FILE%.gz})"
    gunzip -c "$BACKUP_FILE" > "$DECOMPRESSED_FILE"
    RESTORE_FILE="$DECOMPRESSED_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Проверить что Docker Compose работает
if ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not installed or not accessible"
    exit 1
fi

# Остановить API и Worker
log_info "Stopping API and Worker services..."
cd /opt/fin-u-ch
docker compose -f $COMPOSE_FILE stop api worker

# Создать backup текущей БД на случай проблем
log_info "Creating safety backup of current database..."
SAFETY_BACKUP="$BACKUP_DIR/safety-backup-$(date +%Y%m%d-%H%M%S).sql"
docker compose -f $COMPOSE_FILE exec -T postgres pg_dump -U postgres fin_u_ch > $SAFETY_BACKUP
gzip $SAFETY_BACKUP
log_success "Safety backup created: ${SAFETY_BACKUP}.gz"

# Восстановить базу данных
log_info "Restoring database from backup..."
if docker compose -f $COMPOSE_FILE exec -T postgres psql -U postgres -d fin_u_ch < $RESTORE_FILE; then
    log_success "Database restored successfully"
else
    log_error "Failed to restore database"
    log_warning "You can restore from safety backup: ${SAFETY_BACKUP}.gz"
    exit 1
fi

# Запустить сервисы обратно
log_info "Starting API and Worker services..."
docker compose -f $COMPOSE_FILE start api worker

# Подождать немного
sleep 5

# Проверить health endpoint
log_info "Checking API health..."
if curl -f http://localhost/api/health &> /dev/null; then
    log_success "API is healthy"
else
    log_warning "API health check failed. Check logs: docker compose logs api"
fi

# Очистить временные файлы
rm -rf $TEMP_DIR

echo "=========================================="
log_success "Restore process completed"
echo "=========================================="
echo ""
log_info "Safety backup saved at: ${SAFETY_BACKUP}.gz"
log_info "You can delete it after verification"

exit 0

