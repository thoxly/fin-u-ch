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
  "isActive": "boolean",
  "counterpartyId": "string (optional)"
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
- `isConfirmed`: boolean (optional) - Filter by confirmation status

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
  "articleId": "string",
  "repeat": "string (optional)",
  "recurrenceEndDate": "date (optional)"
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
  "targetAccountId": "string",
  "repeat": "string (optional)",
  "recurrenceEndDate": "date (optional)"
}
```

**Recurring Operations Fields:**

- `repeat`: Periodicity of recurring operations
  - Possible values: `none` (default), `daily`, `weekly`, `monthly`, `quarterly`, `semiannual`, `annual`
- `recurrenceEndDate`: Optional end date for recurring operations. If not specified, operations repeat indefinitely.

**Recurring Operations Behavior:**

- When `repeat` is set to value other than `none`, the operation becomes a template for generating recurring operations
- A worker job runs daily at 00:01 and creates new operations based on templates
- Generated operations are marked as unconfirmed (`isConfirmed: false`) and require manual confirmation
- Unconfirmed operations appear in the list but are not included in reports

#### PATCH /api/operations/:id/confirm

Confirm a pending operation. This marks the operation as confirmed and includes it in all reports.

**Response:**

```json
{
  "id": "string",
  "isConfirmed": true
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

**Frontend Status:** ✅ All major components are fully implemented

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

## Roles and Permissions

### GET /api/roles

Get all roles for company.

**Requires:** `users:manage_roles` permission

**Response:**

```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "category": "string",
    "isSystem": "boolean",
    "isActive": "boolean"
  }
]
```

### GET /api/roles/category/:category

Get roles by category.

**Requires:** `users:manage_roles` permission

### GET /api/roles/:id

Get role by ID.

**Requires:** `users:manage_roles` permission

### POST /api/roles

Create a new role.

**Requires:** `users:manage_roles` permission

**Request Body:**

```json
{
  "name": "string",
  "description": "string",
  "category": "string"
}
```

### PUT /api/roles/:id

Update role.

**Requires:** `users:manage_roles` permission

### DELETE /api/roles/:id

Delete role (soft delete).

**Requires:** `users:manage_roles` permission

### GET /api/roles/:id/permissions

Get role permissions.

**Requires:** `users:manage_roles` permission

### PUT /api/roles/:id/permissions

Update role permissions.

**Requires:** `users:manage_roles` permission

**Request Body:**

```json
{
  "permissions": [
    {
      "entity": "string",
      "action": "string",
      "allowed": "boolean"
    }
  ]
}
```

### GET /api/users/:id/permissions

Get user permissions.

**Response:**

```json
{
  "operations": {
    "create": true,
    "read": true,
    "update": false,
    "delete": false
  }
}
```

---

## Audit Logs

### GET /api/audit-logs

Get audit logs with filtering.

**Requires:** `audit:read` permission

**Query Parameters:**

- `userId` - Filter by user ID
- `entity` - Filter by entity type (operation, budget, article, etc.)
- `entityId` - Filter by entity ID
- `action` - Filter by action (create, update, delete, etc.)
- `dateFrom` - Start date
- `dateTo` - End date
- `limit` - Number of records (default: 100)
- `offset` - Offset (default: 0)

**Response:**

```json
[
  {
    "id": "string",
    "userId": "string",
    "action": "string",
    "entity": "string",
    "entityId": "string",
    "changes": {},
    "metadata": {},
    "createdAt": "string"
  }
]
```

### GET /api/audit-logs/entity/:entity/:entityId

Get audit logs for specific entity.

**Requires:** `audit:read` permission

---

## Bank Statement Imports

### POST /api/imports/upload

Upload bank statement file (.txt format, ClientBank Exchange).

**Request:** `multipart/form-data` with `file` field

**Response:**

```json
{
  "sessionId": "string",
  "fileName": "string",
  "operationsCount": 0
}
```

### GET /api/imports/sessions

Get import sessions history.

**Query Parameters:**

- `status` - Filter by status
- `limit` - Number of records
- `offset` - Offset

### GET /api/imports/sessions/:sessionId

Get import session information.

### DELETE /api/imports/sessions/:sessionId

Delete import session.

### GET /api/imports/sessions/:sessionId/operations

Get imported operations from session.

**Query Parameters:**

- `confirmed` - Filter by confirmed status
- `matched` - Filter by matched status
- `processed` - Filter by processed status
- `limit` - Number of records
- `offset` - Offset

### PATCH /api/imports/operations/:id

Update imported operation.

**Request Body:**

```json
{
  "matchedArticleId": "string",
  "matchedCounterpartyId": "string",
  "matchedAccountId": "string",
  "confirmed": "boolean",
  "direction": "income|expense|transfer"
}
```

### PATCH /api/imports/sessions/:sessionId/operations/bulk

Bulk update imported operations.

**Request Body:**

```json
{
  "operationIds": ["string"],
  "matchedArticleId": "string",
  "matchedCounterpartyId": "string",
  "matchedAccountId": "string",
  "confirmed": "boolean"
}
```

### POST /api/imports/sessions/:sessionId/apply-rules

Apply mapping rules to session.

### POST /api/imports/sessions/:sessionId/import

Import operations (create real operations).

**Request Body:**

```json
{
  "operationIds": ["string"]
}
```

### GET /api/imports/rules

Get mapping rules.

**Query Parameters:**

- `targetType` - Filter by target type
- `sourceField` - Filter by source field

### POST /api/imports/rules

Create mapping rule.

**Request Body:**

```json
{
  "ruleType": "contains|equals|regex|alias",
  "pattern": "string",
  "targetType": "article|counterparty|account|operationType",
  "targetId": "string",
  "targetName": "string",
  "sourceField": "description|receiver|payer|inn"
}
```

### PATCH /api/imports/rules/:id

Update mapping rule.

### DELETE /api/imports/rules/:id

Delete mapping rule.

### GET /api/imports/stats/total-imported

Get total count of imported operations.

---

## Subscription

### GET /api/subscription/current

Get current subscription plan and limits.

**Response:**

```json
{
  "plan": "START|TEAM|BUSINESS",
  "status": "ACTIVE|PAST_DUE|CANCELED|TRIAL",
  "startDate": "string",
  "endDate": "string",
  "trialEndsAt": "string",
  "promoCode": "string",
  "limits": {
    "maxUsers": 10,
    "features": ["string"]
  },
  "userLimit": {
    "current": 5,
    "max": 10,
    "remaining": 5,
    "isUnlimited": false
  }
}
```

### POST /api/subscription/activate-promo

Activate promo code.

**Request Body:**

```json
{
  "promoCode": "string"
}
```

---

## Support

### POST /api/support/telegram

Send support request to Telegram group.

**Request Body:**

```json
{
  "subject": "string",
  "message": "string",
  "email": "string"
}
```

---

## Modules overview (routing prefixes)

Defined in `apps/api/src/app.ts`:

- `/api/auth` - Authentication (login, register, refresh, email verification, password reset)
- `/api/users` - User management (profile, preferences, invitations, roles assignment)
- `/api/companies` - Company management (including UI settings, currency)
- `/api/articles` - Articles catalog
- `/api/accounts` - Accounts catalog
- `/api/departments` - Departments catalog
- `/api/counterparties` - Counterparties catalog
- `/api/deals` - Deals catalog
- `/api/salaries` - Salaries catalog
- `/api/operations` - Financial operations (CRUD, bulk delete, confirm)
- `/api/budgets` - Budget management
- `/api/plans` - Budget planning (PlanItem with budgetId support)
- `/api/reports` - Financial reports (dashboard, cashflow, bdds, planfact, cache management)
- `/api/roles` - Roles and permissions management
- `/api/audit-logs` - Audit logs (action history)
- `/api/imports` - Bank statement imports (upload, mapping rules, sessions)
- `/api/subscription` - Subscription management (plans, promo codes)
- `/api/support` - Support integration (Telegram)
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
