# Настройка внешних сервисов для CI/CD

Инструкции по настройке GitHub Secrets, Branch Protection и получению API ключей.

## 1. Anthropic API Key (для AI Code Review)

### Получение API ключа

1. Зайдите на https://console.anthropic.com/
2. Создайте аккаунт или войдите
3. Перейдите в Settings → API Keys
4. Создайте новый API key
5. Скопируйте ключ (он больше не будет показан)

**Формат ключа**: `sk-ant-api03-...`

### Стоимость

- Claude Sonnet 4: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- Средний PR review: ~50K tokens = ~$0.15-0.50
- Рекомендуемый месячный бюджет: $20-50

### Лимиты

- Rate limit: 50 requests/minute
- Token limit: 200K tokens/minute
- Достаточно для ~10-20 PR reviews в минуту

---

## 2. GitHub Secrets

### Добавление секретов

1. Откройте репозиторий на GitHub
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **New repository secret**
4. Добавьте следующие секреты:

### Обязательные секреты

| Имя секрета         | Описание                      | Пример значения                  |
| ------------------- | ----------------------------- | -------------------------------- |
| `ANTHROPIC_API_KEY` | API ключ Claude для AI review | `sk-ant-api03-...`               |
| `VPS_HOST`          | Хост VPS сервера              | `example.com` или `123.45.67.89` |
| `VPS_USER`          | Пользователь для SSH          | `deploy` или `root`              |
| `VPS_SSH_KEY`       | Приватный SSH ключ            | Содержимое `~/.ssh/id_rsa`       |

### Генерация SSH ключа для VPS

```bash
# На локальной машине
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Скопировать публичный ключ на VPS
ssh-copy-id -i ~/.ssh/github_actions.pub user@your-vps-host

# Скопировать ПРИВАТНЫЙ ключ в GitHub Secrets
cat ~/.ssh/github_actions
# Весь вывод (включая -----BEGIN и -----END) → в VPS_SSH_KEY
```

### Проверка SSH ключа

```bash
# Проверить подключение
ssh -i ~/.ssh/github_actions user@your-vps-host

# Если работает - ключ настроен правильно
```

---

## 3. Branch Protection Rules

### Настройка защиты веток `main` и `dev`

1. Откройте репозиторий на GitHub
2. Перейдите в **Settings** → **Branches**
3. Нажмите **Add branch protection rule**

### Правила для ветки `main`

**Branch name pattern**: `main`

Включите следующие опции:

- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Добавьте обязательные checks:
    - `Lint & Type Check`
    - `AI Code Review`
    - `Build All Packages`
    - `Run Tests`
    - `E2E Tests`
    - `Security Scan`
- ✅ **Require conversation resolution before merging**

- ✅ **Do not allow bypassing the above settings**

- ❌ **Allow force pushes** (отключено)

- ❌ **Allow deletions** (отключено)

### Правила для ветки `dev`

**Branch name pattern**: `dev`

Включите следующие опции:

- ✅ **Require a pull request before merging**
  - Require approvals: 0 (опционально)
- ✅ **Require status checks to pass before merging**
  - Добавьте обязательные checks:
    - `Lint & Type Check`
    - `AI Code Review`
    - `Build All Packages`
    - `Run Tests`

- ❌ **Allow force pushes** (отключено)

---

## 4. GitHub Container Registry (GHCR)

### Настройка GHCR

GitHub Container Registry используется автоматически, дополнительная настройка не требуется.

**URL**: `ghcr.io/<your-username>/fin-u-ch-api:latest`

### Права доступа

1. Перейдите в **Settings** → **Actions** → **General**
2. В секции **Workflow permissions**:
   - ✅ Выберите **Read and write permissions**
   - ✅ Включите **Allow GitHub Actions to create and approve pull requests**

### Проверка образов

```bash
# Просмотр образов в GHCR
https://github.com/<your-username>/fin-u-ch/pkgs/container/fin-u-ch-api

# Pull образа локально
docker pull ghcr.io/<your-username>/fin-u-ch-api:latest
```

---

## 5. VPS подготовка

### Минимальные требования VPS

- **CPU**: 2+ cores
- **RAM**: 4GB+
- **Disk**: 20GB+ SSD
- **OS**: Ubuntu 22.04 LTS
- **Network**: Открытые порты 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Установка Docker на VPS

```bash
# Подключиться к VPS
ssh root@your-vps-host

# Обновить систему
apt update && apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установить Docker Compose
apt install docker-compose-plugin

# Проверить
docker --version
docker compose version
```

### Настройка firewall

```bash
# Установить UFW
apt install ufw

# Разрешить SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Включить firewall
ufw enable
ufw status
```

### Создание директории проекта

```bash
# Создать директорию
mkdir -p /opt/fin-u-ch
cd /opt/fin-u-ch

# Клонировать репозиторий (для docker-compose.yml)
git clone https://github.com/<your-username>/fin-u-ch.git .

# Создать .env файл
cp .env.example .env
nano .env  # Заполнить секреты

# Создать директорию для backups
mkdir -p backups
```

### Создание .env файла на VPS

```bash
# /opt/fin-u-ch/.env
POSTGRES_DB=fin_u_ch
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<SECURE_PASSWORD>
DATABASE_URL=postgresql://postgres:<SECURE_PASSWORD>@postgres:5432/fin_u_ch
REDIS_URL=redis://redis:6379
JWT_SECRET=<SECURE_JWT_SECRET>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=4000
```

**Важно**: Используйте надежные пароли! Можно сгенерировать:

```bash
# Генерация случайного пароля
openssl rand -base64 32
```

---

## 6. SSL сертификаты (Let's Encrypt)

### Установка Certbot

```bash
# На VPS
apt install certbot

# Получить сертификат (после того как DNS настроен)
certbot certonly --standalone -d yourdomain.com

# Сертификаты будут в /etc/letsencrypt/live/yourdomain.com/
```

### Auto-renewal

```bash
# Проверить автообновление
certbot renew --dry-run

# Настроить cron для автообновления (уже настроен автоматически)
```

### Копирование сертификатов в проект

```bash
# Создать симлинки (обновляются автоматически при renewal)
mkdir -p /opt/fin-u-ch/ops/nginx/ssl
ln -s /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/fin-u-ch/ops/nginx/ssl/
ln -s /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/fin-u-ch/ops/nginx/ssl/
```

---

## 7. Проверка настройки

### Чеклист перед первым деплоем

- [ ] Anthropic API key добавлен в GitHub Secrets
- [ ] VPS настроен (Docker, firewall, директории)
- [ ] SSH ключ добавлен в GitHub Secrets и на VPS
- [ ] .env файл на VPS заполнен
- [ ] Branch protection rules настроены
- [ ] GHCR permissions настроены
- [ ] DNS записи настроены (A запись на IP VPS)
- [ ] SSL сертификат получен
- [ ] Первый тестовый PR создан

### Тестирование CI/CD

1. Создайте feature ветку:

   ```bash
   git checkout -b test/ci-cd-setup
   echo "test" > test.txt
   git add test.txt
   git commit -m "test: verify CI/CD setup"
   git push origin test/ci-cd-setup
   ```

2. Откройте Pull Request в `dev`

3. Проверьте что все checks проходят:
   - ✅ Lint & Type Check
   - ✅ AI Code Review
   - ✅ Build
   - ✅ Tests

4. Merge PR в `dev`

5. Создайте PR из `dev` в `main`

6. После merge в `main` проверьте:
   - ✅ Docker images build
   - ✅ Deploy на VPS
   - ✅ Health check проходит

---

## 8. Мониторинг и логи

### Просмотр GitHub Actions логов

1. Перейдите в **Actions** в репозитории
2. Выберите workflow run
3. Кликните на job чтобы увидеть логи

### Просмотр логов на VPS

```bash
# Подключиться к VPS
ssh user@your-vps-host

# Логи всех сервисов
cd /opt/fin-u-ch
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f api
docker compose logs -f web
docker compose logs -f worker
```

### Health check

```bash
# Проверить здоровье API
curl https://yourdomain.com/api/health

# Ожидаемый ответ
{"status":"ok","uptime":12345,"database":"connected"}
```

---

## 9. Troubleshooting

### AI Review не запускается

**Проблема**: Job "AI Code Review" fails

**Решение**:

1. Проверьте что `ANTHROPIC_API_KEY` в Secrets
2. Проверьте баланс в Anthropic Console
3. Проверьте логи GitHub Actions
4. Запустите локально: `cd scripts/ai-review && pnpm dev <pr-number>`

### Deploy fails на этапе SSH

**Проблема**: Cannot connect to VPS

**Решение**:

1. Проверьте что VPS включен и доступен: `ping your-vps-host`
2. Проверьте SSH ключ в Secrets (должен быть приватный ключ)
3. Проверьте firewall на VPS: `ufw status`
4. Проверьте вручную: `ssh -i ~/.ssh/github_actions user@vps-host`

### Docker images не building

**Проблема**: Docker build job fails

**Решение**:

1. Проверьте Dockerfile синтаксис локально: `docker build -f ops/docker/api.Dockerfile .`
2. Проверьте GHCR permissions в Settings → Actions
3. Проверьте что все зависимости в package.json

### Database migration fails

**Проблема**: Prisma migrate fails на VPS

**Решение**:

1. Проверьте DATABASE_URL в .env на VPS
2. Проверьте что PostgreSQL контейнер запущен: `docker compose ps`
3. Проверьте логи PostgreSQL: `docker compose logs postgres`
4. Запустите миграцию вручную: `docker compose exec api npx prisma migrate deploy`

---

## 10. Дополнительные ресурсы

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
- [Docker Documentation](https://docs.docker.com/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)

---

**Дата обновления**: 2024-01-07
