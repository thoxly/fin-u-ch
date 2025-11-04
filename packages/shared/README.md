# Shared Package

This package contains shared types, constants, and schemas used across the Fin-U-CH applications.

## Overview

The shared package provides:

- TypeScript type definitions
- Domain enums and constants
- Validation schemas
- Common interfaces

## Structure

```
packages/shared/
├── src/
│   ├── types/              # TypeScript interfaces
│   │   ├── auth.ts        # Authentication types
│   │   ├── catalogs.ts    # Catalog entity types
│   │   ├── operations.ts   # Operation and plan types
│   │   ├── reports.ts      # Report response types
│   │   └── notifications.ts # Notification types
│   ├── constants/
│   │   ├── config.ts      # Configuration constants
│   │   └── enums.ts       # Domain enums
│   ├── schemas/
│   │   └── notifications.ts # Zod validation schemas
│   └── index.ts           # Main export file
└── package.json
```

## Types

### Authentication (`types/auth.ts`)

- User authentication interfaces
- JWT token types
- Login/register DTOs

### Catalogs (`types/catalogs.ts`)

- Article, Account, Department interfaces
- Counterparty, Deal types
- Salary configuration types

### Operations (`types/operations.ts`)

- Operation and PlanItem interfaces
- Create/Update DTOs
- Monthly amount types

### Reports (`types/reports.ts`)

- Dashboard report structure
- Cash flow report types
- Plan-fact analysis interfaces

## Constants

### Enums (`constants/enums.ts`)

- `OperationType`: income, expense, transfer
- `Activity`: operating, investing, financing
- `CounterpartyCategory`: supplier, customer, gov, employee, other
- `Periodicity`: none, daily, weekly, monthly, quarterly, semiannual, annual
- `PlanStatus`: active, paused, archived
- `ArticleIndicator`: Various indicators for expense and income articles

### Configuration (`constants/config.ts`)

- Application-wide configuration values
- Default settings
- Environment-specific constants

## Usage

### In API App

```typescript
import { OperationType, Activity } from '@fin-u-ch/shared';
import type { Operation, CreateOperationDTO } from '@fin-u-ch/shared';
```

### In Web App

```typescript
import { OperationType } from '@fin-u-ch/shared';
import type { DashboardReport } from '@fin-u-ch/shared';
```

### In Worker App

```typescript
import { Periodicity } from '@fin-u-ch/shared';
import type { PlanItem } from '@fin-u-ch/shared';
```

## Development

### Building

```bash
pnpm build
```

### Watching for Changes

```bash
pnpm dev
```

### Type Checking

```bash
pnpm type-check
```

## Dependencies

- **zod** - Runtime validation schemas
- **typescript** - TypeScript compiler

## Versioning

The shared package follows semantic versioning. Breaking changes to types require:

1. Major version bump
2. Update all consuming applications
3. Migration guide for type changes

## Best Practices

1. **Type Safety**: All types should be properly exported and documented
2. **Backward Compatibility**: Avoid breaking changes in minor versions
3. **Documentation**: Each type should have JSDoc comments
4. **Validation**: Use Zod schemas for runtime validation
5. **Consistency**: Follow the same naming conventions across all types
