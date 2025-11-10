#!/bin/bash
set -e

# ========================================
# Скрипт очистки всех данных из БД
# ========================================
# Использование:
#   ./scripts/cleanup-test-data.sh [--dry-run] [--skip-backup]
#
# ВНИМАНИЕ: Удаляет ВСЕ компании и ВСЕХ пользователей!
#
# Опции:
#   --dry-run      - только показать что будет удалено, не удалять
#   --skip-backup  - пропустить создание бэкапа
# ========================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Параметры
DRY_RUN=false
SKIP_BACKUP=false

# Парсинг аргументов
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    *)
      echo -e "${RED}Неизвестный параметр: $1${NC}"
      echo "Использование: $0 [--dry-run] [--skip-backup]"
      exit 1
      ;;
  esac
done

# Определяем путь к проекту
if [ -f "/opt/fin-u-ch/package.json" ]; then
  # Production путь
  PROJECT_DIR="/opt/fin-u-ch"
  COMPOSE_FILE="/opt/fin-u-ch/docker-compose.prod.yml"
else
  # Локальный путь
  PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  COMPOSE_FILE="${PROJECT_DIR}/ops/docker/docker-compose.prod.yml"
fi

cd "$PROJECT_DIR"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Очистка всех данных из базы${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo -e "${RED}⚠️  ВНИМАНИЕ: Будет удалено ВСЕ компании и ВСЕ пользователи!${NC}"
echo ""

# Проверка окружения
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🔍 Режим проверки (dry-run) - данные не будут удалены${NC}"
  echo ""
fi

# Создание бэкапа (если не пропущен)
if [ "$SKIP_BACKUP" = false ] && [ "$DRY_RUN" = false ]; then
  echo -e "${YELLOW}📦 Создание бэкапа базы данных...${NC}"
  
  if [ -f "${PROJECT_DIR}/scripts/backup-db.sh" ]; then
    if bash "${PROJECT_DIR}/scripts/backup-db.sh"; then
      echo -e "${GREEN}✅ Бэкап создан успешно${NC}"
    else
      echo -e "${RED}❌ Ошибка при создании бэкапа${NC}"
      echo -e "${YELLOW}Продолжить без бэкапа? (yes/no)${NC}"
      read -r answer
      if [ "$answer" != "yes" ] && [ "$answer" != "y" ]; then
        echo "Операция отменена"
        exit 1
      fi
    fi
  else
    echo -e "${YELLOW}⚠️  Скрипт бэкапа не найден. Продолжить без бэкапа? (yes/no)${NC}"
    read -r answer
    if [ "$answer" != "yes" ] && [ "$answer" != "y" ]; then
      echo "Операция отменена"
      exit 1
    fi
  fi
  echo ""
fi

# Проверка подключения к базе
echo -e "${BLUE}🔍 Проверка подключения к базе данных...${NC}"

# Определяем как запускать скрипт
if docker compose -f "$COMPOSE_FILE" ps postgres 2>/dev/null | grep -q "Up"; then
  # База в Docker
  echo -e "${GREEN}✅ База данных в Docker найдена${NC}"
  echo ""
  
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}Показываю что будет удалено (dry-run)...${NC}"
    echo ""
    docker compose -f "$COMPOSE_FILE" exec -T api pnpm tsx scripts/cleanup-test-data.ts || {
      echo -e "${RED}❌ Ошибка при выполнении скрипта${NC}"
      exit 1
    }
  else
    echo -e "${YELLOW}⚠️  ВНИМАНИЕ: Это удалит ВСЕ данные из базы!${NC}"
    echo ""
    docker compose -f "$COMPOSE_FILE" exec -T api pnpm tsx scripts/cleanup-test-data.ts || {
      echo -e "${RED}❌ Ошибка при выполнении скрипта${NC}"
      exit 1
    }
  fi
else
  # База не в Docker или локально
  echo -e "${YELLOW}⚠️  База данных не в Docker, запускаю скрипт напрямую...${NC}"
  echo ""
  
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}Показываю что будет удалено (dry-run)...${NC}"
    echo ""
    pnpm --filter api tsx scripts/cleanup-test-data.ts || {
      echo -e "${RED}❌ Ошибка при выполнении скрипта${NC}"
      exit 1
    }
  else
    echo -e "${YELLOW}⚠️  ВНИМАНИЕ: Это удалит ВСЕ данные из базы!${NC}"
    echo ""
    pnpm --filter api tsx scripts/cleanup-test-data.ts || {
      echo -e "${RED}❌ Ошибка при выполнении скрипта${NC}"
      exit 1
    }
  fi
fi

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}Очистка завершена${NC}"
echo -e "${GREEN}==========================================${NC}"

