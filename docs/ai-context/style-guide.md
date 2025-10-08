# Style Guide для AI Code Review

Правила и паттерны кода для проекта Fin-U-CH. Используется AI агентом для автоматической проверки кода в PR.

## TypeScript Strict Requirements

### Запрет `any`

- ❌ Никогда не используйте `any`
- ✅ Используйте `unknown` для неизвестных типов
- ✅ Создавайте конкретные типы/интерфейсы

```typescript
// ❌ Плохо
function process(data: any) { ... }

// ✅ Хорошо
function process(data: unknown) {
  if (isValidData(data)) { ... }
}

// ✅ Отлично
interface ProcessData {
  id: string;
  amount: number;
}
function process(data: ProcessData) { ... }
```

### Explicit Return Types

- ✅ Все функции должны иметь явный тип возвращаемого значения
- ✅ Особенно важно для публичных API и сервисных методов
- ✅ Return type может быть на отдельной строке для длинных сигнатур

```typescript
// ❌ Плохо
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Хорошо
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Хорошо - многострочная сигнатура
export async function seedInitialData(
  tx: PrismaClient,
  companyId: string
): Promise<void> {
  // ...
}
```

### Strict Null Checks

- ✅ Используйте `strictNullChecks: true` в tsconfig.json
- ✅ Явно обрабатывайте `null` и `undefined`
- ✅ Используйте optional chaining `?.` и nullish coalescing `??`

```typescript
// ❌ Плохо
function getUserName(user) {
  return user.name;
}

// ✅ Хорошо
function getUserName(user: User | null): string {
  return user?.name ?? 'Anonymous';
}
```

## HTTP Requests

### Единый API Client

- ✅ Все HTTP запросы только через `shared/api/axios.ts`
- ❌ Никогда не используйте прямые `fetch()` или сторонние axios инстансы
- ✅ JWT токены добавляются автоматически через interceptor

```typescript
// ❌ Плохо
const response = await fetch('/api/operations');

// ❌ Плохо
import axios from 'axios';
const response = await axios.get('/api/operations');

// ✅ Хорошо
import { apiClient } from '@/shared/api/axios';
const response = await apiClient.get('/api/operations');
```

## Обработка ошибок

### Try-Catch для Async операций

- ✅ Обязательно оборачивайте все async/await в try-catch
- ✅ Логируйте ошибки с контекстом
- ✅ Возвращайте понятные сообщения об ошибках пользователю

```typescript
// ❌ Плохо
async function fetchOperations() {
  const data = await apiClient.get('/api/operations');
  return data;
}

// ✅ Хорошо
async function fetchOperations(): Promise<Operation[]> {
  try {
    const { data } = await apiClient.get<Operation[]>('/api/operations');
    return data;
  } catch (error) {
    logger.error('Failed to fetch operations', { error });
    throw new Error('Не удалось загрузить операции');
  }
}
```

### Error Boundaries в React

- ✅ Используйте Error Boundary компоненты для критичных блоков UI
- ✅ Показывайте пользователю fallback UI при ошибках

### Централизованный Error Middleware в API

- ✅ Все ошибки обрабатываются через `middlewares/error.ts`
- ✅ Возвращайте правильные HTTP статусы:
  - 400 - валидация
  - 401 - не авторизован
  - 403 - нет доступа
  - 404 - не найдено
  - 409 - конфликт
  - 500 - внутренняя ошибка

## React Паттерны

### Hooks Rules

- ✅ Hooks только на верхнем уровне компонента
- ❌ Никогда не вызывайте hooks внутри условий, циклов, вложенных функций

```typescript
// ❌ Плохо
function Component({ isVisible }) {
  if (isVisible) {
    const [count, setCount] = useState(0); // Ошибка!
  }
}

// ✅ Хорошо
function Component({ isVisible }) {
  const [count, setCount] = useState(0);

  if (!isVisible) return null;
  return <div>{count}</div>;
}
```

### Functional Components Only

- ✅ Используйте только функциональные компоненты
- ❌ Никаких class-based компонентов

### Props Destructuring

- ✅ Деструктурируйте props в сигнатуре функции
- ✅ Типизируйте props через интерфейс

```typescript
// ❌ Плохо
function Button(props) {
  return <button onClick={props.onClick}>{props.label}</button>;
}

// ✅ Хорошо
interface ButtonProps {
  label: string;
  onClick: () => void;
}

function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

### Custom Hooks Naming

- ✅ Имена custom hooks начинаются с `use`
- ✅ Имя должно отражать назначение: `useAuth`, `useOperations`, `useDashboard`

## Prisma Best Practices

### Фильтрация по companyId

- ✅ **ВСЕГДА** фильтруйте запросы по `companyId`
- ❌ Никогда не делайте запросы без фильтра по tenant

```typescript
// ❌ Плохо - утечка данных между компаниями!
const operations = await prisma.operation.findMany();

// ✅ Хорошо
const operations = await prisma.operation.findMany({
  where: { companyId },
});
```

### Transactions для связанных операций

- ✅ Используйте `$transaction` для атомарных операций
- ✅ Особенно важно при создании связанных записей
- ✅ Try-catch внутри транзакции - правильный паттерн для частичной обработки ошибок

```typescript
// ✅ Хорошо - базовая транзакция
await prisma.$transaction([
  prisma.operation.create({ data: operationData }),
  prisma.account.update({
    where: { id: accountId },
    data: { balance: { increment: amount } },
  }),
]);

// ✅ Хорошо - обработка ошибок внутри транзакции
const result = await prisma.$transaction(async (tx) => {
  const company = await tx.company.create({ data: companyData });
  const user = await tx.user.create({ data: userData });

  // Попытка создать дополнительные данные
  // Если упадет - вся транзакция откатится
  try {
    await seedInitialData(tx, company.id);
  } catch (error) {
    logger.error('Failed to seed data', { companyId: company.id, error });
    throw new AppError('Failed to initialize company data', 500);
  }

  return { user, company };
});
```

### Include/Select для оптимизации

- ✅ Используйте `select` чтобы получить только нужные поля
- ✅ Используйте `include` для связанных данных
- ❌ Избегайте получения всех полей, если они не нужны

```typescript
// ❌ Плохо - загружаем всё
const operation = await prisma.operation.findUnique({
  where: { id },
});

// ✅ Хорошо - только нужные поля и связи
const operation = await prisma.operation.findUnique({
  where: { id },
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

## Принцип простоты кода

### Основные правила

- Код проще читать, чем писать
- Линейная логика предпочтительнее вложенной
- Избегайте "умных" решений ради экономии строк
- Комментарии объясняют "почему", а не "что"

### Метрики сложности

- Когнитивная сложность функции: ≤ 10
- Длина функции: ≤ 40 строк
- Вложенность условий: ≤ 3 уровня
- Именование: самоочевидное

```typescript
// ❌ Плохо - вложенность и неясная логика
function processOrder(order) {
  if (order) {
    if (order.items) {
      if (order.items.length > 0) {
        return order.items.reduce((sum, item) => {
          if (item.price) {
            return sum + item.price;
          }
          return sum;
        }, 0);
      }
    }
  }
  return 0;
}

// ✅ Хорошо - ранние выходы, линейная логика
function calculateOrderTotal(order: Order | null): number {
  if (!order?.items?.length) return 0;

  return order.items
    .filter((item) => item.price > 0)
    .reduce((sum, item) => sum + item.price, 0);
}
```

## Именование

### Переменные и функции

- ✅ camelCase: `getUserName`, `totalAmount`
- ✅ Глаголы для функций: `fetchData`, `calculateTotal`, `validateInput`
- ✅ Существительные для переменных: `userName`, `orderTotal`

### Компоненты и Типы

- ✅ PascalCase: `DashboardPage`, `OperationForm`, `User`, `OrderDTO`
- ✅ Интерфейсы props: `ComponentNameProps`
- ✅ DTOs: `CreateOperationDTO`, `UpdateArticleDTO`

### Константы

- ✅ UPPER_SNAKE_CASE для глобальных констант: `API_BASE_URL`, `MAX_RETRY_COUNT`
- ✅ camelCase для локальных констант: `defaultCurrency`

## Imports

### Порядок импортов

1. Внешние библиотеки (React, Express, etc.)
2. Внутренние модули проекта
3. Типы и интерфейсы
4. Стили

```typescript
// ✅ Хорошо
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { apiClient } from '@/shared/api/axios';
import { formatDate } from '@/shared/lib/date';

import { Operation } from '@fin-u-ch/shared';

import './styles.css';
```

### Абсолютные пути

- ✅ Используйте алиасы из tsconfig: `@/`, `@shared/`
- ❌ Избегайте относительных путей `../../../`

## Комментарии

### JSDoc для публичных API

- ✅ Все публичные функции, классы, интерфейсы
- ✅ Описание параметров и возвращаемых значений

```typescript
/**
 * Рассчитывает общую сумму операций за период
 * @param operations - Массив операций
 * @param startDate - Начало периода
 * @param endDate - Конец периода
 * @returns Общая сумма
 */
function calculateTotal(
  operations: Operation[],
  startDate: Date,
  endDate: Date
): number {
  // ...
}
```

### TODO комментарии

- ✅ Формат: `// TODO: описание задачи`
- ✅ Добавляйте контекст и причину

```typescript
// TODO: Добавить кэширование результата в Redis (после оптимизации запроса)
// TODO: Рефакторинг после миграции на новый API формат (v2.0)
```

## Логирование

### Уровни логов

- `error` - критические ошибки
- `warn` - предупреждения
- `info` - информационные сообщения
- `debug` - отладочная информация

### Что логировать

- ✅ Ошибки с полным контекстом
- ✅ Важные бизнес-события (создание операции, генерация отчета)
- ❌ Никогда не логируйте пароли, токены, PII
- ✅ Error объекты можно логировать, если в них нет sensitive данных

```typescript
// ❌ Плохо - логируем все данные пользователя
logger.info('User logged in', user);

// ✅ Хорошо - только необходимый контекст
logger.info('User logged in', {
  userId: user.id,
  companyId: user.companyId,
  timestamp: new Date(),
});

// ✅ Хорошо - логирование ошибок с контекстом
try {
  await seedInitialData(tx, company.id);
} catch (error) {
  // Логируем error объект - это безопасно для технических ошибок
  // Error объекты содержат stack trace и message, не содержат PII
  logger.error('Failed to seed data', { companyId: company.id, error });
  throw new AppError('Failed to initialize company data', 500);
}

// ✅ Также допустимо - логирование статистики и счетчиков
logger.info('Initial data seeded successfully', {
  companyId,
  accounts: accounts.count,
  departments: departments.count,
});
```

## Тестирование

### Unit тесты

- ✅ Один тест на один сценарий
- ✅ Arrange-Act-Assert паттерн
- ✅ Понятные имена тестов: `should return total when operations are valid`

### Мокирование

- ✅ Мокируйте внешние зависимости (БД, API)
- ✅ Используйте Jest mocks, не реальные сервисы в unit тестах

### Coverage

- ✅ Минимум 60% для бизнес-логики
- ✅ 100% для критичных модулей (auth, reports, salary-engine)
