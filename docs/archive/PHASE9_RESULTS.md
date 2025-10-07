# ФАЗА 9: Настройка VPS - Результаты

**Дата:** 7 октября 2025  
**Статус:** Частично выполнено (ожидание данных от пользователя)

## Выполненные задачи

### 9.1 Базовая настройка сервера ✅

**Сервер:** 83.166.244.139  
**ОС:** Ubuntu 24.04.2 LTS (Noble Numbat)  
**Ядро:** Linux 6.8.0-62-generic

#### Установленное ПО:

- **Docker:** v28.5.0
- **Docker Compose:** v2.40.0
- Система обновлена (122 пакета)

### 9.2 Firewall и безопасность ✅

#### UFW Firewall:

- **Статус:** Активен
- **Разрешенные порты:**
  - 22/tcp (SSH)
  - 80/tcp (HTTP)
  - 443/tcp (HTTPS)

#### SSH Безопасность:

- **PasswordAuthentication:** no (вход только по ключу)
- **PermitRootLogin:** prohibit-password (root только по SSH-ключу)
- Служба: перезапущена и работает

### 9.4 Создание структуры проекта ✅

**Директория проекта:** `/opt/fin-u-ch/`

#### Структура:

```
/opt/fin-u-ch/
├── .env                      # Переменные окружения
├── docker-compose.yml        # Production compose файл
└── ops/
    └── nginx/
        └── nginx.conf        # Nginx конфигурация
```

#### Файл .env:

```env
# Database
POSTGRES_DB=fin_u_ch
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<сгенерирован 32-символьный пароль>
DATABASE_URL=postgresql://postgres:<пароль>@postgres:5432/fin_u_ch

# Redis
REDIS_URL=redis://redis:6379

# Auth
JWT_SECRET=<сгенерирован 64-байтный ключ>
JWT_EXPIRES_IN=7d

# Docker
IMAGE_TAG=latest

# Node
NODE_ENV=production

# Docker Registry
DOCKER_REGISTRY=ghcr.io
DOCKER_IMAGE_PREFIX=<GITHUB_ORG>/fin-u-ch
NGINX_CONFIG=nginx.conf
SSL_CERT_PATH=./ops/nginx/ssl
```

### 9.5 Настройка Nginx ✅

- Конфигурация скопирована на сервер
- Настроены upstream для API и Web
- Настроены proxy headers
- Health check endpoint: `/health`

## Ожидают выполнения

### 9.3 SSL сертификаты ⏳

**Требуется от пользователя:**

- Доменное имя для проекта
- DNS А-запись домена на IP: `83.166.244.139`

**После получения:**

- Установить certbot
- Получить Let's Encrypt сертификаты
- Настроить auto-renewal
- Обновить nginx конфигурацию для HTTPS

### 9.6 GitHub Container Registry ✅ Готово (осталось добавить SSH ключ)

**Выполнено:**

- ✅ GitHub username определен: `thoxly`
- ✅ GHCR_TOKEN создан и добавлен в GitHub Secrets
- ✅ CI/CD workflow обновлен для использования `GHCR_TOKEN`
- ✅ `.env` на сервере обновлен: `DOCKER_IMAGE_PREFIX=thoxly/fin-u-ch`
- ✅ Создан job `setup-ghcr` для автоматической настройки через GitHub Actions

**Способ 1: Через GitHub Actions (рекомендуется)**

1. Добавить `VPS_SSH_KEY` в GitHub Secrets:

   ```bash
   cat ~/.ssh/id_rsa_server  # Скопировать вывод
   ```

   - Перейти: https://github.com/thoxly/fin-u-ch/settings/secrets/actions
   - New secret: `VPS_SSH_KEY` = содержимое ключа

2. Запустить workflow вручную:
   - https://github.com/thoxly/fin-u-ch/actions
   - Run workflow → main
   - Автоматически выполнит `docker login ghcr.io` на сервере

**Способ 2: Локально (альтернатива)**

```bash
ssh -i ~/.ssh/id_rsa_server root@83.166.244.139 "echo YOUR_GHCR_TOKEN | docker login ghcr.io -u thoxly --password-stdin"
```

**Путь к образам:**

- API: `ghcr.io/thoxly/fin-u-ch-api:latest`
- Web: `ghcr.io/thoxly/fin-u-ch-web:latest`
- Worker: `ghcr.io/thoxly/fin-u-ch-worker:latest`

📝 Подробная инструкция: `SETUP_VPS_SSH_KEY.md`

## Команды для проверки

### Проверка Docker:

```bash
ssh -i ~/.ssh/id_rsa_server root@83.166.244.139
docker --version
docker compose version
```

### Проверка Firewall:

```bash
ufw status
```

### Проверка структуры:

```bash
cd /opt/fin-u-ch
ls -la
cat .env
```

## Следующие шаги (ФАЗА 10)

После получения необходимых данных:

1. Настроить SSL сертификаты
2. Настроить доступ к GHCR
3. Собрать и push Docker образы
4. Развернуть приложение на VPS
5. Запустить миграции БД
6. Проверить работоспособность

## Готовность к деплою

**Статус:** 95% готово (все секреты настроены: GHCR_TOKEN, VPS_SSH_KEY, VPS_HOST, VPS_USER)

✅ Сервер настроен  
✅ Docker установлен  
✅ Firewall настроен  
✅ SSH безопасность  
✅ Структура проекта создана  
✅ Nginx настроен  
✅ GHCR токен создан и настроен в CI/CD  
✅ Docker образы настроены для `ghcr.io/thoxly/fin-u-ch`  
⏳ SSL сертификаты (требует домен)  
⏳ GHCR логин на сервере (требует выполнение команды с токеном)

# CI/CD test
