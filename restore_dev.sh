#!/bin/bash

# Скрипт для безопасного восстановления dev ветки с PR #148
# Автор: Auto-generated restore script
# Дата: $(date)

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверка что мы в правильной директории
if [ ! -d ".git" ]; then
    error "Не находимся в git репозитории!"
    exit 1
fi

# Проверка что мы в dev ветке
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "dev" ]; then
    error "Текущая ветка: $CURRENT_BRANCH. Нужна ветка 'dev'"
    exit 1
fi

# Создание резервной копии
TIMESTAMP=$(date +'%Y%m%d-%H%M%S')
BACKUP_BRANCH="backup-dev-$TIMESTAMP"
BACKUP_TAG="backup-dev-before-restore-$TIMESTAMP"

log "Создание резервной копии..."
git stash push -m "backup-before-restore-$TIMESTAMP" || true
git branch "$BACKUP_BRANCH"
git tag "$BACKUP_TAG"
log "Резервная копия создана: ветка $BACKUP_BRANCH, тег $BACKUP_TAG"

# Сохранение текущего коммита
CURRENT_COMMIT=$(git rev-parse HEAD)
log "Текущий коммит: $CURRENT_COMMIT"

# Коммит PR #148
PR148_COMMIT="3daeef2"
log "Коммит PR #148: $PR148_COMMIT"

# Проверка что коммит существует
if ! git cat-file -e "$PR148_COMMIT" 2>/dev/null; then
    error "Коммит $PR148_COMMIT не найден!"
    exit 1
fi

log "План восстановления готов. Для продолжения выполните команды вручную:"
echo ""
echo "1. Откат до PR #148:"
echo "   git reset --hard $PR148_COMMIT"
echo ""
echo "2. Проверка файлов PR #148:"
echo "   ls -la apps/web/src/pages/company/TariffPage.tsx"
echo ""
echo "3. Применение коммитов (см. RESTORE_PLAN.md)"
echo ""
echo "Для отката используйте:"
echo "   git checkout $BACKUP_BRANCH"
echo "   или"
echo "   git checkout $BACKUP_TAG"

