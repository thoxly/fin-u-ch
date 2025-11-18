# Style Guide for AI Code Review

Code rules and patterns for the Fin-U-CH project. Used by AI agent for automatic code review in PRs.

## TypeScript Strict Requirements

### No any

- Never use any
- Use unknown for unknown types
- Create specific types/interfaces

```typescript
// BAD
function process(data: any) { ... }

// GOOD
function process(data: unknown) {
  if (isValidData(data)) { ... }
}

// EXCELLENT
interface ProcessData {
  id: string;
  amount: number;
}
function process(data: ProcessData) { ... }
```

### Explicit Return Types

- All functions must have explicit return type
- Especially important for public APIs and service methods
- Return type can be on separate line for long signatures

```typescript
// BAD
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// GOOD
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// GOOD - multiline signature
export async function seedInitialData(
  tx: PrismaClient,
  companyId: string
): Promise<void> {
  // ...
}
```

### Strict Null Checks

- Use strictNullChecks: true in tsconfig.json
- Explicitly handle null and undefined
- Use optional chaining ?. and nullish coalescing ??

```typescript
// BAD
function getUserName(user) {
  return user.name;
}

// GOOD
function getUserName(user: User | null): string {
  return user?.name ?? 'Anonymous';
}
```

## HTTP Requests

### Unified API Client

- All HTTP requests only through shared/api/axios.ts
- Never use direct fetch() or external axios instances
- JWT tokens added automatically via interceptor

```typescript
// BAD
const response = await fetch('/api/operations');

// BAD
import axios from 'axios';
const response = await axios.get('/api/operations');

// GOOD
import { apiClient } from '@/shared/api/axios';
const response = await apiClient.get('/api/operations');
```

## Error Handling

### Try-Catch for Async Operations

- Must wrap all async/await in try-catch
- Log errors with context
- Return clear error messages to user

```typescript
// BAD
async function fetchOperations() {
  const data = await apiClient.get('/api/operations');
  return data;
}

// GOOD
async function fetchOperations(): Promise<Operation[]> {
  try {
    const { data } = await apiClient.get<Operation[]>('/api/operations');
    return data;
  } catch (error) {
    logger.error('Failed to fetch operations', { error });
    throw new Error('Failed to load operations');
  }
}
```

### Error Boundaries in React

- Use Error Boundary components for critical UI blocks
- Show user fallback UI on errors

### Centralized Error Middleware in API

- All errors handled through middlewares/error.ts
- Return correct HTTP statuses:
  - 400 - validation
  - 401 - unauthorized
  - 403 - forbidden
  - 404 - not found
  - 409 - conflict
  - 500 - internal error

## React Patterns

### Hooks Rules

- Hooks only at top level of component
- Never call hooks inside conditions, loops, nested functions

```typescript
// BAD
function Component({ isVisible }) {
  if (isVisible) {
    const [count, setCount] = useState(0); // Error!
  }
}

// GOOD
function Component({ isVisible }) {
  const [count, setCount] = useState(0);

  if (!isVisible) return null;
  return <div>{count}</div>;
}
```

### Functional Components Only

- Use only functional components
- No class-based components

### Props Destructuring

- Destructure props in function signature
- Type props via interface

```typescript
// BAD
function Button(props) {
  return <button onClick={props.onClick}>{props.label}</button>;
}

// GOOD
interface ButtonProps {
  label: string;
  onClick: () => void;
}

function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

### Custom Hooks Naming

- Custom hook names start with use
- Name should reflect purpose: useAuth, useOperations, useDashboard

## Prisma Best Practices

### Type Compatibility

- **Use string literals, not enums** - Prisma returns strings
- Types in shared package must match Prisma schema exactly

```typescript
// BAD - enum incompatible with Prisma
interface Article {
  type: OperationType; // enum
}

// GOOD - string literal matches Prisma
interface Article {
  type: 'income' | 'expense' | 'transfer';
}
```

**After changing types:**

1. Rebuild shared: `cd packages/shared && pnpm run build`
2. Restart dev servers

### Schema Sync

- Always create migrations: `npx prisma migrate dev --name change_name`
- Check sync: `npx prisma migrate status`
- Never use `db push` in production

### CompanyId Filtering

- ALWAYS filter queries by companyId
- Never make queries without tenant filter

```typescript
// BAD - data leakage between companies!
const operations = await prisma.operation.findMany();

// GOOD
const operations = await prisma.operation.findMany({
  where: { companyId },
});
```

### Transactions for Related Operations

- Use $transaction for atomic operations
- Especially important when creating related records
- Try-catch inside transaction is correct pattern for partial error handling

```typescript
// GOOD - basic transaction
await prisma.$transaction([
  prisma.operation.create({ data: operationData }),
  prisma.account.update({
    where: { id: accountId },
    data: { balance: { increment: amount } },
  }),
]);

// GOOD - error handling inside transaction
const result = await prisma.$transaction(async (tx) => {
  const company = await tx.company.create({ data: companyData });
  const user = await tx.user.create({ data: userData });

  // Attempt to create additional data
  // If fails - entire transaction rolls back
  try {
    await seedInitialData(tx, company.id);
  } catch (error) {
    logger.error('Failed to seed data', { companyId: company.id, error });
    throw new AppError('Failed to initialize company data', 500);
  }

  return { user, company };
});
```

### Include/Select for Optimization

- Use select to get only needed fields
- Use include for related data
- Avoid fetching all fields if not needed

```typescript
// BAD - loading everything
const operation = await prisma.operation.findUnique({
  where: { id },
});

// GOOD - only needed fields and relations
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

## Code Simplicity Principle

### Basic Rules

- Code is easier to read than to write
- Linear logic is preferable to nested
- Avoid clever solutions for saving lines
- Comments explain why, not what

### Complexity Metrics

- Cognitive complexity of function: ≤ 10
- Function length: ≤ 40 lines
- Nesting of conditions: ≤ 3 levels
- Naming: self-evident

```typescript
// BAD - nesting and unclear logic
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

// GOOD - early returns, linear logic
function calculateOrderTotal(order: Order | null): number {
  if (!order?.items?.length) return 0;

  return order.items
    .filter((item) => item.price > 0)
    .reduce((sum, item) => sum + item.price, 0);
}
```

## Naming

### Variables and Functions

- camelCase: getUserName, totalAmount
- Verbs for functions: fetchData, calculateTotal, validateInput
- Nouns for variables: userName, orderTotal

### Components and Types

- PascalCase: DashboardPage, OperationForm, User, OrderDTO
- Interface props: ComponentNameProps
- DTOs: CreateOperationDTO, UpdateArticleDTO

### Constants

- UPPER_SNAKE_CASE for global constants: API_BASE_URL, MAX_RETRY_COUNT
- camelCase for local constants: defaultCurrency

## Imports

### Import Order

1. External libraries (React, Express, etc.)
2. Internal project modules
3. Types and interfaces
4. Styles

```typescript
// GOOD
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { apiClient } from '@/shared/api/axios';
import { formatDate } from '@/shared/lib/date';

import { Operation } from '@fin-u-ch/shared';

import './styles.css';
```

### Absolute Paths

- Use aliases from tsconfig: @/, @shared/
- Avoid relative paths ../../../

## Comments

### JSDoc for Public APIs

- All public functions, classes, interfaces
- Description of parameters and return values

```typescript
/**
 * Calculates total sum of operations for period
 * @param operations - Array of operations
 * @param startDate - Period start
 * @param endDate - Period end
 * @returns Total sum
 */
function calculateTotal(
  operations: Operation[],
  startDate: Date,
  endDate: Date
): number {
  // ...
}
```

### TODO Comments

- Format: // TODO: task description
- Add context and reason

```typescript
// TODO: Add result caching in Redis (after query optimization)
// TODO: Refactor after migration to new API format (v2.0)
```

## Logging

### Log Levels

- error - critical errors
- warn - warnings
- info - informational messages
- debug - debug information

### What to Log

- Errors with full context
- Important business events (operation creation, report generation)
- Never log passwords, tokens, PII
- Error objects can be logged if they do not contain sensitive data

```typescript
// BAD - logging all user data
logger.info('User logged in', user);

// GOOD - only necessary context
logger.info('User logged in', {
  userId: user.id,
  companyId: user.companyId,
  timestamp: new Date(),
});

// GOOD - error logging with context
try {
  await seedInitialData(tx, company.id);
} catch (error) {
  // Log error object - safe for technical errors
  // Error objects contain stack trace and message, no PII
  logger.error('Failed to seed data', { companyId: company.id, error });
  throw new AppError('Failed to initialize company data', 500);
}

// GOOD - logging statistics and counters
logger.info('Initial data seeded successfully', {
  companyId,
  accounts: accounts.count,
  departments: departments.count,
});
```

## Testing

### Unit Tests

- One test per scenario
- Arrange-Act-Assert pattern
- Clear test names: should return total when operations are valid

### Mocking

- Mock external dependencies (DB, API)
- Use Jest mocks, not real services in unit tests

### Coverage

- Minimum 60% for business logic
- 100% for critical modules (auth, reports, salary-engine)
