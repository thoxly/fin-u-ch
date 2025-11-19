# Common Pitfalls

Known issues and pitfalls in the Fin-U-CH project.

## 1. Missing companyId Filters

### Problem

The most common and dangerous mistake is database queries without companyId filtering, leading to data leakage between companies.

### How to Avoid

- Always use tenantMiddleware before routes
- Always include companyId in WHERE conditions
- Create helper functions with automatic filtering

```typescript
// BAD - data leakage!
const operations = await prisma.operation.findMany({
  where: { operationDate: { gte: startDate } },
});

// GOOD
const operations = await prisma.operation.findMany({
  where: {
    companyId, // REQUIRED!
    operationDate: { gte: startDate },
  },
});
```

### Testing

Always write tests for data isolation:

```typescript
it('should not return data from other companies', async () => {
  await createTestData(companyA);
  await createTestData(companyB);

  const result = await service.getOperations(companyA);

  expect(result.every((op) => op.companyId === companyA)).toBe(true);
});
```

## 2. Missing Indexes

### Problem

Slow queries due to missing indexes on frequently queried fields.

### Required Indexes

```prisma
model Operation {
  // ... fields

  @@index([companyId, operationDate])
  @@index([companyId, articleId, operationDate])
  @@index([companyId, accountId])
  @@index([companyId, dealId])
}

model PlanItem {
  // ... fields

  @@index([companyId, startDate, repeat])
  @@index([companyId, articleId])
}

model Article {
  // ... fields

  @@index([companyId, parentId])
  @@index([companyId, type, activity])
}
```

### How to Check

- Use EXPLAIN ANALYZE for slow queries
- Monitor query execution time in production
- Create indexes before deployment, not after

## 3. N+1 Query Problem

### Problem

Multiple database queries in loops instead of a single query with join.

```typescript
// BAD - N+1 queries
const operations = await prisma.operation.findMany({ where: { companyId } });
for (const op of operations) {
  op.article = await prisma.article.findUnique({ where: { id: op.articleId } });
}

// GOOD - single query with include
const operations = await prisma.operation.findMany({
  where: { companyId },
  include: {
    article: true,
    account: true,
    counterparty: true,
  },
});
```

### Optimization for Large Datasets

Use select instead of include if only specific fields are needed:

```typescript
// EXCELLENT - only needed fields
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

## 4. Reports Without Caching

### Problem

Heavy reports are calculated on every request, overloading the database.

### Solution

Use Redis for caching:

```typescript
// With caching
async function getDashboardReport(
  companyId: string,
  params: ReportParams
): Promise<DashboardData> {
  const cacheKey = `report:${companyId}:dashboard:${hashParams(params)}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const data = await calculateDashboard(companyId, params);

  await redis.setex(cacheKey, 600, JSON.stringify(data));

  return data;
}
```

### Cache Invalidation

Clear cache when data changes:

```typescript
// After creating/updating operation
await redis.del(`report:${companyId}:*`);
```

## 5. Missing Pagination

### Problem

Loading all records into memory leads to out-of-memory errors with large volumes.

### Solution

Always use pagination:

```typescript
// BAD - loading everything
const operations = await prisma.operation.findMany({
  where: { companyId },
});

// GOOD - with pagination
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

## 6. Prisma Types vs TypeScript Enums

### Problem

Prisma returns string literals (`'income' | 'expense' | 'transfer'`), but code uses TypeScript enums (`OperationType.INCOME`), causing runtime type mismatches.

### Solution

**Always use string literals, not enums** in shared types:

```typescript
// BAD - enum incompatible with Prisma
export interface Article {
  type: OperationType; // enum
}

// GOOD - string literal matches Prisma
export interface Article {
  type: 'income' | 'expense' | 'transfer';
}
```

**After changing types in shared:**

1. Rebuild shared: `cd packages/shared && pnpm run build`
2. Restart dev servers to pick up new types

## 7. Prisma Schema vs Database Sync

### Problem

Schema has field, but database doesn't → `Column does not exist` errors.

### Solution

**Always create migrations** when changing schema:

```bash
# After schema change
npx prisma migrate dev --name add_field_name

# Check sync status
npx prisma migrate status

# If out of sync, apply migrations
npx prisma migrate deploy
```

**Never use `db push` in production code** - it doesn't track history.

## 8. Build Dependencies

### Problem

packages/shared must be built first, otherwise apps cannot find types.

### Solution

In build scripts:

```bash
# Correct order
pnpm --filter @fin-u-ch/shared build
pnpm --filter api build
pnpm --filter web build
pnpm --filter worker build

# Or in root package.json
"build": "pnpm --filter @fin-u-ch/shared build && pnpm -r --filter './apps/*' build"
```

Maintain order in Docker multi-stage builds as well.

## 9. Frontend Proxy in Vite

### Problem

Direct API requests from frontend are blocked by CORS in dev mode.

### Solution

Use proxy in vite.config.ts:

```typescript
// vite.config.ts
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

In production Nginx handles proxy, in dev - Vite.

## 10. Worker Depends on Prisma Migrations

### Problem

Worker crashes if migrations are not applied.

### Solution

In CI/CD and docker-compose:

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
      - api # Wait for API to apply migrations
    command: npm start
```

## 11. Breaking Changes in JWT Payload

### Problem

Changing JWT structure requires logout of all users.

### Solution

- Use JWT payload versioning
- Increment version on breaking changes
- Reject old tokens gracefully

```typescript
interface JWTPayload {
  userId: string;
  companyId: string;
  version: number; // Versioning
}

// When verifying token
if (payload.version !== CURRENT_JWT_VERSION) {
  throw new Error('Token version mismatch, please login again');
}
```

## 12. Migrations with Column Removal

### Problem

Removing columns in a single migration breaks running code during rolling deployment.

### Solution

Two-phase deployment:

**Phase 1:** Stop using the column

```typescript
// Deploy 1: remove field usage
const user = await prisma.user.findUnique({
  select: {
    id: true,
    email: true,
    // oldField: true, // removed
  },
});
```

**Phase 2:** Remove the column

```prisma
// Deploy 2: migration removes column
model User {
  id    String
  email String
  // oldField String  // removed
}
```

## 13. Enum Changes Require Data Updates

### Problem

Adding/removing enum values can break existing records.

### Solution

When changing enums:

1. Adding new value - safe
2. Removing value - requires data migration:

```sql
-- Migration: change old value to new
UPDATE operations
SET type = 'expense'
WHERE type = 'old_expense_type';

-- Then remove from enum
```

## 14. Redis Connection Handling

### Problem

Improper Redis connection management leads to leaks.

### Solution

Use singleton pattern:

```typescript
// config/redis.ts
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

## 15. Date Handling with Timezone

### Problem

Timezone mismatch between client, server, and database leads to incorrect dates.

### Solution

- Store all dates in UTC in database
- Convert to local timezone only for display
- Use ISO 8601 format for transmitting dates

```typescript
// Correct date handling
import { format, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// Always receive ISO string from client
const operationDate = parseISO(req.body.operationDate); // '2024-01-15T10:00:00Z'

// Save to database as Date (PostgreSQL stores in UTC)
await prisma.operation.create({
  data: {
    operationDate,
    // ...
  },
});

// Return to client in ISO format
res.json({
  operationDate: operation.operationDate.toISOString(),
});
```

## 16. Memory Leaks in React

### Problem

Asynchronous operations after component unmount.

### Solution

Use cleanup in useEffect:

```typescript
// With cleanup
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

Or use AbortController:

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

## 17. Testing with Real Database

### Problem

Tests affect each other due to shared database.

### Solution

Use test database and transactions:

```typescript
// jest.config.js
module.exports = {
  globalSetup: './tests/setup.ts',
  globalTeardown: './tests/teardown.ts',
};

// tests/setup.ts
export default async function setup() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  // Apply migrations
  execSync('npx prisma migrate deploy');
}

// In tests use transactions
beforeEach(async () => {
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  await prisma.$executeRaw`ROLLBACK`;
});
```

## Checklist Before PR

Check these points before creating a PR:

- [ ] All Prisma queries have companyId filter
- [ ] Indexes created for new fields in WHERE/ORDER BY
- [ ] No N+1 query problems (using include/select)
- [ ] Heavy reports are cached in Redis
- [ ] Large lists have pagination
- [ ] packages/shared rebuilt after type changes
- [ ] Prisma migrations created and applied (`migrate status` shows "up to date")
- [ ] Types use string literals, not enums (Prisma compatibility)
- [ ] No breaking changes in JWT payload (or version incremented)
- [ ] Enum changes accounted for in existing data
- [ ] Correct build order in CI/CD
- [ ] Tests pass and do not affect each other
- [ ] No memory leaks in React (cleanup in useEffect)
- [ ] Dates in UTC and using ISO format
