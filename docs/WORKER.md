# Worker App Documentation

The worker app handles background tasks and scheduled operations for the Fin-U-CH system.

## Overview

The worker app is a separate Node.js application that runs background tasks using node-cron. It's designed to handle time-sensitive operations that should not block the main API.

## Features

### Salary Generation

Automatically generates salary operations for employees based on their salary records.

#### Monthly Salary Generation

**File:** `apps/worker/src/jobs/salary.generate.monthly.ts`

**Functionality:**

- Generates 3 operations per employee per month:
  1. **ФОТ (начисление зарплаты)** - Base wage
  2. **Страховые взносы** - Social contributions (default 30%)
  3. **НДФЛ** - Income tax (default 13%)

**Parameters:**

- `month`: Format YYYY-MM (e.g., "2024-01")
- `companyId`: Optional, generate for specific company only

**Usage:**

```typescript
import { generateSalaryOperations } from './jobs/salary.generate.monthly';

// Generate for current month
await generateSalaryOperations({ month: '2024-01' });

// Generate for specific company
await generateSalaryOperations({
  month: '2024-01',
  companyId: 'company-uuid',
});
```

**Features:**

- Automatic article creation for salary operations
- Transaction-based operation creation
- Error handling with detailed logging
- Support for multiple companies
- Configurable contribution and tax rates

## Configuration

### Environment Variables

The worker app uses the same environment variables as the API:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (optional)
- `NODE_ENV` - Environment (development/production)

### Logging

Uses Winston logger with the same configuration as the API:

- Development: Debug level with console output
- Production: Info level with JSON format

## Architecture

```
apps/worker/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config/
│   │   ├── env.ts           # Environment configuration
│   │   ├── logger.ts        # Winston logger setup
│   │   └── prisma.ts        # Prisma client
│   └── jobs/
│       └── salary.generate.monthly.ts
└── package.json
```

## Dependencies

- **@prisma/client** - Database ORM
- **node-cron** - Task scheduling
- **dotenv** - Environment variables
- **winston** - Logging

## Running the Worker

### Development

```bash
cd apps/worker
pnpm dev
```

### Production

```bash
cd apps/worker
pnpm build
pnpm start
```

## Integration with Main App

The worker app is designed to run independently but shares:

- Database schema (via Prisma)
- Environment configuration
- Logging format
- Business logic for salary calculations

## Future Enhancements

Planned features for future versions:

- Recurring operation generation
- Plan expansion for budget reports
- Automated report generation
- Email notifications
- Webhook integrations

## Monitoring

The worker app logs all operations with:

- Start/end timestamps
- Operation counts
- Error details
- Performance metrics

Monitor logs for:

- Failed salary generations
- Database connection issues
- Performance bottlenecks
- Data inconsistencies
