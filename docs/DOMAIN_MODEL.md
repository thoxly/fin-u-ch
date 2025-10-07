# DOMAIN_MODEL

## Сущности

### Company

- id
- name
- currency_base
- createdAt
- deletedAt
- updatedAt

### User

- id
- companyId
- email
- passwordHash
- isActive
- createdAt
- deletedAt
- updatedAt

### Account (Счёт)

- id
- companyId
- name
- number
- currency
- openingBalance
- excludeFromTotals (bool)
- isActive
- createdAt
- deletedAt
- updatedAt

### Department (Подразделение)

- id
- companyId
- name
- description
- createdAt
- deletedAt
- updatedAt

### Counterparty (Контрагент)

- id
- companyId
- name
- inn
- category (enum: supplier|customer|gov|employee|other)
- createdAt
- deletedAt
- updatedAt

### Deal (Сделка)

- id
- companyId
- name
- amount (planned)
- departmentId?
- counterpartyId?
- ownerUserId?
- startDate?
- endDate?
- createdAt
- deletedAt
- updatedAt

### Article (Статья)

- id
- companyId
- name
- parentId?
- type (enum: income|expense|transfer)
- activity (enum: operating|investing|financing)
- indicator (enum)
  - для expense: amortization|dividends|taxes|opex|interest|other|cogs|loan_principal|payroll
  - для income: revenue|other_income
- isActive
- createdAt
- deletedAt
- updatedAt

### Operation (Операция факт)

- id
- companyId
- type (income|expense|transfer)
- operationDate
- amount
- currency
- accountId (для transfer: sourceAccountId & targetAccountId)
- articleId
- counterpartyId?
- dealId?
- departmentId?
- description?
- recurrenceId? (если создано из шаблона)
- createdBy
- createdAt
- deletedAt
- updatedAt

### PlanItem (Плановая запись БДДС)

- id
- companyId
- type (income|expense|transfer)
- startDate
- endDate?
- amount
- currency
- articleId
- counterpartyId?
- dealId?
- departmentId?
- description?
- repeat (enum: daily|weekly|monthly|quarterly|semiannual|annual|none)
- accountId/sourceAccountId/targetAccountId (по аналогии с Operation)
- status (enum: active|paused|archived)
- createdAt
- deletedAt
- updatedAt

### Salary (Зарплата «правило»)

- id
- companyId
- employeeCounterpartyId (категория employee)
- departmentId?
- baseWage
- contributionsPct (default 30, editable)
- incomeTaxPct (default 13, editable)
- periodicity (enum: monthly)
- effectiveFrom
- effectiveTo?

### GeneratedSalaryOperation (служебная запись, опционально)

- id
- salaryId
- month
- createdOperationId (expense, payroll + налоги/взносы)
- breakdown (JSON)

## Виды деятельности (activity)

- operating (операционная)
- investing (инвестиционная)
- financing (финансовая)

## Правила и вычисления

### Transfer

- движение между счетами, не влияет на доход/расход, влияет на остатки

### Остатки по счетам

- openingBalance + ∑(income to account) − ∑(expense from account) ± transfers

### Зарплата

- **База**: baseWage
- **Взносы**: baseWage \* contributionsPct/100 (отдельная статья «ФОТ»/«взносы»)
- **НДФЛ**: baseWage \* incomeTaxPct/100 (как отдельная статья «налоги» или уменьшение выплаты «на руки» — выбрать одну модель; для MVP — двумя отдельными расходами: «ФОТ (начисление)» и «НДФЛ»)

### План-факт

- **План** строится из PlanItem (раскрывается в помесячные суммы по правилам repeat)
- **Факт** — из Operation
- **Сравнение** по ключам: период (месяц), articleId, departmentId?, dealId? (гранулярность таблицы настройки)

## Иерархия статей

- Article.parentId формирует древо; «Поступления/Списания/Перевод» — верхний уровень (по type)
- В таблицах план/факт используется тот же справочник (свёртывание по parentId)
