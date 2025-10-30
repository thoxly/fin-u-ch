#!/bin/bash
# Диагностический скрипт для проверки состояния деплоя

set -e

echo "======================================"
echo "Fin-U-CH Deployment Diagnostics"
echo "======================================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка Docker контейнеров
echo -e "${YELLOW}1. Проверка запущенных контейнеров:${NC}"
docker ps --filter name=fin-u-ch --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "Ошибка получения списка контейнеров"
echo ""

# Проверка всех контейнеров (включая остановленные)
echo -e "${YELLOW}2. Все контейнеры (включая остановленные):${NC}"
docker ps -a --filter name=fin-u-ch --format "table {{.Names}}\t{{.Status}}" || echo "Ошибка получения списка контейнеров"
echo ""

# Проверка логов API
echo -e "${YELLOW}3. Последние 50 строк логов API:${NC}"
docker logs --tail 50 fin-u-ch-api 2>&1 || echo "API контейнер не найден или не запущен"
echo ""

# Проверка логов NGINX
echo -e "${YELLOW}4. Последние 30 строк логов NGINX:${NC}"
docker logs --tail 30 fin-u-ch-nginx 2>&1 || echo "NGINX контейнер не найден или не запущен"
echo ""

# Проверка портов
echo -e "${YELLOW}5. Проверка прослушиваемых портов:${NC}"
ss -tulpn | grep -E ":(80|443|4000|5432|6379)" || echo "Порты не прослушиваются"
echo ""

# Проверка health check внутри контейнера API
echo -e "${YELLOW}6. Health check внутри API контейнера:${NC}"
docker exec fin-u-ch-api wget -qO- http://localhost:4000/api/health 2>&1 || echo "Не удалось выполнить health check внутри контейнера"
echo ""

# Проверка health check через NGINX
echo -e "${YELLOW}7. Health check через NGINX:${NC}"
curl -v http://localhost/api/health 2>&1 || echo "Не удалось выполнить health check через NGINX"
echo ""

# Проверка простого health check NGINX
echo -e "${YELLOW}8. Простой health check NGINX (/health):${NC}"
curl -v http://localhost/health 2>&1 || echo "Не удалось выполнить простой health check NGINX"
echo ""

# Проверка Docker образов
echo -e "${YELLOW}9. Список Docker образов fin-u-ch:${NC}"
docker images | grep fin-u-ch || echo "Образы fin-u-ch не найдены"
echo ""

# Проверка сети Docker
echo -e "${YELLOW}10. Проверка Docker сети:${NC}"
docker network inspect fin-u-ch-network 2>&1 | grep -A 5 "Containers" || echo "Сеть не найдена"
echo ""

# Проверка переменных окружения в .env
echo -e "${YELLOW}11. Переменные окружения в .env:${NC}"
if [ -f "/opt/fin-u-ch/.env" ]; then
    grep -E "^(DOCKER_IMAGE_PREFIX|DOCKER_REGISTRY|IMAGE_TAG|NGINX_CONFIG|DATABASE_URL|POSTGRES_)" /opt/fin-u-ch/.env | sed 's/PASSWORD=.*/PASSWORD=***/' || echo "Не удалось прочитать .env"
else
    echo -e "${RED}.env файл не найден!${NC}"
fi
echo ""

# Проверка конфигурации NGINX
echo -e "${YELLOW}12. Используемая конфигурация NGINX:${NC}"
docker exec fin-u-ch-nginx cat /etc/nginx/conf.d/default.conf 2>&1 | head -30 || echo "Не удалось прочитать конфигурацию NGINX"
echo ""

# Проверка состояния баз данных
echo -e "${YELLOW}13. Проверка подключения к PostgreSQL:${NC}"
docker exec fin-u-ch-postgres pg_isready -U postgres 2>&1 || echo "PostgreSQL не отвечает"
echo ""

echo -e "${YELLOW}14. Проверка подключения к Redis:${NC}"
docker exec fin-u-ch-redis redis-cli ping 2>&1 || echo "Redis не отвечает"
echo ""

# Итоговая оценка
echo "======================================"
echo -e "${GREEN}Диагностика завершена!${NC}"
echo "======================================"
echo ""
echo "Рекомендации по устранению проблем:"
echo "1. Если API контейнер не запущен - проверьте логи: docker logs fin-u-ch-api"
echo "2. Если NGINX не может подключиться к API - проверьте сеть: docker network inspect fin-u-ch-network"
echo "3. Если база данных не доступна - проверьте DATABASE_URL в .env"
echo "4. Если образы не загружены - выполните: docker compose -f docker-compose.prod.yml pull"
echo ""

