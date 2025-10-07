# ENV Cheatsheet - Быстрая шпаргалка

## 🚀 Быстрый старт

```bash
# 1. Создать .env из примера
pnpm env:setup

# 2. Показать текущие настройки
pnpm env:current

# 3. Список доступных env файлов
pnpm env:list
```

## 🔄 Переключение окружений

```bash
# Development (локальная разработка)
pnpm env:dev

# Staging (тестовая среда)
pnpm env:staging

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

### Staging (.env.staging)

```env
NODE_ENV=staging
DATABASE_URL=postgresql://user:password@staging-db:5432/fin_u_ch_staging
REDIS_URL=redis://:password@staging-redis:6379
JWT_SECRET=staging-secret-32-chars-minimum
VITE_API_URL=https://staging-api.example.com
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

```bash
# Создать env файл для конкретного окружения
cp env.example .env.staging
nano .env.staging

# Backup текущего .env
cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"

# Проверить все env файлы
ls -la | grep .env

# Сравнить env файлы
diff .env .env.staging

# Найти использование переменной в коде
grep -r "REDIS_URL" apps/
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
