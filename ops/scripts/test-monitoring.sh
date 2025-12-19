#!/bin/bash
# Скрипт для тестирования системы мониторинга на production

set -e

echo "🔍 Тестирование системы мониторинга Fin-U-CH"
echo "=========================================="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для проверки статуса
check_service() {
    local service_name=$1
    local port=$2
    local url=$3
    
    echo -n "Проверка $service_name... "
    
    if curl -s -f -o /dev/null "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC} (http://localhost:$port)"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

# Функция для проверки контейнера
check_container() {
    local container_name=$1
    
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        local status=$(docker ps --filter "name=${container_name}" --format '{{.Status}}')
        echo -e "${GREEN}✅${NC} $container_name: $status"
        return 0
    else
        echo -e "${RED}❌${NC} $container_name: не запущен"
        return 1
    fi
}

# Проверка переменных окружения
echo "📋 Проверка переменных окружения..."
if [ -f .env ]; then
    source .env
    
    if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ "$TELEGRAM_BOT_TOKEN" = "" ]; then
        echo -e "${YELLOW}⚠️  TELEGRAM_BOT_TOKEN не установлен${NC}"
    else
        echo -e "${GREEN}✅${NC} TELEGRAM_BOT_TOKEN установлен"
    fi
    
    if [ -z "$TELEGRAM_CHAT_ID" ] || [ "$TELEGRAM_CHAT_ID" = "" ]; then
        echo -e "${YELLOW}⚠️  TELEGRAM_CHAT_ID не установлен${NC}"
    else
        echo -e "${GREEN}✅${NC} TELEGRAM_CHAT_ID установлен"
    fi
else
    echo -e "${RED}❌${NC} Файл .env не найден"
fi

echo ""
echo "🐳 Проверка Docker контейнеров..."
echo ""

# Проверка основных сервисов
check_container "fin-u-ch-api"
check_container "fin-u-ch-web"
check_container "fin-u-ch-worker"
check_container "fin-u-ch-nginx"

echo ""
echo "📊 Проверка сервисов мониторинга..."
echo ""

# Проверка мониторинг сервисов
check_container "fin-u-ch-uptime-kuma"
check_container "fin-u-ch-prometheus"
check_container "fin-u-ch-alertmanager"
check_container "fin-u-ch-grafana"
check_container "fin-u-ch-loki"
check_container "fin-u-ch-promtail"
check_container "fin-u-ch-tempo"
check_container "fin-u-ch-node-exporter"
check_container "fin-u-ch-cadvisor"
check_container "fin-u-ch-postgres-exporter"
check_container "fin-u-ch-redis-exporter"

echo ""
echo "🌐 Проверка доступности веб-интерфейсов..."
echo ""

# Проверка веб-интерфейсов
check_service "Uptime Kuma" "3001" "http://localhost:3001"
check_service "Prometheus" "9090" "http://localhost:9090/-/healthy"
check_service "Alertmanager" "9093" "http://localhost:9093/-/healthy"
check_service "Grafana" "3000" "http://localhost:3000/api/health"
check_service "Loki" "3100" "http://localhost:3100/ready"
check_service "Tempo" "3200" "http://localhost:3200/ready"

echo ""
echo "📁 Проверка конфигурационных файлов..."
echo ""

# Проверка конфигураций
configs=(
    "monitoring/alertmanager/alertmanager.yml"
    "monitoring/prometheus/prometheus.yml"
    "monitoring/prometheus/alerts.yml"
    "monitoring/loki/loki-config.yml"
    "monitoring/promtail/promtail-config.yml"
    "monitoring/tempo/tempo.yml"
)

for config in "${configs[@]}"; do
    if [ -f "$config" ]; then
        echo -e "${GREEN}✅${NC} $config"
    else
        echo -e "${RED}❌${NC} $config не найден"
    fi
done

echo ""
echo "🔔 Тестирование Telegram уведомлений..."
echo ""

# Проверка Alertmanager конфигурации
if docker exec fin-u-ch-alertmanager cat /etc/alertmanager/alertmanager.yml 2>/dev/null | grep -q "TELEGRAM_BOT_TOKEN"; then
    echo -e "${YELLOW}⚠️  Alertmanager: переменные не подставлены (возможно, не установлены TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID)${NC}"
else
    echo -e "${GREEN}✅${NC} Alertmanager: конфигурация выглядит правильно"
fi

echo ""
echo "📈 Проверка метрик..."
echo ""

# Проверка метрик Prometheus
if curl -s http://localhost:9090/api/v1/targets | grep -q '"health":"up"'; then
    echo -e "${GREEN}✅${NC} Prometheus: есть активные targets"
else
    echo -e "${YELLOW}⚠️  Prometheus: нет активных targets или недоступен${NC}"
fi

# Проверка метрик Node Exporter
if curl -s http://localhost:9100/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Node Exporter: метрики доступны"
else
    echo -e "${RED}❌${NC} Node Exporter: метрики недоступны"
fi

# Проверка метрик Postgres Exporter
if curl -s http://localhost:9187/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Postgres Exporter: метрики доступны"
else
    echo -e "${RED}❌${NC} Postgres Exporter: метрики недоступны"
fi

# Проверка метрик Redis Exporter
if curl -s http://localhost:9121/metrics > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Redis Exporter: метрики доступны"
else
    echo -e "${RED}❌${NC} Redis Exporter: метрики недоступны"
fi

echo ""
echo "=========================================="
echo "✅ Тестирование завершено!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Откройте Uptime Kuma: http://your-domain:3001"
echo "2. Создайте администратора при первом запуске"
echo "3. Настройте Telegram уведомления в Uptime Kuma"
echo "4. Проверьте Prometheus: http://your-domain:9090"
echo "5. Проверьте Grafana: http://your-domain:3000 (admin/admin)"
echo ""

