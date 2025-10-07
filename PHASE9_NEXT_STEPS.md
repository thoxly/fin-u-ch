# ФАЗА 9: Следующие шаги

## ✅ Что уже сделано

1. **Сервер настроен:**
   - Ubuntu 24.04.2 LTS обновлен
   - Docker v28.5.0 и Docker Compose v2.40.0 установлены
   - UFW firewall активен (порты 22, 80, 443)
   - SSH безопасность (только ключи)

2. **Проект настроен:**
   - Структура `/opt/fin-u-ch/` создана
   - `.env` с безопасными паролями
   - `docker-compose.yml` и `nginx.conf` загружены
   - GitHub username: `thoxly`
   - Docker образы: `ghcr.io/thoxly/fin-u-ch-*`

3. **CI/CD обновлен:**
   - Workflow использует `GHCR_TOKEN`
   - Образы будут публиковаться в `ghcr.io/thoxly/fin-u-ch-*`

## 📋 ЧТО НУЖНО СДЕЛАТЬ

### 1. Настроить доступ к GHCR на сервере

**Способ 1: Через GitHub Actions (РЕКОМЕНДУЕТСЯ) 🚀**

1. Добавить SSH ключ в GitHub Secrets:

   ```bash
   cat ~/.ssh/id_rsa_server
   # Скопировать весь вывод
   ```

2. Добавить секрет:
   - Открыть: https://github.com/thoxly/fin-u-ch/settings/secrets/actions
   - New repository secret
   - Name: `VPS_SSH_KEY`
   - Value: вставить скопированный ключ
   - Add secret

3. Запустить workflow:
   - Открыть: https://github.com/thoxly/fin-u-ch/actions
   - Выбрать "CI/CD with AI Review"
   - Run workflow → main
   - ✅ GitHub Actions автоматически настроит GHCR на сервере!

**Способ 2: Локально (альтернатива)**

```bash
ssh -i ~/.ssh/id_rsa_server root@83.166.244.139 "echo YOUR_GHCR_TOKEN | docker login ghcr.io -u thoxly --password-stdin"
```

**Ожидаемый результат:**

```
Login Succeeded
```

📝 Подробная инструкция: `SETUP_VPS_SSH_KEY.md`

### 2. Настроить DNS для домена (когда будет готов)

После получения доменного имени:

1. Создайте А-запись:

   ```
   Тип: A
   Имя: @ (или поддомен)
   Значение: 83.166.244.139
   TTL: 300
   ```

2. Установите SSL сертификаты:

   ```bash
   ssh -i ~/.ssh/id_rsa_server root@83.166.244.139

   # Установить certbot
   apt install certbot

   # Получить сертификат (замените yourdomain.com)
   certbot certonly --standalone -d yourdomain.com

   # Скопировать сертификаты
   mkdir -p /opt/fin-u-ch/ops/nginx/ssl
   cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/fin-u-ch/ops/nginx/ssl/
   cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/fin-u-ch/ops/nginx/ssl/
   ```

3. Создайте HTTPS конфигурацию nginx (будет предоставлена после домена)

### 3. Проверка готовности

После выполнения шага 1, проверьте:

```bash
ssh -i ~/.ssh/id_rsa_server root@83.166.244.139
cd /opt/fin-u-ch

# Проверка логина к GHCR
docker pull ghcr.io/thoxly/fin-u-ch-api:latest || echo "Образы еще не опубликованы (нормально, если не было деплоя)"

# Проверка конфигурации
cat .env | grep DOCKER_IMAGE_PREFIX
# Должно быть: DOCKER_IMAGE_PREFIX=thoxly/fin-u-ch
```

## 🚀 Готовность к ФАЗЕ 10 (Первый деплой)

После выполнения шагов выше:

**Готовность: 85% → 95%**

Останется только:

1. Собрать Docker образы локально
2. Push образов в GHCR
3. Pull и запуск на сервере
4. Миграции БД
5. Health checks

## ❓ Вопросы

Если что-то непонятно или нужна помощь:

1. Проверьте `/opt/fin-u-ch/.env` - все пароли и секреты там
2. Логи Docker: `docker compose logs -f`
3. Статус сервисов: `docker compose ps`

## 📝 Следующий этап

После завершения настройки GHCR доступа, можно будет:

1. Коммитить изменения в main
2. CI/CD автоматически соберет образы
3. Автоматический деплой на VPS (если настроен)
4. Или ручной деплой через ФАЗУ 10
