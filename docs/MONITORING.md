# Мониторинг и Observability

Документация по настройке и использованию системы мониторинга для Fin-U-CH.

## Uptime Kuma

Uptime Kuma - это open-source система мониторинга uptime с веб-интерфейсом.

### Доступ

После запуска docker-compose, Uptime Kuma доступен по адресу:

- `http://your-domain:3001` или `http://localhost:3001` (если порт проброшен)

### Первоначальная настройка

1. При первом запуске создайте администратора:
   - Откройте веб-интерфейс Uptime Kuma
   - Введите username и password для администратора

2. Настройте Telegram уведомления в Uptime Kuma:
   - Перейдите в **Settings** → **Notifications**
   - Нажмите **"Add Notification"**
   - Выберите **"Telegram"**
   - Заполните поля:
     - **Bot Token**: Вставьте `TELEGRAM_BOT_TOKEN` из `.env`
     - **Chat ID**: Вставьте `TELEGRAM_CHAT_ID` из `.env`
   - Нажмите **"Test"** для проверки (бот должен отправить тестовое сообщение)
   - Сохраните настройки

3. Настройте Telegram уведомления в Alertmanager:
   - Alertmanager уже настроен через `ops/monitoring/alertmanager/alertmanager.yml`
   - Убедитесь, что переменные `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` установлены в `.env`
   - При запуске docker-compose переменные будут подставлены через `envsubst`

### Создание Telegram бота

**Важно:** Для Uptime Kuma и Alertmanager не требуется отдельный сервис бота - они используют Telegram Bot API напрямую. Вам нужно только создать бота через @BotFather и получить токен.

#### Шаг 1: Создание бота через @BotFather

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям:
   - Введите имя бота (например: "Fin-U-CH Monitoring Bot")
   - Введите username бота (должен заканчиваться на `bot`, например: "fin_u_ch_monitoring_bot")
4. @BotFather вернет токен вида: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
5. **Сохраните токен** - он понадобится для настройки

#### Шаг 2: Получение Chat ID

Chat ID нужен для отправки уведомлений в конкретный чат/канал.

**Вариант A: Личный чат с ботом**

1. Найдите вашего бота в Telegram (по username)
2. Начните диалог с ботом (отправьте любое сообщение, например `/start`)
3. Выполните запрос для получения chat_id:
   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
4. В ответе найдите `"chat":{"id":123456789}` - это ваш chat_id

**Вариант B: Групповой чат/канал**

1. Добавьте бота в группу или канал
2. Сделайте бота администратором (для каналов)
3. Для группы: отправьте любое сообщение в группу
4. Для канала: используйте формат `@channel_username` или получите ID через:
   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
5. Chat ID для группы будет отрицательным числом (например: `-1001234567890`)

**Вариант C: Использование @userinfobot**

1. Напишите [@userinfobot](https://t.me/userinfobot) - он покажет ваш личный ID
2. Этот ID можно использовать для личных уведомлений

#### Шаг 3: Настройка переменных окружения

Добавьте в ваш `.env` файл:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

**Важно:**

- Токен должен быть секретным - не коммитьте его в Git
- Chat ID может быть положительным (личный чат) или отрицательным (группа/канал)

### Настройка мониторинга

#### 1. Frontend (Web)

- **Тип**: HTTP(s)
- **URL**: `https://your-domain/` или `http://your-domain/` (в зависимости от SSL)
- **Интервал**: 60 секунд
- **Timeout**: 10 секунд
- **Уведомления**: Включить для down/up событий

#### 2. API Health Check

- **Тип**: HTTP(s)
- **URL**: `https://your-domain/api/health` или `http://your-domain/api/health`
- **Интервал**: 60 секунд
- **Timeout**: 10 секунд
- **Ожидаемый статус**: 200
- **Уведомления**: Включить для down/up событий

#### 3. Nginx Health Check

- **Тип**: HTTP(s)
- **URL**: `https://your-domain/health` или `http://your-domain/health`
- **Интервал**: 60 секунд
- **Timeout**: 10 секунд
- **Ожидаемый статус**: 200
- **Уведомления**: Включить для down/up событий

### Рекомендации

- Настройте разные каналы уведомлений для критичных и некритичных сервисов
- Используйте группировку мониторов по категориям (Frontend, Backend, Infrastructure)
- Настройте maintenance windows для плановых работ
- Регулярно проверяйте статус мониторов в веб-интерфейсе

### Troubleshooting

**Проблема**: Uptime Kuma не запускается

- Проверьте, что порт 3001 не занят другим приложением
- Проверьте логи: `docker logs fin-u-ch-uptime-kuma`
- Убедитесь, что volume `uptime_kuma_data` создан

**Проблема**: Telegram уведомления не приходят

- Проверьте правильность `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в `.env`
- Убедитесь, что вы написали боту хотя бы одно сообщение (для личного чата)
- Для групп/каналов: убедитесь, что бот добавлен и является администратором
- Проверьте настройки уведомлений в Uptime Kuma (используйте кнопку "Test")
- Для Alertmanager: проверьте логи контейнера `fin-u-ch-alertmanager`
- Проверьте, что переменные окружения правильно подставлены в `alertmanager.yml`:
  ```bash
  docker exec fin-u-ch-alertmanager cat /etc/alertmanager/alertmanager.yml
  ```

**Проблема**: Мониторы показывают false positives

- Увеличьте timeout до 15-20 секунд
- Проверьте доступность endpoints вручную
- Убедитесь, что интервал проверки не слишком частый
