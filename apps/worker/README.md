# Worker - Фоновые задачи

Worker для автоматического выполнения запланированных задач в системе финансового учета.

## Функциональность

### Генерация зарплатных операций

Автоматически генерирует операции расходов для зарплат сотрудников:

- **ФОТ** (Фонд оплаты труда) - основная зарплата
- **Страховые взносы** - 30% от базовой зарплаты
- **НДФЛ** - 13% от базовой зарплаты

**Расписание**: Каждое 1-е число месяца в 00:00 (Europe/Moscow)

## Быстрый старт

### 1. Установка зависимостей

```bash
pnpm install
```

### 2. Генерация Prisma Client

```bash
npx prisma generate
```

### 3. Настройка переменных окружения

Создайте файл `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev
NODE_ENV=development
```

### 4. Запуск

```bash
# Разработка (с hot-reload)
pnpm dev

# Production
pnpm build
pnpm start
```

## Структура проекта

```
src/
├── config/
│   ├── env.ts        # Конфигурация переменных окружения
│   ├── logger.ts     # Winston логирование
│   └── prisma.ts     # Prisma Client
├── jobs/
│   └── salary.generate.monthly.ts  # Генерация зарплат
└── index.ts          # Entry point с cron scheduler
```

## Задачи

### Генерация зарплат

**Файл**: `src/jobs/salary.generate.monthly.ts`

**Что делает**:

1. Находит все активные записи Salary
2. Для каждой рассчитывает суммы
3. Создает 3 операции расхода в транзакции
4. Автоматически создает статьи если их нет

**Cron**: `0 0 1 * *` (каждое 1-е число в 00:00)

## Ручной запуск (для тестирования)

Раскомментируйте в `src/index.ts`:

```typescript
// После подключения к БД
runSalaryGenerationManually('2025-10');
```

## Логи

Worker выводит подробные логи в консоль:

```
2025-10-07 10:00:00 [INFO]: 🚀 Worker starting...
2025-10-07 10:00:00 [INFO]: ✅ Database connection established
2025-10-07 10:00:00 [INFO]: 👷 Worker is running...
```

При выполнении задачи:

```
2025-11-01 00:00:00 [INFO]: 🔄 Running scheduled salary generation task...
2025-11-01 00:00:00 [INFO]: Found 5 active salary record(s)
2025-11-01 00:00:00 [INFO]: Generated salary operations for Иванов И.И.: wage=100000, contributions=30000.00, tax=13000.00
2025-11-01 00:00:00 [INFO]: ✅ Salary generation task completed successfully
```

## Graceful Shutdown

Worker корректно завершает работу при получении сигналов:

```bash
# Остановка
Ctrl+C  # или kill <PID>
```

## Production

Для production рекомендуется использовать process manager:

```bash
# PM2
pm2 start dist/index.js --name worker

# Docker
docker build -f ops/docker/worker.Dockerfile .
```

## Troubleshooting

### Worker не запускается

1. Проверьте `DATABASE_URL` в `.env`
2. Убедитесь что PostgreSQL запущен
3. Проверьте что Prisma Client сгенерирован: `npx prisma generate`

### Операции не создаются

1. Убедитесь что есть активные записи Salary
2. Проверьте что effectiveFrom <= текущий месяц <= effectiveTo (или effectiveTo = null)
3. Проверьте что есть активный Account в компании

### Проверка логов

```bash
# В режиме dev
pnpm dev  # логи выводятся в консоль

# В production (PM2)
pm2 logs worker
```

## Следующие улучшения

- [ ] API endpoint для ручного запуска
- [ ] Поддержка weekly/biweekly периодичности
- [ ] Email/Telegram уведомления
- [ ] История выполнения задач
- [ ] Dry-run режим

## Лицензия

MIT
