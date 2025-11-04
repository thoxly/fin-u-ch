# DOMAIN_MODEL (English)

Below is a concise entity overview aligned with current code. All entities are multi-tenant via `companyId`.

## Сущности

### Company

- id
- name
- currencyBase
- uiSettings (JSON) - UI preferences: navigation icons, theme, etc.
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
- inn?
- category (enum: supplier|customer|gov|employee|other)
- description?
- createdAt
- updatedAt

### Deal (Сделка)

- id
- companyId
- name
- amount? (planned)
- departmentId?
- counterpartyId?
- description?
- createdAt
- updatedAt

### Article (Статья)

- id
- companyId
- name
- parentId?
- type (enum: income|expense)
- activity (enum: operating|investing|financing)
- indicator (enum: cash|accrual)
- description?
- isActive
- createdAt
- updatedAt

### Operation (Операция факт)

- id
- companyId
- type (income|expense|transfer)
- operationDate
- amount
- currency
- accountId? (для income/expense)
- sourceAccountId? (для transfer)
- targetAccountId? (для transfer)
- articleId?
- counterpartyId?
- dealId?
- departmentId?
- description?
- createdAt
- updatedAt

### Budget (Бюджет)

- id
- companyId
- name
- startDate
- endDate?
- status (enum: active|archived)
- createdAt
- updatedAt

### PlanItem (Плановая запись БДДС)

- id
- companyId
- type (income|expense|transfer)
- startDate
- endDate?
- amount
- currency
- articleId?
- accountId? (для income/expense)
- dealId?
- budgetId? (связь с бюджетом)
- description?
- repeat (enum: daily|weekly|monthly|quarterly|semiannual|annual|none)
- status (enum: active|paused|archived)
- createdAt
- updatedAt

### Salary (Зарплата «правило»)

- id
- companyId
- employeeCounterpartyId (категория employee)
- departmentId?
- baseWage
- contributionsPct (default 30.0)
- incomeTaxPct (default 13.0)
- periodicity (default: monthly)
- effectiveFrom
- effectiveTo?
- createdAt
- updatedAt

### Автоматическая генерация зарплатных операций

**Реализация:** Система автоматически создает операции зарплаты через Worker App без создания служебных записей. Каждая зарплатная запись генерирует 3 операции:

1. ФОТ (начисление зарплаты)
2. Страховые взносы
3. НДФЛ

**Статус:** ✅ Полностью реализовано через Worker App

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

## Ограничения и особенности реализации

### Soft Delete

- Поля `deletedAt` присутствуют в схеме БД, но не используются в сервисах
- Все операции удаления выполняют физическое удаление записей

### Отсутствующие функции

- **Recurrence**: Нет отдельной таблицы для шаблонов повторяющихся операций
- **User Management**: Нет расширенного управления пользователями (роли, права)
- **Import/Export**: Нет импорта банковских выписок или экспорта данных
- **Notifications**: Базовая структура есть, но функционал не реализован

### Реализованные функции

- **Demo System**: Полностью функциональная система демо-данных
- **Worker App**: Автоматическая генерация зарплатных операций
- **Caching**: Redis кэширование для отчетов
- **Reports API**: Все типы отчетов реализованы в API (Dashboard, Cashflow/ОДДС, BDDS, Plan-Fact)
- **Multi-tenancy**: Полная изоляция данных по companyId
- **Notifications System**: Полная система уведомлений с Redux store и UI компонентами
- **UI Customization**: Настройка иконок навигации и тем компании
- **Theme System**: Поддержка светлой/темной темы с автоматическим определением
- **Budget Management**: Полная система управления бюджетами с группировкой плановых записей
- **Plan Matrix Table**: Продвинутый компонент для отображения БДДС с группировкой по видам деятельности

### Частично реализованные функции

- **Dashboard Charts**: График на дашборде помечен как заглушка (recharts подключен, требуется реализация)
- **Plan vs Fact в CashflowTable**: Плановые значения в отчете ОДДС вычисляются как заглушка (TODO комментарии в коде)
- **Article Hierarchy**: Поле parentId есть в схеме, но иерархия не реализована в UI
- **Soft Delete**: Поля есть в схеме, но не используются в сервисах
