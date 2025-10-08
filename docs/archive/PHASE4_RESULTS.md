# ФАЗА 4: Worker (фоновые задачи) - Результаты

**Статус**: ✅ Завершена  
**Дата**: 2025-10-07

## Выполненные задачи

### 4.1 Базовая структура Worker ✅

- Создан `apps/worker/package.json` со всеми зависимостями
- Настроен TypeScript (`tsconfig.json`)
- Создан `nodemon.json` для hot-reload
- Реализованы конфигурационные файлы:
  - `src/config/env.ts` - валидация переменных окружения
  - `src/config/logger.ts` - логирование через winston
  - `src/config/prisma.ts` - Prisma Client с graceful shutdown

### 4.2 Реализация задач ✅

**Задача генерации зарплатных операций** (`src/jobs/salary.generate.monthly.ts`):

- Функция `generateSalaryOperations(params)`:
  - Получает активные записи Salary за указанный месяц
  - Рассчитывает суммы: baseWage, взносы (contributionsPct), НДФЛ (incomeTaxPct)
  - Создает 3 операции расхода для каждой зарплаты:
    1. **ФОТ** (фонд оплаты труда) - основная зарплата
    2. **Взносы** - страховые взносы (по умолчанию 30%)
    3. **НДФЛ** - налог на доходы физических лиц (по умолчанию 13%)
  - Автоматически создает статьи если их нет
  - Использует транзакции для атомарности операций
  - Полное логирование всех действий

**Вспомогательные функции**:

- `findOrCreateSalaryArticles()` - находит или создает стандартные статьи для зарплат
- `getCurrentMonth()` - форматирует текущий месяц в YYYY-MM

**Настройка cron-расписания** (`src/index.ts`):

- Задача запускается автоматически каждое 1-е число месяца в 00:00
- Cron pattern: `'0 0 1 * *'`
- Таймзона: Europe/Moscow (настраиваемая)
- Функция `runSalaryGenerationManually()` для ручного запуска
- Graceful shutdown с корректным закрытием соединений
- Проверка подключения к БД при старте

## Структура проекта

```
apps/worker/
├── prisma/
│   └── schema.prisma      # копия схемы БД
├── src/
│   ├── config/
│   │   ├── env.ts         # конфигурация переменных окружения
│   │   ├── logger.ts      # winston логирование
│   │   └── prisma.ts      # Prisma Client
│   ├── jobs/
│   │   └── salary.generate.monthly.ts  # генерация зарплат
│   └── index.ts           # entry point с cron scheduler
├── package.json
├── tsconfig.json
└── nodemon.json
```

## Технологии

- **Runtime**: Node.js 18+, TypeScript
- **Scheduling**: node-cron (для cron-задач)
- **Database**: Prisma Client (PostgreSQL)
- **Logging**: Winston
- **Dev Tools**: Nodemon, ts-node

## Запуск

### 1. Установка зависимостей

```bash
cd apps/worker
pnpm install
```

### 2. Генерация Prisma Client

```bash
npx prisma generate
```

### 3. Создание .env файла

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev
NODE_ENV=development
```

### 4. Запуск Worker

```bash
# Режим разработки (с hot-reload)
pnpm dev

# Production
pnpm build
pnpm start
```

Worker будет ожидать запланированных задач и выполнять их по расписанию.

## Тестирование

### Ручной запуск генерации зарплат

Для тестирования можно вручную запустить генерацию:

```typescript
// В src/index.ts можно временно добавить:
runSalaryGenerationManually('2025-10');
```

### Пример работы

1. Создайте сотрудника-контрагента (category: employee)
2. Создайте запись Salary для этого сотрудника
3. Запустите Worker
4. Проверьте создание операций в БД

## Особенности реализации

### 1. Автоматическое создание статей

Worker автоматически создает три статьи если их нет:

- "Зарплата" (type: expense, activity: operating)
- "Страховые взносы" (type: expense, activity: operating)
- "НДФЛ" (type: expense, activity: operating)

### 2. Транзакционность

Все 3 операции создаются в одной транзакции - либо все успешно, либо ни одной.

### 3. Умная обработка периодов

Worker учитывает effectiveFrom и effectiveTo для определения активных зарплат.

### 4. Multi-tenant поддержка

Worker обрабатывает зарплаты для всех компаний, изолируя данные по companyId.

### 5. Логирование

Подробное логирование всех действий:

- Старт/завершение задач
- Количество обработанных записей
- Ошибки с сохранением stack trace
- Graceful shutdown

## Расписание задач

| Задача            | Расписание (cron) | Описание                        |
| ----------------- | ----------------- | ------------------------------- |
| Генерация зарплат | `0 0 1 * *`       | Каждое 1-е число месяца в 00:00 |

## API для ручного запуска (будущее)

В будущем можно добавить endpoint в API для ручного запуска:

```typescript
// В apps/api
POST /api/worker/salary-generate
Body: { "month": "2025-10", "companyId": "optional" }
```

## Логи

Примеры логов при работе:

```
2025-10-07 10:00:00 [INFO]: 🚀 Worker starting...
2025-10-07 10:00:00 [INFO]: Environment: development
2025-10-07 10:00:00 [INFO]: ✅ Database connection established
2025-10-07 10:00:00 [INFO]: ✅ Salary generation task scheduled (runs on 1st of each month at 00:00)
2025-10-07 10:00:00 [INFO]: 👷 Worker is running and waiting for scheduled tasks...

# При запуске задачи:
2025-11-01 00:00:00 [INFO]: 🔄 Running scheduled salary generation task...
2025-11-01 00:00:00 [INFO]: Starting salary generation for month: 2025-11
2025-11-01 00:00:00 [INFO]: Found 5 active salary record(s)
2025-11-01 00:00:00 [INFO]: Generated salary operations for Иванов И.И.: wage=100000, contributions=30000.00, tax=13000.00
...
2025-11-01 00:00:00 [INFO]: Salary generation completed. Total operations created: 15
2025-11-01 00:00:00 [INFO]: ✅ Salary generation task completed successfully
```

## Критерии готовности

- ✅ Worker запускается без ошибок
- ✅ Cron-задача корректно настроена
- ✅ Генерация зарплатных операций работает
- ✅ Автоматическое создание статей реализовано
- ✅ Транзакции обеспечивают целостность данных
- ✅ Логирование полное и информативное
- ✅ Graceful shutdown работает корректно
- ✅ Prisma Client сгенерирован
- ✅ TypeScript компилируется без ошибок

## Следующие шаги

**ФАЗА 5**: Frontend

- Инициализировать React + Vite приложение
- Настроить Redux Toolkit
- Создать базовые UI компоненты
- Реализовать страницы и функциональность

## Известные ограничения

1. Нет API endpoint для ручного запуска (можно добавить в будущем)
2. Нет уведомлений об ошибках (можно добавить email/telegram)
3. Работает только с месячной периодичностью (weekly/biweekly не обрабатываются)
4. Фиксированная дата генерации (1-е число месяца)

## Возможные улучшения

1. **Добавить поддержку weekly/biweekly периодичности**
   - Расширить логику генерации для разных периодов
   - Добавить соответствующие cron-задачи

2. **API endpoint для ручного запуска**
   - POST /api/worker/salary-generate
   - Параметры: month, companyId

3. **Уведомления**
   - Email при успешной генерации
   - Telegram при ошибках
   - Slack интеграция

4. **История выполнения**
   - Таблица JobExecutionLog
   - Сохранение результатов каждого запуска
   - UI для просмотра истории

5. **Dry-run режим**
   - Проверка без создания операций
   - Предпросмотр результатов

6. **Гибкие настройки расписания**
   - Настройка через БД или env
   - UI для управления расписанием

## Заметки

- Worker использует ту же БД, что и API
- Prisma Client генерируется из той же схемы
- Hot-reload работает через nodemon
- Worker может работать параллельно с API
- Для production нужен process manager (PM2, systemd)
