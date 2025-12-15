# Разрешение failed миграции subscription

## Проблема

Миграция `20251215074023_add_subscriptions_and_promo_codes` помечена как failed в базе данных, но была удалена из кода. Это блокирует применение новых миграций.

## Решение

### Автоматическое (через CI/CD)

При следующем деплое CI/CD автоматически разрешит эту миграцию, пометив её как rolled back.

### Ручное разрешение

Если нужно разрешить миграцию вручную на production сервере:

```bash
# Подключиться к серверу
ssh user@your-server

# Перейти в директорию проекта
cd /opt/fin-u-ch

# Разрешить failed миграцию (пометить как rolled back)
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate resolve --rolled-back 20251215074023_add_subscriptions_and_promo_codes

# Или использовать скрипт
./ops/scripts/resolve-failed-migration.sh 20251215074023_add_subscriptions_and_promo_codes --rolled-back

# Проверить статус миграций
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate status

# Применить оставшиеся миграции
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
```

## Почему rolled-back?

Миграция была удалена из кода, поэтому она не должна быть применена. Помечаем её как rolled back, чтобы Prisma знал, что она не должна применяться.

## Проверка

После разрешения миграции проверьте:

```bash
# Статус миграций должен показать "All migrations have been applied"
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate status
```
