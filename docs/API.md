# API Documentation

## OpenAPI / Swagger

The API is documented via **swagger-jsdoc** and served with **swagger-ui-express**.

- **Swagger UI**: `/api-docs` (both development and production)
- **Format**: OpenAPI 3.0
- **Generation**: JSDoc annotations in route files are compiled into the OpenAPI spec

### JSDoc annotation example

```javascript
/**
 * @swagger
 * /api/operations:
 *   get:
 *     summary: Get all operations
 *     tags: [Operations]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of operations
 */
```

### Configuration

- Config file: `apps/api/src/config/swagger.ts`
- Includes API info, servers, and security schemes (JWT bearer)

---

## Base URL and Health

- All endpoints are prefixed with `/api` (see `apps/api/src/app.ts`).
- Health check: `GET /api/health` → `{ status: "ok", timestamp: "..." }`

## Security

- Authentication uses JWT bearer tokens.
- Most endpoints require `Authorization: Bearer <accessToken>`.
- Public endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`.

---

## Authentication

### POST /api/auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "string",
  "password": "string",
  "companyName": "string"
}
```

**Response:**

```json
{
  "tokens": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

### POST /api/auth/login

Authenticate user and get tokens.

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**

```json
{
  "tokens": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "string"
}
```

**Response:**

```json
{
  "tokens": {
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

## Reference Data

### Articles

**Endpoints:** `GET/POST /api/articles` | `GET/PATCH/DELETE /api/articles/:id`

**Request Body:**

```json
{
  "name": "string",
  "parentId": "string (optional)",
  "type": "string",
  "activity": "string",
  "indicator": "string",
  "isActive": "boolean"
}
```

### Accounts

**Endpoints:** `GET/POST /api/accounts` | `GET/PATCH/DELETE /api/accounts/:id`

**Request Body:**

```json
{
  "name": "string",
  "number": "string (optional)",
  "currency": "string (default: RUB)",
  "openingBalance": "number (default: 0)",
  "excludeFromTotals": "boolean (default: false)",
  "isActive": "boolean (default: true)"
}
```

**Response includes:** account relationships with operations (source/target for transfers)

### Departments

**Endpoints:** `GET/POST /api/departments` | `GET/PATCH/DELETE /api/departments/:id`

**Request Body:**

```json
{
  "name": "string",
  "description": "string (optional)"
}
```

**Response includes:** department relationships with deals, operations, and salaries

### Counterparties

**Endpoints:** `GET/POST /api/counterparties` | `GET/PATCH/DELETE /api/counterparties/:id`

**Request Body:**

```json
{
  "name": "string",
  "inn": "string (optional)",
  "category": "string (supplier|customer|gov|employee|other)",
  "description": "string (optional)"
}
```

**Response includes:** counterparty relationships with deals, operations, and salaries

### Deals

**Endpoints:** `GET/POST /api/deals` | `GET/PATCH/DELETE /api/deals/:id`

**Request Body:**

```json
{
  "name": "string",
  "amount": "number (optional)",
  "departmentId": "string (optional)",
  "counterpartyId": "string (optional)",
  "description": "string (optional)"
}
```

**Response includes:** deal relationships with department, counterparty, operations, and plan items

### Salaries

**Endpoints:** `GET/POST /api/salaries` | `GET/PATCH/DELETE /api/salaries/:id`

**Request Body:**

```json
{
  "employeeCounterpartyId": "string",
  "departmentId": "string (optional)",
  "baseWage": "number",
  "contributionsPct": "number (default: 30.0)",
  "incomeTaxPct": "number (default: 13.0)",
  "periodicity": "string (default: monthly)",
  "effectiveFrom": "date",
  "effectiveTo": "date (optional)"
}
```

**Response includes:** salary relationships with employee counterparty and department

**Note:** Salaries are automatically processed by the worker app to generate monthly salary operations (wage, contributions, income tax).

**Implementation Status:** ✅ Fully implemented - Worker app generates 3 operations per salary record monthly.

## Operations and Planning

### Operations

#### GET /api/operations

Get operations with filtering options.

**Query Parameters:**

- `type`: string
- `dateFrom`: date
- `dateTo`: date
- `articleId`: string (optional)
- `dealId`: string (optional)
- `departmentId`: string (optional)
- `counterpartyId`: string (optional)

#### POST /api/operations

Create a new operation.

**Income/Expense Request Body:**

```json
{
  "type": "string",
  "operationDate": "date",
  "amount": "number",
  "currency": "string",
  "accountId": "string",
  "articleId": "string"
}
```

**Transfer Request Body:**

```json
{
  "type": "transfer",
  "operationDate": "date",
  "amount": "number",
  "currency": "string",
  "sourceAccountId": "string",
  "targetAccountId": "string"
}
```

### Budgets

#### GET /api/budgets

Get all budgets with filtering options.

**Query Parameters:**

- `status`: string (optional) - Filter by status (active|archived)

**Response:**

```json
[
  {
    "id": "string",
    "name": "string",
    "startDate": "date",
    "endDate": "date (optional)",
    "status": "string",
    "_count": {
      "planItems": "number"
    }
  }
]
```

#### GET /api/budgets/:id

Get budget by ID with plan items count.

#### POST /api/budgets

Create a new budget.

**Request Body:**

```json
{
  "name": "string",
  "startDate": "date",
  "endDate": "date (optional)"
}
```

#### PATCH /api/budgets/:id

Update budget.

**Request Body:**

```json
{
  "name": "string",
  "startDate": "date",
  "endDate": "date (optional)",
  "status": "string (active|archived)"
}
```

#### DELETE /api/budgets/:id

Delete budget (only if no plan items exist).

### Plans

#### GET /api/plans

Get plans with filtering options.

**Query Parameters:**

- `type`: string
- `dateFrom`: date
- `dateTo`: date
- `articleId`: string (optional)
- `budgetId`: string (optional) - Filter by budget

#### POST /api/plans

Create a new plan.

**Request Body:**

```json
{
  "type": "string",
  "startDate": "date",
  "endDate": "date (optional)",
  "amount": "number",
  "currency": "string",
  "articleId": "string",
  "accountId": "string (or sourceAccountId/targetAccountId)",
  "budgetId": "string (optional)",
  "repeat": "string"
}
```

#### PATCH/DELETE /api/plans/:id

Update or delete a specific plan.

### Demo System

#### GET /api/demo/credentials

Get demo user credentials (public endpoint).

**Response:**

```json
{
  "email": "demo@example.com",
  "password": "demo123",
  "companyName": "Демо-компания"
}
```

#### GET /api/demo/info

Get information about the demo user and generated data.

**Response:**

```json
{
  "user": {
    "id": "string",
    "email": "string",
    "companyId": "string"
  },
  "company": {
    "id": "string",
    "name": "string"
  },
  "operationsCount": "number",
  "accountsCount": "number",
  "articlesCount": "number",
  "counterpartiesCount": "number"
}
```

#### GET /api/demo/exists

Check if demo user exists.

**Response:**

```json
{
  "exists": true
}
```

#### POST /api/demo/create

Create a demo user with sample data.

**Response:**

```json
{
  "user": {
    "id": "string",
    "email": "string",
    "companyId": "string"
  },
  "company": {
    "id": "string",
    "name": "string"
  },
  "operationsCount": "number",
  "accountsCount": "number",
  "articlesCount": "number",
  "counterpartiesCount": "number"
}
```

#### DELETE /api/demo/delete

Delete the demo user and all associated data.

**Response:**

```json
{
  "message": "Demo user and all related data deleted successfully"
}
```

## Reports

**Implementation Status:** ✅ All report endpoints are fully implemented and working.

**Frontend Status:** ⚠️ Some frontend components have placeholder implementations:

- Dashboard charts are placeholders (requires recharts integration)
- Plan vs Fact calculations in CashflowTable use placeholder logic

**UI/UX Features:** ✅ Fully implemented:

- Complete notification system with Redux store and UI components
- Dark/light theme support with automatic detection
- Navigation icon customization
- Company UI settings management
- Responsive design for all devices
- Comprehensive form system with validation
- Modal and offcanvas systems
- Table system with sorting and actions

### Dashboard Report

#### GET /api/reports/dashboard

Get dashboard analytics.

**Implementation Status:** ✅ Fully implemented - Returns income, expense, net profit, account balances, and time series data.

**Query Parameters:**

- `periodFrom`: date
- `periodTo`: date
- `mode`: "plan" | "fact" | "both"

**Response:**

```json
{
  "income": "number",
  "expense": "number",
  "netProfit": "number",
  "balancesByAccount": [
    {
      "accountId": "string",
      "accountName": "string",
      "balance": "number"
    }
  ],
  "series": [
    {
      "month": "string",
      "income": "number",
      "expense": "number"
    }
  ]
}
```

### Cash Flow Report

#### GET /api/reports/cashflow

Get cash flow report by activity types.

**Query Parameters:**

- `periodFrom`: date
- `periodTo`: date
- `activity`: "operating" | "investing" | "financing" (optional)
- `rounding`: number (optional, rounding unit)

**Response:**

```json
{
  "periodFrom": "string",
  "periodTo": "string",
  "activities": [
    {
      "activity": "string",
      "incomeGroups": [...],
      "expenseGroups": [...],
      "totalIncome": "number",
      "totalExpense": "number",
      "netCashflow": "number"
    }
  ]
}
```

### Budget Report (BDDS)

#### GET /api/reports/bdds

Get budget report with planned operations.

**Query Parameters:**

- `periodFrom`: date
- `periodTo`: date

**Response:**

```json
[
  {
    "articleId": "string",
    "articleName": "string",
    "type": "string",
    "months": [
      {
        "month": "string",
        "amount": "number"
      }
    ],
    "total": "number"
  }
]
```

### Plan-Fact Analysis

#### GET /api/reports/planfact

Compare planned vs actual operations.

**Query Parameters:**

- `periodFrom`: date
- `periodTo`: date
- `level`: "article" | "department" | "deal"

**Response:**

```json
[
  {
    "month": "string",
    "key": "string",
    "name": "string",
    "plan": "number",
    "fact": "number",
    "delta": "number"
  }
]
```

### Detailed Cash Flow (DDS)

#### GET /api/reports/dds

Returns a detailed cash flow statement with account balances and flows.

**Query Parameters:**

- `periodFrom`: date
- `periodTo`: date
- `accountId`: string (optional)
- `limit`: number (optional, default 10000)
- `offset`: number (optional, default 0)

**Response:**

```json
{
  "accounts": [
    {
      "accountId": "string",
      "accountName": "string",
      "openingBalance": "number",
      "closingBalance": "number"
    }
  ],
  "inflows": [...],
  "outflows": [...],
  "summary": {
    "totalInflow": "number",
    "totalOutflow": "number",
    "netCashflow": "number"
  }
}
```

---

### Company UI Settings

#### GET /api/companies/ui-settings

Get company UI settings (theme, navigation icons, etc.).

**Response:**

```json
{
  "navigationIcons": {
    "dashboard": "string",
    "operations": "string",
    "plans": "string",
    "reports": "string"
  },
  "theme": "light"
}
```

#### PUT /api/companies/ui-settings

Update company UI settings.

**Request Body:**

```json
{
  "navigationIcons": {
    "dashboard": "string",
    "operations": "string",
    "plans": "string",
    "reports": "string"
  },
  "theme": "dark"
}
```

**Response:**

```json
{
  "navigationIcons": {
    "dashboard": "string",
    "operations": "string",
    "plans": "string",
    "reports": "string"
  },
  "theme": "dark"
}
```

---

## Modules overview (routing prefixes)

Defined in `apps/api/src/app.ts`:

- `/api/auth` - Authentication (login, register, refresh)
- `/api/users` - User management
- `/api/companies` - Company management (including UI settings)
- `/api/articles` - Articles catalog
- `/api/accounts` - Accounts catalog
- `/api/departments` - Departments catalog
- `/api/counterparties` - Counterparties catalog
- `/api/deals` - Deals catalog
- `/api/salaries` - Salaries catalog
- `/api/operations` - Financial operations
- `/api/budgets` - Budget management (new)
- `/api/plans` - Budget planning (enhanced with budgetId support)
- `/api/reports` - Financial reports (dashboard, cashflow, bdds, dds, planfact)
- `/api/demo` - Demo system (credentials, create, info, exists, delete)

Use Swagger UI at `/api-docs` for the authoritative, up-to-date contract.

---

## Worker App

The Worker App is a separate Node.js application that handles background tasks and scheduled jobs.

### Salary Generation

The worker automatically generates salary operations every month on the 1st at 00:00 (Moscow time).

**Generated Operations:**

- **Wage Operation**: Base salary amount (expense)
- **Contributions Operation**: Insurance contributions (expense, calculated as baseWage × contributionsPct/100)
- **Income Tax Operation**: Personal income tax (expense, calculated as baseWage × incomeTaxPct/100)

**Automatic Article Creation:**
The worker automatically creates required articles if they don't exist:

- "Зарплата" (Wage)
- "Страховые взносы" (Insurance Contributions)
- "НДФЛ" (Personal Income Tax)

**Features:**

- Multi-tenant support (generates for all companies or specific company)
- Transaction-based operations creation
- Detailed logging with structured output
- Graceful shutdown handling
- Database connection validation

**Manual Execution:**

```typescript
// For testing purposes
await runSalaryGenerationManually('2025-01'); // Generate for specific month
```

**Configuration:**

- **Cron Schedule**: `0 0 1 * *` (1st of each month at 00:00)
- **Timezone**: Europe/Moscow
- **Logging**: Winston logger with structured logging
- **Database**: Uses same Prisma client as main API
