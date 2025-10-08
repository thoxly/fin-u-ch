#!/bin/bash

# ========================================
# Скрипт проверки здоровья бэкапов
# ========================================
# Использование:
#   ./scripts/check-backups.sh
#
# Проверяет:
#   - Наличие бэкапов
#   - Возраст последнего бэкапа
#   - Размер бэкапов
# ========================================

BACKUP_DIR="/opt/fin-u-ch/backups"
MAX_AGE_HOURS=30  # Максимальный возраст последнего бэкапа
MIN_SIZE_KB=100   # Минимальный размер бэкапа (в KB)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ OK: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

echo "=========================================="
echo "Backup Health Check"
echo "=========================================="

# Проверка 1: Существует ли директория
if [ ! -d "$BACKUP_DIR" ]; then
    log_error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Проверка 2: Есть ли бэкапы
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/backup-*.sql.gz 2>/dev/null | wc -l)
if [ $BACKUP_COUNT -eq 0 ]; then
    log_error "No backup files found in $BACKUP_DIR"
    exit 1
fi

log_info "Found $BACKUP_COUNT backup file(s)"

# Проверка 3: Найти последний бэкап
LATEST_BACKUP=$(ls -t $BACKUP_DIR/backup-*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    log_error "Could not determine latest backup"
    exit 1
fi

log_info "Latest backup: $(basename $LATEST_BACKUP)"

# Проверка 4: Возраст последнего бэкапа
AGE_SECONDS=$(( $(date +%s) - $(stat -c %Y "$LATEST_BACKUP" 2>/dev/null || stat -f %m "$LATEST_BACKUP") ))
AGE_HOURS=$(( $AGE_SECONDS / 3600 ))
AGE_MINUTES=$(( ($AGE_SECONDS % 3600) / 60 ))

if [ $AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    log_error "Latest backup is too old: ${AGE_HOURS}h ${AGE_MINUTES}m (max: ${MAX_AGE_HOURS}h)"
    exit 1
else
    log_success "Latest backup age: ${AGE_HOURS}h ${AGE_MINUTES}m (max: ${MAX_AGE_HOURS}h)"
fi

# Проверка 5: Размер последнего бэкапа
SIZE_BYTES=$(stat -c %s "$LATEST_BACKUP" 2>/dev/null || stat -f %z "$LATEST_BACKUP")
SIZE_KB=$(( $SIZE_BYTES / 1024 ))
SIZE_HUMAN=$(du -h "$LATEST_BACKUP" | cut -f1)

if [ $SIZE_KB -lt $MIN_SIZE_KB ]; then
    log_error "Latest backup is too small: ${SIZE_HUMAN} (min: ${MIN_SIZE_KB}KB)"
    exit 1
else
    log_success "Latest backup size: ${SIZE_HUMAN}"
fi

# Проверка 6: Статистика всех бэкапов
TOTAL_SIZE=$(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)
OLDEST_BACKUP=$(ls -tr $BACKUP_DIR/backup-*.sql.gz 2>/dev/null | head -1)

if [ -n "$OLDEST_BACKUP" ]; then
    OLDEST_DATE=$(stat -c %y "$OLDEST_BACKUP" 2>/dev/null | cut -d' ' -f1 || stat -f %Sm -t %Y-%m-%d "$OLDEST_BACKUP")
    log_info "Oldest backup: $(basename $OLDEST_BACKUP) (from $OLDEST_DATE)"
fi

log_info "Total backup size: $TOTAL_SIZE"

# Проверка 7: Проверить лог бэкапов
LOG_FILE="${BACKUP_DIR}/backup.log"
if [ -f "$LOG_FILE" ]; then
    # Проверить последние ошибки в логе
    ERROR_COUNT=$(grep -c "ERROR" "$LOG_FILE" 2>/dev/null || echo "0")
    
    if [ $ERROR_COUNT -gt 0 ]; then
        log_warning "Found $ERROR_COUNT error(s) in backup log"
        log_info "Check log: $LOG_FILE"
    else
        log_success "No errors in backup log"
    fi
    
    # Показать последние 5 записей лога
    echo ""
    log_info "Last 5 log entries:"
    tail -5 "$LOG_FILE" | sed 's/^/  /'
fi

echo "=========================================="
log_success "All backup health checks passed"
echo "=========================================="

exit 0

