# API Documentation

## OpenAPI / Swagger

API автоматически документируется через **swagger-jsdoc** и доступна в интерактивном виде через **swagger-ui-express**.

- **URL документации**: `/api-docs` (в режиме разработки и production).
- **Формат**: OpenAPI 3.0.
- **Генерация**: аннотации JSDoc в контроллерах и роутах автоматически парсятся в OpenAPI спецификацию.

### Пример аннотации:

```javascript
/**
 * @swagger
 * /operations:
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

### Конфигурация:

- Файл конфигурации: `apps/api/src/config/swagger.ts`.
- Включает описание API, версию, сервер, security schemes (JWT).

---

## Authentication

### POST /auth/register

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

### POST /auth/login

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

### POST /auth/refresh

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

**Endpoints:** `GET/POST /articles` | `GET/PATCH/DELETE /articles/:id`

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

**Endpoints:** `GET/POST /accounts` | `GET/PATCH/DELETE /accounts/:id`

**Request Body:**

```json
{
  "name": "string",
  "number": "string",
  "currency": "string",
  "openingBalance": "number",
  "excludeFromTotals": "boolean",
  "isActive": "boolean"
}
```

### Departments

**Endpoints:** `GET/POST /departments` | `GET/PATCH/DELETE /departments/:id`

### Counterparties

**Endpoints:** `GET/POST /counterparties` | `GET/PATCH/DELETE /counterparties/:id`

**Request Body:**

```json
{
  "name": "string",
  "inn": "string",
  "category": "string"
}
```

### Deals

**Endpoints:** `GET/POST /deals` | `GET/PATCH/DELETE /deals/:id`

### Salaries

**Endpoints:** `GET/POST /salaries` | `GET/PATCH/DELETE /salaries/:id`

**Request Body:**

```json
{
  "employeeCounterpartyId": "string",
  "departmentId": "string (optional)",
  "baseWage": "number",
  "contributionsPct": "number",
  "incomeTaxPct": "number",
  "periodicity": "string",
  "effectiveFrom": "date",
  "effectiveTo": "date (optional)"
}
```

## Operations and Planning

### Operations

#### GET /operations

Get operations with filtering options.

**Query Parameters:**

- `type`: string
- `dateFrom`: date
- `dateTo`: date
- `articleId`: string (optional)
- `dealId`: string (optional)
- `departmentId`: string (optional)
- `counterpartyId`: string (optional)

#### POST /operations

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

### Plans

#### GET /plans

Get plans with filtering options.

**Query Parameters:**

- `type`: string
- `dateFrom`: date
- `dateTo`: date
- `articleId`: string (optional)

#### POST /plans

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
  "repeat": "string"
}
```

#### PATCH/DELETE /plans/:id

Update or delete a specific plan.

### Salary Engine

#### POST /salary-engine/run

Generate salary operations (payroll, income tax, contributions).

**Request Body:**

```json
{
  "month": "string"
}
```

## Reports

### Dashboard Report

#### GET /reports/dashboard

Get dashboard analytics.

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
      "balance": "number"
    }
  ],
  "series": [
    {
      "name": "string",
      "data": "number[]"
    }
  ]
}
```

### Cash Flow Report

#### GET /reports/cashflow

Get cash flow statement (fact).

**Query Parameters:**

- `periodFrom`: date
- `periodTo`: date
- `activity`: string (optional)
- `rounding`: number (optional)

**Response:** Cash flow table by months (factual data)

### Cash Flow Budget Report

#### GET /reports/bdds

Get cash flow budget (planned).

**Query Parameters:**

- `periodFrom`: date
- `periodTo`: date
- `rounding`: number (optional)
- `expandHierarchy`: boolean (optional)

**Response:** Cash flow budget table

### Plan vs Fact Report

#### GET /reports/planfact

Get plan vs actual comparison.

**Query Parameters:**

- `periodFrom`: date
- `periodTo`: date
- `level`: "article" | "department" | "deal"

**Response:**

```json
{
  "rows": [
    {
      "key": "string",
      "month": "string",
      "plan": "number",
      "fact": "number",
      "delta": "number"
    }
  ]
}
```
