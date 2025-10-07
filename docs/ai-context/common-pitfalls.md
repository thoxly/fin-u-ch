# Common Pitfalls - Частые ошибки в проекте

Известные проблемы и подводные камни в проекте Fin-U-CH.

## 1. Забытые фильтры по companyId

### Проблема

Самая частая и опасная ошибка - запросы к БД без фильтрации по `companyId`, что приводит к утечке данных между компаниями.

### Как избежать

- ✅ Всегда используйте `tenantMiddleware` перед роутами
- ✅ Всегда включайте `companyId` в WHERE условие
- ✅ Создайте helper функции с автоматической фильтрацией

```typescript
// ❌ ОПАСНО - утечка данных!
const operations = await prisma.operation.findMany({
  where: { operationDate: { gte: startDate } },
});

// ✅ Правильно
const operations = await prisma.operation.findMany({
  where: {
    companyId, // ОБЯЗАТЕЛЬНО!
    operationDate: { gte: startDate },
  },
});
```

### Проверка в тестах

Всегда пишите тесты на изоляцию данных:

```typescript
it('should not return data from other companies', async () => {
  await createTestData(companyA);
  await createTestData(companyB);

  const result = await service.getOperations(companyA);

  expect(result.every((op) => op.companyId === companyA)).toBe(true);
});
```

## 2. Missing Indexes

### Проблема

Медленные запросы из-за отсутствия индексов на часто запрашиваемых полях.

### Обязательные индексы

```prisma
model Operation {
  // ... поля

  @@index([companyId, operationDate])
  @@index([companyId, articleId, operationDate])
  @@index([companyId, accountId])
  @@index([companyId, dealId])
}

model PlanItem {
  // ... поля

  @@index([companyId, startDate, repeat])
  @@index([companyId, articleId])
}

model Article {
  // ... поля

  @@index([companyId, parentId])
  @@index([companyId, type, activity])
}
```

### Как проверить

- Используйте `EXPLAIN ANALYZE` для slow queries
- Мониторьте время выполнения запросов в production
- Создавайте индексы до деплоя, не после

## 3. N+1 Query Problem

### Проблема

Множественные запросы к БД в циклах вместо одного запроса с join.

```typescript
// ❌ ПЛОХО - N+1 queries
const operations = await prisma.operation.findMany({ where: { companyId } });
for (const op of operations) {
  op.article = await prisma.article.findUnique({ where: { id: op.articleId } });
}

// ✅ ХОРОШО - один запрос с include
const operations = await prisma.operation.findMany({
  where: { companyId },
  include: {
    article: true,
    account: true,
    counterparty: true,
  },
});
```

### Оптимизация для больших выборок

Используйте `select` вместо `include` если нужны только определённые поля:

```typescript
// ✅ ОТЛИЧНО - только нужные поля
const operations = await prisma.operation.findMany({
  where: { companyId },
  select: {
    id: true,
    amount: true,
    operationDate: true,
    article: {
      select: { name: true, type: true },
    },
  },
});
```

## 4. Отчеты без кэширования

### Проблема

Тяжёлые отчеты вычисляются каждый раз при запросе, нагружая БД.

### Решение

Используйте Redis для кэширования:

```typescript
// ✅ С кэшированием
async function getDashboardReport(
  companyId: string,
  params: ReportParams
): Promise<DashboardData> {
  const cacheKey = `report:${companyId}:dashboard:${hashParams(params)}`;

  // Проверяем кэш
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Вычисляем отчет
  const data = await calculateDashboard(companyId, params);

  // Сохраняем в кэш на 10 минут
  await redis.setex(cacheKey, 600, JSON.stringify(data));

  return data;
}
```

### Инвалидация кэша

При изменении данных сбрасывайте кэш:

```typescript
// После создания/обновления операции
await redis.del(`report:${companyId}:*`); // Удалить все отчеты компании
```

## 5. Отсутствие пагинации

### Проблема

Загрузка всех записей в память приводит к out-of-memory ошибкам при больших объёмах.

### Решение

Всегда используйте пагинацию:

```typescript
// ❌ ПЛОХО - загружаем всё
const operations = await prisma.operation.findMany({
  where: { companyId },
});

// ✅ ХОРОШО - с пагинацией
const PAGE_SIZE = 50;

const operations = await prisma.operation.findMany({
  where: { companyId },
  take: PAGE_SIZE,
  skip: (page - 1) * PAGE_SIZE,
  orderBy: { operationDate: 'desc' },
});

const total = await prisma.operation.count({
  where: { companyId },
});
```

## 6. Зависимости сборки

### Проблема

`packages/shared` должен собираться первым, иначе apps не находят типы.

### Решение

В скриптах сборки:

```bash
# ✅ Правильный порядок
pnpm --filter @fin-u-ch/shared build
pnpm --filter api build
pnpm --filter web build
pnpm --filter worker build

# Или в корне package.json
"build": "pnpm --filter @fin-u-ch/shared build && pnpm -r --filter './apps/*' build"
```

В Docker multi-stage builds тоже соблюдайте порядок.

## 7. Frontend Proxy в Vite

### Проблема

Прямые запросы к API с фронта блокируются CORS в dev режиме.

### Решение

Используйте proxy в `vite.config.ts`:

```typescript
// ✅ vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
```

В production Nginx делает proxy, в dev - Vite.

## 8. Worker зависит от Prisma migrations

### Проблема

Worker падает если миграции не применены.

### Решение

В CI/CD и docker-compose:

```yaml
# docker-compose.yml
services:
  api:
    # ...
    command: >
      sh -c "
        npx prisma migrate deploy &&
        npm start
      "

  worker:
    depends_on:
      - api # Ждём пока API применит миграции
    command: npm start
```

## 9. Breaking changes в JWT payload

### Проблема

Изменение структуры JWT требует logout всех пользователей.

### Решение

- Используйте версионирование JWT payload
- При breaking changes увеличивайте версию
- Старые токены отклоняйте gracefully

```typescript
interface JWTPayload {
  userId: string;
  companyId: string;
  version: number; // ✅ Версионирование
}

// При проверке токена
if (payload.version !== CURRENT_JWT_VERSION) {
  throw new Error('Token version mismatch, please login again');
}
```

## 10. Миграции с удалением колонок

### Проблема

Удаление колонок в одну миграцию ломает работающий код при rolling deployment.

### Решение

Двухэтапный деплой:

**Этап 1:** Перестать использовать колонку

```typescript
// Деплой 1: убираем использование поля
const user = await prisma.user.findUnique({
  select: {
    id: true,
    email: true,
    // oldField: true, // <-- убрали
  },
});
```

**Этап 2:** Удалить колонку

```prisma
// Деплой 2: миграция удаляет колонку
model User {
  id    String
  email String
  // oldField String  // <-- удалили
}
```

## 11. Enum изменения требуют обновления данных

### Проблема

Добавление/удаление enum значений может сломать существующие записи.

### Решение

При изменении enum:

1. Добавление нового значения - безопасно
2. Удаление значения - требует миграцию данных:

```sql
-- Миграция: меняем старое значение на новое
UPDATE operations
SET type = 'expense'
WHERE type = 'old_expense_type';

-- Затем можно удалить из enum
```

## 12. Redis connection handling

### Проблема

Неправильное управление Redis подключениями приводит к утечкам.

### Решение

Используйте singleton pattern:

```typescript
// ✅ config/redis.ts
import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL);

    redisClient.on('error', (error) => {
      logger.error('Redis error', { error });
    });
  }

  return redisClient;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (redisClient) {
    await redisClient.quit();
  }
});
```

## 13. Date handling с timezone

### Проблема

Несоответствие timezone между клиентом, сервером и БД приводит к неправильным датам.

### Решение

- Храните все даты в UTC в БД
- Конвертируйте в локальный timezone только при отображении
- Используйте ISO 8601 формат для передачи дат

```typescript
// ✅ Правильная работа с датами
import { format, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// От клиента всегда получаем ISO строку
const operationDate = parseISO(req.body.operationDate); // '2024-01-15T10:00:00Z'

// Сохраняем в БД как Date (PostgreSQL хранит в UTC)
await prisma.operation.create({
  data: {
    operationDate,
    // ...
  },
});

// Отдаём клиенту в ISO формате
res.json({
  operationDate: operation.operationDate.toISOString(),
});
```

## 14. Memory leaks в React

### Проблема

Асинхронные операции после unmount компонента.

### Решение

Используйте cleanup в useEffect:

```typescript
// ✅ С cleanup
useEffect(() => {
  let cancelled = false;

  async function fetchData() {
    const data = await apiClient.get('/api/operations');
    if (!cancelled) {
      setOperations(data);
    }
  }

  fetchData();

  return () => {
    cancelled = true; // Cleanup
  };
}, []);
```

Или используйте AbortController:

```typescript
useEffect(() => {
  const controller = new AbortController();

  apiClient
    .get('/api/operations', {
      signal: controller.signal,
    })
    .then(setOperations);

  return () => {
    controller.abort();
  };
}, []);
```

## 15. Testing с реальной БД

### Проблема

Тесты влияют друг на друга из-за общей БД.

### Решение

Используйте test database и transactions:

```typescript
// ✅ jest.config.js
module.exports = {
  globalSetup: './tests/setup.ts',
  globalTeardown: './tests/teardown.ts',
};

// tests/setup.ts
export default async function setup() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  // Применить миграции
  execSync('npx prisma migrate deploy');
}

// В тестах используйте transactions
beforeEach(async () => {
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  await prisma.$executeRaw`ROLLBACK`;
});
```

## Checklist перед PR

Проверьте эти пункты перед созданием PR:

- [ ] Все Prisma запросы имеют фильтр по `companyId`
- [ ] Индексы созданы для новых полей в WHERE/ORDER BY
- [ ] Нет N+1 query проблем (используется include/select)
- [ ] Тяжёлые отчёты кэшируются в Redis
- [ ] Большие списки имеют пагинацию
- [ ] packages/shared пересобран после изменений типов
- [ ] Обновлены миграции Prisma
- [ ] Нет breaking changes в JWT payload (или версия увеличена)
- [ ] Enum изменения учтены в существующих данных
- [ ] Правильный порядок сборки в CI/CD
- [ ] Тесты проходят и не влияют друг на друга
- [ ] Нет memory leaks в React (cleanup в useEffect)
- [ ] Даты в UTC и используется ISO формат
