#!/bin/bash
# Скрипт для безопасного применения индексов с CONCURRENTLY
# Используется для разрешения deadlock при применении миграции 20260121170622_add_indexes
#
# Использование:
#   ./apply-indexes-concurrently.sh
#   или через Docker:
#   docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d fin_u_ch -f /path/to/script.sql

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для логирования
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Проверка, запущен ли скрипт в Docker контейнере
if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
    DB_HOST="localhost"
    DB_USER="${POSTGRES_USER:-postgres}"
    DB_NAME="${POSTGRES_DB:-fin_u_ch}"
    PSQL_CMD="psql -U $DB_USER -d $DB_NAME"
else
    # Проверка наличия docker-compose
    if [ -f "docker-compose.prod.yml" ]; then
        PSQL_CMD="docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d fin_u_ch"
    else
        log_error "Не удалось определить способ подключения к БД"
        log_info "Запустите скрипт из директории проекта или внутри Docker контейнера"
        exit 1
    fi
fi

log_info "Начинаем применение индексов с CONCURRENTLY..."
log_info "Это безопасный метод, который не блокирует таблицы"

# Функция для проверки существования индекса
index_exists() {
    local index_name=$1
    $PSQL_CMD -t -c "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '$index_name');" | grep -q t
}

# Функция для создания индекса с CONCURRENTLY
create_index_concurrently() {
    local index_name=$1
    local table_name=$2
    local columns=$3
    
    if index_exists "$index_name"; then
        log_warning "Индекс $index_name уже существует, пропускаем"
        return 0
    fi
    
    log_info "Создаем индекс: $index_name на таблице $table_name"
    
    # CREATE INDEX CONCURRENTLY не может быть в транзакции
    if $PSQL_CMD -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS \"$index_name\" ON \"$table_name\"($columns);" 2>&1; then
        log_success "Индекс $index_name создан успешно"
        return 0
    else
        log_error "Ошибка при создании индекса $index_name"
        return 1
    fi
}

# Функция для добавления колонок, если они не существуют
add_columns_if_needed() {
    log_info "Проверяем наличие необходимых колонок в imported_operations..."
    
    $PSQL_CMD << 'EOF'
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imported_operations' AND column_name = 'isDuplicate') THEN
    ALTER TABLE "imported_operations" ADD COLUMN "isDuplicate" BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE 'Column isDuplicate added';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imported_operations' AND column_name = 'duplicateOfId') THEN
    ALTER TABLE "imported_operations" ADD COLUMN "duplicateOfId" TEXT;
    RAISE NOTICE 'Column duplicateOfId added';
  END IF;
END $$;
EOF
    
    log_success "Колонки проверены/добавлены"
}

# Список индексов для создания
declare -a indexes=(
    "accounts|accounts_companyId_isActive_idx|companyId, isActive"
    "articles|articles_companyId_type_idx|companyId, type"
    "articles|articles_companyId_isActive_idx|companyId, isActive"
    "articles|articles_counterpartyId_idx|counterpartyId"
    "budgets|budgets_companyId_startDate_endDate_idx|companyId, startDate, endDate"
    "counterparties|counterparties_companyId_category_idx|companyId, category"
    "deals|deals_counterpartyId_idx|counterpartyId"
    "deals|deals_departmentId_idx|departmentId"
    "imported_operations|imported_operations_companyId_date_idx|companyId, date"
    "imported_operations|imported_operations_companyId_draft_idx|companyId, draft"
    "imported_operations|imported_operations_companyId_isDuplicate_idx|companyId, isDuplicate"
    "imported_operations|imported_operations_matchedAccountId_idx|matchedAccountId"
    "imported_operations|imported_operations_matchedArticleId_idx|matchedArticleId"
    "imported_operations|imported_operations_matchedCounterpartyId_idx|matchedCounterpartyId"
    "imported_operations|imported_operations_matchedDealId_idx|matchedDealId"
    "imported_operations|imported_operations_matchedDepartmentId_idx|matchedDepartmentId"
    "operations|operations_companyId_type_idx|companyId, type"
    "operations|operations_companyId_isConfirmed_idx|companyId, isConfirmed"
    "operations|operations_companyId_type_isConfirmed_idx|companyId, type, isConfirmed"
    "operations|operations_sourceAccountId_idx|sourceAccountId"
    "operations|operations_targetAccountId_idx|targetAccountId"
    "operations|operations_counterpartyId_idx|counterpartyId"
    "operations|operations_dealId_idx|dealId"
    "operations|operations_departmentId_idx|departmentId"
    "plan_items|plan_items_companyId_status_idx|companyId, status"
    "plan_items|plan_items_companyId_type_idx|companyId, type"
    "plan_items|plan_items_companyId_type_status_idx|companyId, type, status"
    "plan_items|plan_items_articleId_idx|articleId"
    "plan_items|plan_items_accountId_idx|accountId"
    "plan_items|plan_items_dealId_idx|dealId"
    "users|users_companyId_isActive_idx|companyId, isActive"
)

# Специальная обработка для integrations (таблица может не существовать)
create_integration_indexes() {
    log_info "Проверяем наличие таблицы integrations..."
    
    if $PSQL_CMD -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations');" | grep -q t; then
        log_info "Таблица integrations существует, создаем индексы..."
        create_index_concurrently "integrations_accountId_idx" "integrations" "accountId"
        create_index_concurrently "integrations_articleId_idx" "integrations" "articleId"
        create_index_concurrently "integrations_companyId_idx" "integrations" "companyId"
    else
        log_warning "Таблица integrations не существует, пропускаем индексы"
    fi
}

# Основной процесс
main() {
    log_info "=== Начало применения индексов ==="
    
    # Добавляем колонки, если нужно
    add_columns_if_needed
    
    # Создаем индексы по одному
    local total=${#indexes[@]}
    local current=0
    local failed=0
    
    for index_def in "${indexes[@]}"; do
        IFS='|' read -r table_name index_name columns <<< "$index_def"
        current=$((current + 1))
        
        log_info "[$current/$total] Обработка индекса: $index_name"
        
        if create_index_concurrently "$index_name" "$table_name" "$columns"; then
            log_success "Индекс $index_name обработан"
        else
            log_error "Не удалось создать индекс $index_name"
            failed=$((failed + 1))
        fi
        
        # Небольшая пауза между индексами для снижения нагрузки
        sleep 1
    done
    
    # Создаем индексы для integrations
    create_integration_indexes
    
    log_info "=== Завершение применения индексов ==="
    log_info "Всего обработано: $total"
    log_info "Успешно: $((total - failed))"
    if [ $failed -gt 0 ]; then
        log_warning "Ошибок: $failed"
        exit 1
    else
        log_success "Все индексы применены успешно!"
    fi
}

# Запуск
main
