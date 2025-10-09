# ENV Hot Reload - Горячая перезагрузка

## ✅ Настроено автоматическое обновление

Проект настроен так, что изменения в `.env` файле **автоматически применяются** без необходимости ручного перезапуска.

## 🔄 Как это работает

### API (apps/api)

```json
// apps/api/nodemon.json
{
  "watch": ["src", "../../.env"], // ← следит за .env
  "ext": "ts,json",
  "exec": "ts-node src/server.ts"
}
```

### Worker (apps/worker)

```json
// apps/worker/nodemon.json
{
  "watch": ["src", "../../.env"], // ← следит за .env
  "ext": "ts",
  "exec": "ts-node src/index.ts"
}
```

### Web (apps/web)

Vite автоматически отслеживает изменения в `.env` файлах с префиксом `VITE_`.

## 🎯 Что происходит при изменении .env

### Изменение переменных (кроме VITE\_\*)

```bash
# 1. Редактируете .env
nano .env

# 2. Nodemon автоматически перезапускает API и Worker
[nodemon] restarting due to changes...
[nodemon] starting `ts-node src/server.ts`

# 3. Изменения применены!
```

### Изменение VITE\_\* переменных

```bash
# 1. Редактируете .env
nano .env

# 2. Перезапустите Vite вручную
# Ctrl+C в терминале с Vite
pnpm --filter web dev

# Или используйте Vite HMR (может потребовать перезагрузку страницы)
```

## 🚀 Рабочий процесс

### Сценарий 1: Изменение DATABASE_URL

```bash
# 1. Остановите Docker контейнер с PostgreSQL
docker-compose -f ops/docker/docker-compose.yml stop postgres

# 2. Измените DATABASE_URL в .env
sed -i '' 's/fin_u_ch_dev/fin_u_ch_test/' .env

# 3. Запустите новый контейнер
docker-compose -f ops/docker/docker-compose.yml up -d postgres

# 4. API и Worker автоматически перезапустятся
# 5. Они подключатся к новой БД
```

### Сценарий 2: Изменение JWT_SECRET

```bash
# 1. Сгенерируйте новый секрет
NEW_SECRET=$(openssl rand -hex 32)

# 2. Обновите .env
echo "JWT_SECRET=$NEW_SECRET" >> .env

# 3. API автоматически перезапустится
# 4. Новый секрет применится
# 5. Старые токены станут невалидными (пользователи должны перелогиниться)
```

### Сценарий 3: Переключение окружений

```bash
# 1. Переключитесь на production
pnpm env:prod

# 2. API и Worker автоматически перезапустятся
# 3. Подключатся к production БД и Redis

# 4. Перезапустите Web вручную
# Ctrl+C в терминале с Vite
pnpm --filter web dev
```

## 📝 Важные примечания

### ✅ Автоматически перезапускаются:

- API сервер (Express)
- Worker процесс (Node-cron)

### ⚠️ Требуют ручного перезапуска:

- Web приложение (Vite) - только для `VITE_*` переменных
- Docker контейнеры (если меняются `POSTGRES_*`, `DOCKER_*` и т.д.)

### 🔄 Не требуют перезапуска:

- Изменения в коде (благодаря HMR в Vite и nodemon в API/Worker)

## 🛠️ Полезные команды

### Проверить что nodemon следит за .env

```bash
# API
cat apps/api/nodemon.json | grep -A1 watch

# Worker
cat apps/worker/nodemon.json | grep -A1 watch
```

### Принудительный перезапуск

```bash
# Если автоматический перезапуск не сработал

# API
pnpm --filter api dev

# Worker
pnpm --filter worker dev

# Web
pnpm --filter web dev

# Все сразу
pnpm dev
```

### Проверить что изменения применились

```bash
# Проверить переменные в API
curl http://localhost:4000/api/health

# Проверить логи
docker logs -f fin-u-ch-api
docker logs -f fin-u-ch-worker

# Проверить текущий .env
pnpm env:current
```

## 🐛 Troubleshooting

### Проблема: Изменения не применяются

**Решение:**

```bash
# 1. Убедитесь что nodemon запущен (не в production режиме)
pnpm --filter api dev
pnpm --filter worker dev

# 2. Проверьте что .env существует
ls -la .env

# 3. Принудительно перезапустите
# Ctrl+C во всех терминалах
pnpm dev
```

### Проблема: VITE\_\* переменные не обновляются

**Решение:**

```bash
# Vite кэширует env переменные при старте
# Перезапустите Vite
pnpm --filter web dev
```

### Проблема: Docker контейнеры используют старые значения

**Решение:**

```bash
# Docker Compose читает .env только при старте
# Пересоздайте контейнеры
docker-compose -f ops/docker/docker-compose.yml down
docker-compose -f ops/docker/docker-compose.yml up -d
```

## 💡 Best Practices

### ✅ DO (Делайте)

1. **Используйте `pnpm env:*` для переключения окружений**
   - Автоматический backup
   - Безопасное переключение
   - Логирование изменений

2. **Проверяйте изменения после переключения**

   ```bash
   pnpm env:current
   ```

3. **Перезапускайте Web вручную после изменения VITE\_\***
   ```bash
   pnpm --filter web dev
   ```

### ❌ DON'T (Не делайте)

1. **Не редактируйте .env когда приложение запущено в production**
   - Используйте правильный workflow деплоя
   - Сначала тестируйте на staging

2. **Не меняйте критичные переменные без бэкапа**

   ```bash
   # Всегда делайте backup перед изменением
   cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
   ```

3. **Не забывайте о зависимых сервисах**
   - Изменили `DATABASE_URL`? → Обновите БД
   - Изменили `REDIS_URL`? → Обновите Redis
   - Изменили `JWT_SECRET`? → Пользователи должны перелогиниться

## 🔗 Связанная документация

- [ENV Setup Guide](ENV_SETUP.md) - Полное руководство
- [ENV Cheatsheet](ENV_CHEATSHEET.md) - Быстрая шпаргалка

## ✨ Итог

Проект настроен для **максимально комфортной разработки**:

- ✅ Изменения в `.env` автоматически применяются для API и Worker
- ✅ Nodemon следит за `.env` и перезапускает приложения
- ✅ Удобные команды для переключения окружений
- ✅ Автоматический backup при переключении

**Просто редактируйте `.env` и изменения применятся автоматически!** 🚀
