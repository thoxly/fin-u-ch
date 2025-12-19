# Быстрый старт: Мониторинг на Production

Краткая инструкция для запуска мониторинга на production сервере.

## 🚀 Быстрая настройка (5 минут)

### 1. Создайте Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям и сохраните токен
4. Получите Chat ID через [@userinfobot](https://t.me/userinfobot) или отправьте боту `/start` и выполните:
   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```

### 2. Настройте переменные на сервере

```bash
ssh your-user@your-server
cd /opt/fin-u-ch
nano .env
```

Добавьте:

```env
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
TELEGRAM_CHAT_ID=ваш_chat_id
GRAFANA_ADMIN_PASSWORD=ваш_безопасный_пароль
```

### 3. Запустите мониторинг сервисы

**Вариант A: Автоматически (рекомендуется)**

- При следующем деплое через GitHub Actions мониторинг сервисы запустятся автоматически

**Вариант B: Вручную**

```bash
cd /opt/fin-u-ch
docker compose -f docker-compose.prod.yml up -d \
  uptime-kuma prometheus alertmanager grafana \
  loki promtail tempo node-exporter cadvisor \
  postgres-exporter redis-exporter
```

### 4. Проверьте работу

```bash
cd /opt/fin-u-ch
./test-monitoring.sh
```

### 5. Настройте Uptime Kuma

1. Откройте `http://your-domain:3001`
2. Создайте администратора
3. Настройте Telegram уведомления:
   - Settings → Notifications → Add Notification → Telegram
   - Вставьте `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`
   - Нажмите "Test"
4. Создайте мониторы для ваших сервисов

## 📊 Доступ к сервисам

После запуска мониторинг доступен по следующим адресам:

- **Uptime Kuma**: `http://your-domain:3001`
- **Prometheus**: `http://your-domain:9090`
- **Alertmanager**: `http://your-domain:9093`
- **Grafana**: `http://your-domain:3000` (admin / ваш пароль)
- **Loki**: `http://your-domain:3100`

## ✅ Проверка

```bash
# Проверка статуса контейнеров
docker compose -f docker-compose.prod.yml ps

# Проверка логов
docker compose -f docker-compose.prod.yml logs uptime-kuma
docker compose -f docker-compose.prod.yml logs alertmanager

# Тестирование
./test-monitoring.sh
```

## 🔧 Если что-то не работает

1. **Сервисы не запускаются:**

   ```bash
   docker compose -f docker-compose.prod.yml logs <service-name>
   ```

2. **Telegram уведомления не приходят:**
   - Проверьте `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в `.env`
   - Убедитесь, что вы написали боту `/start` (для личного чата)
   - Для групп: убедитесь, что бот добавлен и является администратором

3. **Конфигурации не найдены:**
   - Убедитесь, что файлы скопированы: `ls -la /opt/fin-u-ch/monitoring/`
   - Проверьте, что docker-compose запускается из `/opt/fin-u-ch/`

## 📚 Подробная документация

- [Полный чеклист настройки](./MONITORING_SETUP_CHECKLIST.md)
- [Документация по мониторингу](./MONITORING.md)
