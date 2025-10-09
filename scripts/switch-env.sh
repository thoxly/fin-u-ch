#!/bin/bash

# ==============================================
# ENV Switcher Script
# ==============================================
# Переключение между разными окружениями
# Использование: ./scripts/switch-env.sh [environment]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Определяем корень проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Функция для вывода с цветом
info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
}

warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Показать помощь
show_help() {
  echo "ENV Switcher - переключение между окружениями"
  echo ""
  echo "Использование:"
  echo "  ./scripts/switch-env.sh [environment]"
  echo ""
  echo "Доступные окружения:"
  echo "  development  - Локальная разработка (по умолчанию)"
  echo "  production   - Продакшен окружение"
  echo ""
  echo "Примеры:"
  echo "  ./scripts/switch-env.sh development"
  echo "  ./scripts/switch-env.sh production"
  echo ""
  echo "Опции:"
  echo "  -h, --help   Показать эту справку"
  echo "  -l, --list   Показать доступные .env файлы"
  echo "  -c, --current Показать текущее окружение"
}

# Показать список доступных .env файлов
list_env_files() {
  info "Доступные .env файлы:"
  echo ""
  
  cd "$PROJECT_ROOT"
  
  if [ -f ".env" ]; then
    echo -e "  ${GREEN}✓${NC} .env (текущий)"
  else
    echo -e "  ${RED}✗${NC} .env (не найден)"
  fi
  
  for env in development production; do
    if [ -f ".env.$env" ]; then
      echo -e "  ${GREEN}✓${NC} .env.$env"
    else
      echo -e "  ${YELLOW}⚠${NC} .env.$env (не найден)"
    fi
  done
  
  echo ""
}

# Показать текущее окружение
show_current() {
  cd "$PROJECT_ROOT"
  
  if [ ! -f ".env" ]; then
    error ".env файл не найден"
    exit 1
  fi
  
  NODE_ENV=$(grep "^NODE_ENV=" .env | cut -d '=' -f2 || echo "unknown")
  
  info "Текущее окружение: ${GREEN}${NODE_ENV}${NC}"
  echo ""
  
  info "Основные переменные:"
  echo "  NODE_ENV: $(grep "^NODE_ENV=" .env | cut -d '=' -f2 || echo 'не установлено')"
  echo "  PORT: $(grep "^PORT=" .env | cut -d '=' -f2 || echo 'не установлено')"
  echo "  DATABASE_URL: $(grep "^DATABASE_URL=" .env | cut -d '=' -f2 | sed 's/:.*@/:***@/' || echo 'не установлено')"
  echo ""
}

# Основная логика
main() {
  # Обработка аргументов
  case "${1:-}" in
    -h|--help)
      show_help
      exit 0
      ;;
    -l|--list)
      list_env_files
      exit 0
      ;;
    -c|--current)
      show_current
      exit 0
      ;;
  esac
  
  # Определяем окружение
  ENV="${1:-development}"
  
  # Валидация окружения
  case "$ENV" in
    development|production)
      ;;
    *)
      error "Неизвестное окружение: $ENV"
      echo ""
      show_help
      exit 1
      ;;
  esac
  
  cd "$PROJECT_ROOT"
  
  ENV_FILE=".env.$ENV"
  
  # Проверяем существование файла окружения
  if [ ! -f "$ENV_FILE" ]; then
    error "Файл $ENV_FILE не найден"
    echo ""
    warning "Создайте файл на основе примера:"
    echo "  cp env.example $ENV_FILE"
    echo "  nano $ENV_FILE"
    exit 1
  fi
  
  # Делаем backup текущего .env (если есть)
  if [ -f ".env" ]; then
    BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
    cp .env "$BACKUP_FILE"
    info "Создан backup: $BACKUP_FILE"
  fi
  
  # Копируем новый .env
  cp "$ENV_FILE" .env
  
  success "Переключено на окружение: ${GREEN}${ENV}${NC}"
  echo ""
  
  # Показываем основные переменные
  info "Основные переменные:"
  echo "  NODE_ENV: $(grep "^NODE_ENV=" .env | cut -d '=' -f2)"
  echo "  PORT: $(grep "^PORT=" .env | cut -d '=' -f2)"
  DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2)
  # Скрываем пароль в DATABASE_URL
  SAFE_DB_URL=$(echo "$DATABASE_URL" | sed 's/:.*@/:***@/')
  echo "  DATABASE_URL: $SAFE_DB_URL"
  echo ""
  
  # Предупреждение для продакшена
  if [ "$ENV" = "production" ]; then
    warning "Вы переключились на PRODUCTION окружение!"
    warning "Убедитесь что используете правильные credentials!"
    echo ""
  fi
  
  success "Готово! Перезапустите приложение для применения изменений:"
  echo "  pnpm dev  # для разработки"
  echo "  docker-compose restart  # для Docker"
}

# Запуск
main "$@"

