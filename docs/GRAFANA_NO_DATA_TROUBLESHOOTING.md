# Решение проблемы "No data" в Grafana

## Быстрая диагностика

### 1. Проверка Prometheus

1. Откройте Prometheus UI: `http://vect-a.ru:9090`
2. Перейдите в **Status** → **Targets**
3. Проверьте, что все targets в статусе **UP** (зеленые):
   - `prometheus` (localhost:9090)
   - `node-exporter` (node-exporter:9100)
   - `cadvisor` (cadvisor:8080)
   - `worker` (worker:4001)
   - `postgres` (postgres-exporter:9187)
   - `redis` (redis-exporter:9121)

4. Если какой-то target **DOWN** (красный):
   - Проверьте логи: `docker logs fin-u-ch-prometheus`
   - Проверьте, что сервис запущен: `docker ps | grep <service-name>`

### 2. Проверка Loki

1. Проверьте метки (labels) в Loki:

   ```bash
   curl http://vect-a.ru:3100/loki/api/v1/label
   ```

   Должны вернуться метки: `container_name`, `level`, `log_stream`, `service`, и т.д.

2. Проверьте наличие логов:
   - В Grafana: **Explore** → выберите datasource **Loki**
   - Запрос: `{service="api"}` или `{service="worker"}`
   - Выберите временной диапазон: **Last 15 minutes**

### 3. Проверка Tempo

1. Проверьте доступность Tempo:

   ```bash
   curl http://vect-a.ru:3200/ready
   ```

   Должен вернуться: `ready`

2. В Grafana: **Explore** → выберите datasource **Tempo**
   - Если нет traces, это нормально - traces появляются только когда приложение отправляет их

## Частые причины "No data"

### 1. Неправильный временной диапазон

**Проблема**: Выбран слишком короткий или старый временной диапазон

**Решение**:

- В правом верхнем углу Grafana выберите временной диапазон
- Рекомендуется: **Last 15 minutes** или **Last 1 hour**
- Убедитесь, что выбрано правильное время (не будущее)

### 2. Неправильный запрос Prometheus

**Проблема**: Запрос не соответствует реальным метрикам

**Решение**:

1. Проверьте доступные метрики в Prometheus UI:
   - Откройте `http://vect-a.ru:9090`
   - Перейдите в **Graph**
   - Введите простой запрос: `up`
   - Должны появиться результаты

2. Популярные запросы для тестирования:

   ```promql
   # Проверка доступности всех targets
   up

   # CPU использование (node-exporter)
   rate(node_cpu_seconds_total[5m])

   # Использование памяти (node-exporter)
   node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes

   # Использование CPU контейнеров (cadvisor)
   rate(container_cpu_usage_seconds_total[5m])

   # Использование памяти контейнеров (cadvisor)
   container_memory_usage_bytes

   # Метрики Worker
   process_cpu_user_seconds_total
   ```

### 3. Неправильный запрос Loki

**Проблема**: Запрос не соответствует реальным логам

**Решение**:

1. Простые запросы для тестирования:

   ```
   # Все логи API
   {service="api"}

   # Все логи Worker
   {service="worker"}

   # Логи по уровню
   {level="error"}

   # Логи конкретного контейнера
   {container_name="fin-u-ch-api"}
   ```

2. Проверьте метки:
   - В Grafana Explore с Loki
   - Нажмите на поле запроса
   - Должны появиться доступные метки

### 4. Datasource не подключен правильно

**Проблема**: Datasource настроен неправильно

**Решение**:

1. Перейдите в **Configuration** → **Data Sources**
2. Проверьте каждый datasource:
   - **Prometheus**: URL должен быть `http://prometheus:9090`
   - **Loki**: URL должен быть `http://loki:3100`
   - **Tempo**: URL должен быть `http://tempo:3200`
3. Нажмите **Save & Test** для каждого datasource
4. Должно появиться сообщение "Data source is working"

### 5. Панель использует неправильный datasource

**Проблема**: Панель в дашборде использует другой datasource

**Решение**:

1. Откройте панель в режиме редактирования
2. Проверьте выбранный datasource в выпадающем списке
3. Убедитесь, что выбран правильный datasource (Prometheus, Loki или Tempo)

## Пошаговая проверка

### Шаг 1: Проверка Prometheus

1. Откройте Prometheus: `http://vect-a.ru:9090`
2. Введите запрос: `up`
3. Нажмите **Execute**
4. Должны появиться результаты с метриками

Если нет результатов:

```bash
# Проверьте статус Prometheus
docker ps | grep prometheus

# Проверьте логи
docker logs fin-u-ch-prometheus --tail=50
```

### Шаг 2: Проверка Loki

1. В Grafana: **Explore** → выберите **Loki**
2. Введите запрос: `{service="api"}`
3. Выберите временной диапазон: **Last 15 minutes**
4. Нажмите **Run query**

Если нет результатов:

```bash
# Проверьте статус Promtail
docker ps | grep promtail

# Проверьте логи Promtail
docker logs fin-u-ch-promtail --tail=50

# Проверьте статус Loki
docker ps | grep loki
```

### Шаг 3: Проверка дашборда

1. Откройте ваш дашборд
2. Для каждой панели:
   - Нажмите на заголовок панели → **Edit**
   - Проверьте запрос
   - Проверьте выбранный datasource
   - Проверьте временной диапазон (в правом верхнем углу)

## Тестовые запросы

### Prometheus

```promql
# Все доступные targets
up

# CPU использование хоста
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Использование памяти хоста
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Использование CPU контейнеров
rate(container_cpu_usage_seconds_total[5m]) * 100

# Использование памяти контейнеров
container_memory_usage_bytes / container_spec_memory_limit_bytes * 100
```

### Loki

```
# Все логи
{}

# Логи API
{service="api"}

# Ошибки
{level="error"}

# Логи за последний час с фильтром
{service="api"} |= "error"
```

## Если ничего не помогает

1. **Перезапустите все сервисы мониторинга**:

   ```bash
   docker compose -f docker-compose.prod.yml restart prometheus loki promtail grafana
   ```

2. **Проверьте сеть Docker**:

   ```bash
   docker network inspect fin-u-ch_fin-u-ch-network | grep -A 5 "Containers"
   ```

   Все сервисы должны быть в одной сети

3. **Проверьте логи всех сервисов**:

   ```bash
   docker compose -f docker-compose.prod.yml logs prometheus --tail=20
   docker compose -f docker-compose.prod.yml logs loki --tail=20
   docker compose -f docker-compose.prod.yml logs promtail --tail=20
   ```

4. **Проверьте конфигурации**:
   - `/opt/fin-u-ch/monitoring/prometheus/prometheus.yml`
   - `/opt/fin-u-ch/monitoring/loki/loki-config.yml`
   - `/opt/fin-u-ch/monitoring/promtail/promtail-config.yml`

## Полезные ссылки

- [Prometheus Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [Loki Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
