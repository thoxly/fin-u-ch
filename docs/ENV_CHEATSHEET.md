# ENV Cheatsheet - Быстрая шпаргалка

## 🚀 Быстрый старт

```bash
# 1. Создать .env из примера (работает на Windows/macOS/Linux)
pnpm env:setup

# 2. Показать текущие настройки
pnpm env:current

# 3. Список доступных env файлов
pnpm env:list
```

> **💡 Совет для Windows пользователей:** Все команды `pnpm env:*` кросс-платформенные!

## 🔄 Переключение окружений

```bash
# Development (локальная разработка)
pnpm env:dev

# Production (продакшен)
pnpm env:prod
```

## 📝 Основные переменные

### Development (.env)

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
VITE_API_URL=http://localhost:4000
```

### Production (.env.production)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-db:5432/fin_u_ch
REDIS_URL=rediss://:password@prod-redis:6380
JWT_SECRET=$(openssl rand -hex 32)
VITE_API_URL=/api
```

## 🔐 Безопасность

```bash
# Сгенерировать JWT секрет
openssl rand -hex 32

# Проверить что .env в gitignore
git check-ignore .env
# Должен вывести: .env

# Скрыть пароли в выводе
grep "DATABASE_URL" .env | sed 's/:.*@/:***@/'
```

## 🐳 Docker

```bash
# Локальная разработка
docker-compose -f ops/docker/docker-compose.yml up -d

# Production с конкретным env файлом
docker-compose -f ops/docker/docker-compose.prod.yml --env-file .env.production up -d

# Проверить env в Docker
docker-compose config
```

## 🛠️ Полезные команды

### Кросс-платформенные (работают везде)

```bash
# Создать .env
pnpm env:setup

# Проверить текущее окружение
pnpm env:current

# Переключить окружение
pnpm env:dev    # development
pnpm env:prod   # production
```

### macOS / Linux

```bash
# Создать env файл для production
cp env.example .env.production
nano .env.production

# Backup текущего .env
cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"

# Проверить все env файлы
ls -la | grep .env

# Сравнить env файлы
diff .env .env.production

# Найти использование переменной в коде
grep -r "REDIS_URL" apps/
```

### Windows (PowerShell)

```powershell
# Создать env файл для production
Copy-Item env.example .env.production
notepad .env.production

# Backup текущего .env
$date = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item .env ".env.backup.$date"

# Проверить все env файлы
Get-ChildItem -Filter .env*

# Сравнить env файлы
Compare-Object (Get-Content .env) (Get-Content .env.production)

# Найти использование переменной в коде
Get-ChildItem -Path apps -Recurse -Filter *.ts | Select-String "REDIS_URL"
```

## 📋 Checklist перед деплоем

- [ ] Обновлен `env.example` с новыми переменными
- [ ] `.env.production` содержит правильные credentials
- [ ] JWT_SECRET изменен (не дефолтный)
- [ ] DATABASE_URL использует реальные credentials
- [ ] REDIS_URL с паролем (для прода)
- [ ] `.env` файлы не в Git
- [ ] Секреты в GitHub Secrets (для CI/CD)
- [ ] VITE_API_URL правильно настроен
- [ ] NODE_ENV=production

## 📖 Полная документация

Смотрите: [ENV_SETUP.md](ENV_SETUP.md)
