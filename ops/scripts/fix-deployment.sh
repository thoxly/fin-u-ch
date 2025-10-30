#!/bin/bash
# Скрипт для исправления проблем с деплоем

set -e

echo "======================================"
echo "Fin-U-CH Deployment Fix Script"
echo "======================================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd /opt/fin-u-ch || exit 1

echo -e "${BLUE}Шаг 1: Проверка текущего состояния${NC}"
docker ps --filter name=fin-u-ch --format "table {{.Names}}\t{{.Status}}"
echo ""

echo -e "${BLUE}Шаг 2: Остановка всех контейнеров${NC}"
docker compose -f docker-compose.prod.yml down || echo "Контейнеры уже остановлены"
echo ""

echo -e "${BLUE}Шаг 3: Проверка переменных окружения${NC}"
# Убедимся, что используется правильная NGINX конфигурация (без SSL для начала)
if grep -q "NGINX_CONFIG" .env 2>/dev/null; then
    echo "NGINX_CONFIG уже установлен"
else
    echo "NGINX_CONFIG=nginx.conf" >> .env
    echo -e "${GREEN}Добавлен NGINX_CONFIG=nginx.conf${NC}"
fi

# Проверим остальные переменные
echo "Текущие переменные:"
grep -E "^(DOCKER_IMAGE_PREFIX|DOCKER_REGISTRY|IMAGE_TAG|NGINX_CONFIG)" .env || echo "Некоторые переменные отсутствуют"
echo ""

echo -e "${BLUE}Шаг 4: Очистка старых контейнеров и образов${NC}"
docker container prune -f
echo ""

echo -e "${BLUE}Шаг 5: Загрузка свежих образов${NC}"
docker compose -f docker-compose.prod.yml pull api web worker nginx
echo ""

echo -e "${BLUE}Шаг 6: Проверка загруженных образов${NC}"
docker images | grep fin-u-ch | head -5
echo ""

echo -e "${BLUE}Шаг 7: Запуск контейнеров${NC}"
docker compose -f docker-compose.prod.yml up -d
echo ""

echo -e "${BLUE}Шаг 8: Ожидание запуска служб (30 секунд)${NC}"
sleep 30
echo ""

echo -e "${BLUE}Шаг 9: Проверка состояния контейнеров${NC}"
docker ps --filter name=fin-u-ch --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo -e "${BLUE}Шаг 10: Проверка логов API (последние 20 строк)${NC}"
docker logs --tail 20 fin-u-ch-api
echo ""

echo -e "${BLUE}Шаг 11: Health check tests${NC}"

# Тест 1: Прямой доступ к API контейнеру
echo -e "${YELLOW}Тест 1: Прямой доступ к API (внутри контейнера)${NC}"
if docker exec fin-u-ch-api wget -qO- http://localhost:4000/api/health 2>/dev/null; then
    echo -e "${GREEN}✅ API отвечает напрямую${NC}"
else
    echo -e "${RED}❌ API не отвечает напрямую${NC}"
    echo "Логи API:"
    docker logs --tail 50 fin-u-ch-api
fi
echo ""

# Тест 2: Доступ через NGINX
echo -e "${YELLOW}Тест 2: Доступ через NGINX${NC}"
if curl -f http://localhost/api/health 2>/dev/null; then
    echo -e "${GREEN}✅ API доступен через NGINX${NC}"
else
    echo -e "${RED}❌ API недоступен через NGINX${NC}"
    echo "Логи NGINX:"
    docker logs --tail 30 fin-u-ch-nginx
fi
echo ""

# Тест 3: Простой health check NGINX
echo -e "${YELLOW}Тест 3: Простой health check NGINX (/health)${NC}"
if curl -f http://localhost/health 2>/dev/null; then
    echo -e "${GREEN}✅ NGINX отвечает на /health${NC}"
else
    echo -e "${RED}❌ NGINX не отвечает на /health${NC}"
fi
echo ""

echo "======================================"
echo -e "${GREEN}Исправление завершено!${NC}"
echo "======================================"
echo ""
echo "Если проблемы сохраняются, выполните диагностику:"
echo "  bash /opt/fin-u-ch/diagnose-deploy.sh"
echo ""

