#!/bin/bash

# ==============================================
# Development Environment Setup Script
# ==============================================
# Настройка локальной среды разработки с демо-пользователем

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

# Функции для вывода
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }

cd "$PROJECT_ROOT"

info "Setting up development environment..."

# 1. Проверяем .env файл
if [ ! -f ".env" ]; then
    warning ".env file not found, creating from template..."
    cp env.example .env
    success ".env file created"
else
    info ".env file already exists"
fi

# 2. Запускаем Docker контейнеры
info "Starting Docker containers..."
cd ops/docker
docker-compose up -d
cd "$PROJECT_ROOT"

# Ждем пока база данных запустится
info "Waiting for database to be ready..."
sleep 5

# 3. Запускаем миграции
info "Running database migrations..."
pnpm --filter api prisma migrate deploy

# 4. Создаем демо-пользователя
info "Creating demo user for E2E tests..."
pnpm --filter api tsx scripts/setup-demo-user.ts

success "Development environment setup completed!"
echo ""
info "Demo user credentials:"
echo "  Email: demo@example.com"
echo "  Password: demo123"
echo ""
info "You can now start the applications:"
echo "  cd apps/api && pnpm dev"
echo "  cd apps/web && pnpm dev"
echo ""
info "E2E tests will work with these credentials!"
