# Worker

Background jobs runner for scheduled tasks (cron) and manual triggers.

## Overview

- Entrypoint: `src/index.ts`
- Jobs: `src/jobs/*`
- Config:
  - `src/config/env.ts` — environment variables loader/validation (requires `DATABASE_URL`)
  - `src/config/prisma.ts` — Prisma client setup
  - `src/config/logger.ts` — Winston logger

## Environment

Required variables (loaded from monorepo `.env`):

- `DATABASE_URL` — PostgreSQL connection string
- `NODE_ENV` — defaults to `development`

Refer to the root `env.example` for full configuration.

## Jobs

### Salary generation (monthly)

- File: `src/jobs/salary.generate.monthly.ts`
- Purpose: For each active `Salary` record, creates three expense operations for the given month:
  1. Wage (base salary)
  2. Contributions (insurance)
  3. Income tax (personal income tax)
- Articles are created on-demand if missing: "Зарплата", "Страховые взносы", "НДФЛ".

## Schedule

- Defined in `src/index.ts` via `node-cron`:
  - CRON: `0 0 1 * *` — runs on the 1st day of each month at 00:00 (timezone `Europe/Moscow`).
  - On run, calls `generateSalaryOperations({ month: YYYY-MM })`.

## Manual run

You can trigger the job manually from code/tests by calling:

```ts
import { runSalaryGenerationManually } from './src/index';
await runSalaryGenerationManually('2025-10'); // YYYY-MM, optional
```

## Run locally

- Start prerequisites (PostgreSQL): see `docs/DEV_GUIDE.md`.
- Generate Prisma client if needed (usually via postinstall):

```bash
cd apps/api
pnpm prisma:generate
```

- Run the worker in dev mode (hot reload depends on your process manager):

```bash
cd apps/worker
pnpm dev
```

The worker logs will indicate:

- Database connection established
- Cron task scheduled

## Graceful shutdown

`SIGINT`/`SIGTERM` handlers stop cron tasks and disconnect Prisma before exit.

## Notes

- The worker expects valid `Salary` records and at least one active `Account` per company to create operations.
- Multi-tenancy: all generated operations are scoped by `companyId`.
