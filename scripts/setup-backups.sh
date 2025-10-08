#!/bin/bash

# ========================================
# Скрипт настройки автоматических бэкапов
# ========================================
# Использование (на VPS):
#   sudo ./scripts/setup-backups.sh
#
# Что делает:
#   1. Создаёт директорию для бэкапов
#   2. Устанавливает права на скрипты
#   3. Настраивает cron для автоматических бэкапов
#   4. Запускает тестовый бэкап
# ========================================

set -e

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
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Проверить что скрипт запущен на VPS в правильной директории
if [ ! -f "/opt/fin-u-ch/docker-compose.prod.yml" ]; then
    log_error "This script should be run on VPS in /opt/fin-u-ch directory"
    log_info "Current directory: $(pwd)"
    exit 1
fi

echo "=========================================="
echo "Setting up automated backups"
echo "=========================================="

# 1. Создать директорию для бэкапов
BACKUP_DIR="/opt/fin-u-ch/backups"
log_info "Creating backup directory: $BACKUP_DIR"
mkdir -p $BACKUP_DIR
log_success "Backup directory created"

# 2. Установить права на скрипты
log_info "Setting permissions on backup scripts..."
chmod +x /opt/fin-u-ch/scripts/backup-db.sh
chmod +x /opt/fin-u-ch/scripts/restore-db.sh
chmod +x /opt/fin-u-ch/scripts/check-backups.sh
log_success "Permissions set"

# 3. Проверить существующие cron задачи
log_info "Checking existing cron jobs..."
EXISTING_CRON=$(crontab -l 2>/dev/null | grep -c "backup-db.sh" || echo "0")

if [ "$EXISTING_CRON" -gt 0 ]; then
    log_warning "Backup cron job already exists"
    read -p "Do you want to reinstall it? (yes/no): " REINSTALL
    
    if [ "$REINSTALL" != "yes" ]; then
        log_info "Keeping existing cron job"
    else
        # Удалить существующую задачу
        crontab -l 2>/dev/null | grep -v "backup-db.sh" | crontab - || true
        EXISTING_CRON=0
    fi
fi

# 4. Установить cron задачу
if [ "$EXISTING_CRON" -eq 0 ]; then
    log_info "Installing cron job for automated backups..."
    
    # Создать временный файл с новой задачей
    TEMP_CRON=$(mktemp)
    crontab -l 2>/dev/null > $TEMP_CRON || true
    
    # Добавить задачу (каждый день в 3:00 AM)
    echo "# Fin-U-CH Database Backup (daily at 3:00 AM)" >> $TEMP_CRON
    echo "0 3 * * * /opt/fin-u-ch/scripts/backup-db.sh" >> $TEMP_CRON
    
    # Опционально: проверка бэкапов каждые 12 часов
    echo "# Fin-U-CH Backup Health Check (every 12 hours)" >> $TEMP_CRON
    echo "0 */12 * * * /opt/fin-u-ch/scripts/check-backups.sh || echo 'Backup health check failed!'" >> $TEMP_CRON
    
    # Установить новый crontab
    crontab $TEMP_CRON
    rm $TEMP_CRON
    
    log_success "Cron job installed"
    log_info "Backup schedule: Daily at 3:00 AM"
    log_info "Health check: Every 12 hours"
fi

# 5. Запустить тестовый бэкап
echo ""
log_info "Running test backup..."
if /opt/fin-u-ch/scripts/backup-db.sh; then
    log_success "Test backup completed successfully"
else
    log_error "Test backup failed"
    log_info "Check the logs and fix any issues before relying on automated backups"
    exit 1
fi

# 6. Показать установленные задачи
echo ""
log_info "Installed cron jobs:"
crontab -l | grep -A1 "Fin-U-CH" | sed 's/^/  /'

# 7. Финальные инструкции
echo ""
echo "=========================================="
log_success "Backup setup completed!"
echo "=========================================="
echo ""
log_info "What's configured:"
echo "  • Daily backups at 3:00 AM"
echo "  • Health checks every 12 hours"
echo "  • Retention: 30 days"
echo "  • Location: $BACKUP_DIR"
echo ""
log_info "Useful commands:"
echo "  • Manual backup:    /opt/fin-u-ch/scripts/backup-db.sh"
echo "  • Check backups:    /opt/fin-u-ch/scripts/check-backups.sh"
echo "  • Restore backup:   /opt/fin-u-ch/scripts/restore-db.sh"
echo "  • View cron jobs:   crontab -l"
echo "  • View cron logs:   grep CRON /var/log/syslog"
echo ""
log_warning "IMPORTANT:"
echo "  • Test restore procedure at least once"
echo "  • Set up off-site backup storage (S3, Backblaze, etc.)"
echo "  • Monitor backup health regularly"
echo ""

exit 0

