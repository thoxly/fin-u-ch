# Задание: Настройка мониторинга с Prometheus и Grafana

## 📋 Цель

Настроить сбор метрик через `express-prom-bundle`, развернуть Prometheus и Grafana в Docker Compose, и обеспечить автоматический деплой через CI/CD.

## 🎯 Требования

1. **Интеграция express-prom-bundle** в Express приложение
2. **Развертывание Prometheus** для сбора метрик
3. **Развертывание Grafana** для визуализации
4. **Автоматический деплой** через CI/CD
5. **Минимальные встроенные метрики** express-prom-bundle на старте проекта

## 📦 Текущее состояние

- ✅ `express-prom-bundle@8.0.0` уже установлен в `apps/api/package.json`
- ✅ Express приложение инициализируется в `apps/api/src/app.ts`
- ✅ Docker Compose конфигурация: `ops/docker/docker-compose.prod.yml`
- ✅ CI/CD настроен: `.github/workflows/ci-cd.yml`

## 🔧 Задачи

### 1. Интеграция express-prom-bundle в Express приложение

**Файл**: `apps/api/src/app.ts`

**Требования**:

- Подключить `express-prom-bundle` как middleware **до** всех роутов
- Использовать минимальную конфигурацию с встроенными метриками:
  - HTTP request duration (histogram)
  - HTTP request count (counter)
  - HTTP request size (histogram)
  - HTTP response size (histogram)
- Экспортировать метрики на эндпоинте `/api/metrics` (стандартный формат Prometheus)
- Метрики должны быть доступны **только** для внутреннего использования (не через Nginx)

**Пример конфигурации**:

```typescript
import promBundle from 'express-prom-bundle';

const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project: 'fin-u-ch' },
  promClient: {
    collectDefaultMetrics: {
      timeout: 10000,
    },
  },
});

app.use(metricsMiddleware);
```

### 2. Добавление Prometheus в Docker Compose

**Файл**: `ops/docker/docker-compose.prod.yml`

**Требования**:

- Добавить сервис `prometheus` на основе образа `prom/prometheus:latest`
- Настроить volume для конфигурации Prometheus
- Настроить volume для хранения данных (persistent storage)
- Prometheus должен скрапить метрики с API сервиса по адресу `http://api:4000/api/metrics`
- Порт Prometheus: `9090` (только внутренний, не пробрасывать наружу)
- Добавить healthcheck для Prometheus
- Добавить зависимость от сервиса `api`

**Конфигурация Prometheus** (`prometheus.yml`):

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'fin-u-ch-api'
    static_configs:
      - targets: ['api:4000']
    metrics_path: '/api/metrics'
```

### 3. Добавление Grafana в Docker Compose

**Файл**: `ops/docker/docker-compose.prod.yml`

**Требования**:

- Добавить сервис `grafana` на основе образа `grafana/grafana:latest`
- Настроить volume для данных Grafana (persistent storage)
- Настроить volume для provisioning (datasources, dashboards)
- Порт Grafana: `3000` (только внутренний, не пробрасывать наружу)
- Настроить переменные окружения:
  - `GF_SECURITY_ADMIN_USER` (из env)
  - `GF_SECURITY_ADMIN_PASSWORD` (из env)
  - `GF_SERVER_ROOT_URL` (опционально)
- Автоматически подключить Prometheus как datasource через provisioning
- Добавить healthcheck для Grafana
- Добавить зависимость от сервиса `prometheus`

**Provisioning datasource** (`grafana/provisioning/datasources/prometheus.yml`):

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

### 4. Обновление переменных окружения

**Файл**: `env.example`

**Требования**:

- Раскомментировать и обновить секцию мониторинга:

```env
# Prometheus / Grafana
METRICS_ENABLED=true
METRICS_PORT=9090
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password-change-me
```

### 5. Настройка Nginx для доступа к Grafana (опционально)

**Файл**: `ops/nginx/nginx.conf` или `ops/nginx/nginx-ssl.conf`

**Требования**:

- Добавить location для доступа к Grafana через `/grafana` (reverse proxy)
- Настроить аутентификацию (basic auth или через API)
- Метрики Prometheus (`/api/metrics`) должны быть доступны только внутри сети Docker

**Пример конфигурации**:

```nginx
location /grafana/ {
    proxy_pass http://grafana:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 6. Обновление CI/CD для автоматического деплоя

**Файл**: `.github/workflows/ci-cd.yml`

**Требования**:

- Убедиться, что при деплое копируются файлы конфигурации Prometheus и Grafana
- В шаге "Copy docker-compose and scripts to VPS" добавить копирование:
  - `ops/docker/prometheus.yml` → `/opt/fin-u-ch/prometheus/prometheus.yml`
  - `ops/docker/grafana/provisioning/` → `/opt/fin-u-ch/grafana/provisioning/`
- При деплое должны создаваться необходимые директории для volumes

**Обновление шага деплоя**:

```yaml
- name: Copy monitoring configs to VPS
  run: |
    ssh -i ~/.ssh/deploy_key ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} 'mkdir -p /opt/fin-u-ch/prometheus /opt/fin-u-ch/grafana/provisioning/datasources'
    scp -i ~/.ssh/deploy_key ops/docker/prometheus.yml ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}:/opt/fin-u-ch/prometheus/prometheus.yml
    scp -i ~/.ssh/deploy_key ops/docker/grafana/provisioning/datasources/prometheus.yml ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}:/opt/fin-u-ch/grafana/provisioning/datasources/prometheus.yml
```

### 7. Создание структуры файлов

**Структура директорий**:

```
ops/docker/
├── docker-compose.prod.yml (обновить)
├── prometheus.yml (создать)
└── grafana/
    └── provisioning/
        └── datasources/
            └── prometheus.yml (создать)
```

## ✅ Критерии приемки

1. ✅ Метрики доступны на `/api/metrics` в формате Prometheus
2. ✅ Prometheus успешно скрапит метрики с API сервиса
3. ✅ Grafana запускается и подключается к Prometheus автоматически
4. ✅ Данные Prometheus и Grafana сохраняются в volumes (persistent storage)
5. ✅ Все сервисы имеют healthchecks
6. ✅ При деплое через CI/CD все конфигурации копируются на сервер
7. ✅ После деплоя мониторинг работает автоматически
8. ✅ Встроенные метрики express-prom-bundle собираются с момента старта API

## 📊 Минимальные метрики express-prom-bundle

После интеграции будут доступны следующие метрики:

- `http_request_duration_seconds` - длительность HTTP запросов (histogram)
- `http_request_size_bytes` - размер HTTP запросов (histogram)
- `http_response_size_bytes` - размер HTTP ответов (histogram)
- `http_requests_total` - общее количество HTTP запросов (counter)
- `process_cpu_user_seconds_total` - CPU время пользователя (gauge)
- `process_cpu_system_seconds_total` - CPU время системы (gauge)
- `process_resident_memory_bytes` - использование памяти (gauge)
- `nodejs_heap_size_total_bytes` - общий размер heap (gauge)
- `nodejs_heap_size_used_bytes` - использованный размер heap (gauge)

## 🔍 Тестирование

1. **Локально**:

   ```bash
   cd ops/docker
   docker compose -f docker-compose.prod.yml up -d prometheus grafana
   # Проверить метрики: curl http://localhost:4000/api/metrics
   # Проверить Prometheus: http://localhost:9090
   # Проверить Grafana: http://localhost:3000
   ```

2. **На production**:
   - После деплоя проверить доступность метрик
   - Проверить работу Prometheus и Grafana
   - Убедиться, что данные сохраняются после перезапуска

## 📝 Примечания

- Метрики `/api/metrics` должны быть доступны только внутри Docker сети (не через Nginx)
- Grafana можно выставить наружу через Nginx с аутентификацией
- Prometheus не должен быть доступен извне (только через Grafana)
- Использовать persistent volumes для данных Prometheus и Grafana
- Настроить retention policy в Prometheus (например, 30 дней)

## 🔗 Полезные ссылки

- [express-prom-bundle документация](https://github.com/jochen-schweizer/express-prom-bundle)
- [Prometheus документация](https://prometheus.io/docs/)
- [Grafana документация](https://grafana.com/docs/)
