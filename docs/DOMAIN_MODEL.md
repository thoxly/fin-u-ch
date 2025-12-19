# DOMAIN_MODEL (English)

Below is a concise entity overview aligned with current code. All entities are multi-tenant via `companyId`.

## Сущности

### Company

- id
- name
- currencyBase (default: "RUB")
- uiSettings (JSON) - UI preferences: navigation icons, theme, etc.
- inn? (ИНН компании)
- createdAt
- deletedAt?
- updatedAt

### User

- id
- companyId
- email (unique)
- passwordHash
- firstName?
- lastName?
- isActive (default: true)
- isEmailVerified (default: false)
- isSuperAdmin (default: false) - системный администратор
- preferences (JSON) - пользовательские настройки (тема, иконки навигации и т.д.)
- createdAt
- updatedAt

### Account (Счёт)

- id
- companyId
- name
- number?
- currency (default: "RUB")
- openingBalance (default: 0)
- excludeFromTotals (default: false)
- isActive (default: true)
- createdAt
- updatedAt

### Department (Подразделение)

- id
- companyId
- name
- description?
- createdAt
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
- type (enum: income|expense|transfer)
- activity (enum: operating|investing|financing)
- indicator (enum: cash|accrual)
- description?
- isActive
- counterpartyId?
- createdAt
- updatedAt

### Operation (Операция факт)

- id
- companyId
- type (income|expense|transfer)
- operationDate
- amount
- currency (default: "RUB")
- originalAmount? - исходная сумма в другой валюте
- originalCurrency? - исходная валюта
- accountId? (для income/expense)
- sourceAccountId? (для transfer)
- targetAccountId? (для transfer)
- articleId?
- counterpartyId?
- dealId?
- departmentId?
- description?
- **repeat** (enum: none|daily|weekly|monthly|quarterly|semiannual|annual, default: "none") - периодичность повтора операции
- **recurrenceParentId?** - ссылка на родительскую операцию-шаблон для периодических операций
- **recurrenceEndDate?** - дата окончания повторов (если не указана, повторяется бесконечно)
- **isConfirmed** (boolean, default: true) - флаг подтверждения операции
- **isTemplate** (boolean, default: false) - флаг шаблона операции
- **sourceHash?** - хеш для определения дубликатов
- createdAt
- updatedAt

**Бизнес-логика периодических операций:**

- Операция с `repeat !== 'none'` и `recurrenceParentId === null` является шаблоном для генерации периодических операций
- Worker job запускается ежедневно в 00:01 и создает новые операции на основе шаблонов
- Сгенерированные операции имеют `isConfirmed = false` и требуют ручного подтверждения
- Неподтвержденные операции отображаются в списке (с желтым фоном), но не учитываются в отчетах
- При подтверждении через endpoint `PATCH /api/operations/:id/confirm` операция становится видимой в отчетах

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
- currency (default: "RUB")
- articleId?
- accountId? (для income/expense)
- dealId?
- budgetId? (связь с бюджетом)
- description?
- repeat (enum: daily|weekly|monthly|quarterly|semiannual|annual|none, default: "none")
- status (enum: active|paused|archived, default: "active")
- createdAt
- updatedAt

### EmailToken (Токены для email операций)

- id
- userId
- token (unique)
- type - тип токена (email_verification, password_reset, email_change_old, email_change_new)
- expiresAt
- used (default: false)
- metadata? (JSON) - дополнительная информация
- createdAt
- updatedAt

**Назначение:** Хранение токенов для верификации email, сброса пароля и смены email адреса.

### ImportSession (Сессия импорта банковских выписок)

- id
- companyId
- userId
- fileName
- status (default: "draft") - статус сессии (draft, processing, completed, failed)
- importedCount (default: 0) - количество импортированных операций
- confirmedCount (default: 0) - количество подтвержденных операций
- processedCount (default: 0) - количество обработанных операций
- companyAccountNumber? - номер счета компании из выписки
- createdAt
- updatedAt

**Назначение:** Управление сессиями импорта банковских выписок.

### ImportedOperation (Импортированная операция)

- id
- importSessionId
- companyId
- date
- number?
- amount
- description
- direction? (income|expense|transfer)
- payer?
- payerInn?
- payerAccount?
- receiver?
- receiverInn?
- receiverAccount?
- currency (default: "RUB")
- matchedArticleId? - сопоставленная статья
- matchedCounterpartyId? - сопоставленный контрагент
- matchedAccountId? - сопоставленный счет
- matchedDealId? - сопоставленная сделка
- matchedDepartmentId? - сопоставленное подразделение
- matchedBy? - способ сопоставления (rule, manual, auto)
- matchedRuleId? - ID правила сопоставления
- confirmed (default: false)
- processed (default: false)
- draft (default: true)
- repeat (default: "none")
- lockedFields? (JSON) - заблокированные поля
- duplicateOfId? - ID дубликата
- isDuplicate (default: false)
- createdAt
- updatedAt

**Назначение:** Временное хранение операций из банковских выписок до их подтверждения и импорта.

### MappingRule (Правило сопоставления для импорта)

- id
- companyId
- userId
- ruleType - тип правила (contains, equals, regex, alias)
- pattern - паттерн для сопоставления
- targetType - тип цели (article, counterparty, account, operationType)
- targetId? - ID целевого объекта
- targetName? - название целевого объекта
- sourceField (default: "description") - поле источника (description, receiver, payer, inn)
- usageCount (default: 0) - количество использований
- lastUsedAt?
- createdAt
- updatedAt

**Назначение:** Автоматическое сопоставление импортированных операций со справочниками.

### Role (Роль пользователя)

- id
- companyId
- name
- description?
- category? - категория роли
- isSystem (default: false) - системная роль (нельзя удалить/изменить)
- isActive (default: true)
- deletedAt? - мягкое удаление
- createdAt
- updatedAt

**Назначение:** Управление ролями пользователей в рамках компании.

### RolePermission (Права доступа роли)

- id
- roleId
- entity - сущность (operations, articles, budgets, users и т.д.)
- action - действие (create, read, update, delete, confirm, manage_roles и т.д.)
- allowed (default: true)
- createdAt
- updatedAt

**Назначение:** Определение прав доступа для ролей.

### UserRole (Связь пользователя и роли)

- id
- userId
- roleId
- assignedAt (default: now())
- assignedBy? - ID пользователя, который назначил роль

**Назначение:** Многие-ко-многим связь между пользователями и ролями.

### Subscription (Подписка компании)

- id
- companyId (unique)
- plan (enum: START|TEAM|BUSINESS, default: START)
- status (enum: ACTIVE|PAST_DUE|CANCELED|TRIAL, default: ACTIVE)
- startDate (default: now())
- endDate? - дата окончания (null для вечных/бесплатных)
- trialEndsAt? - дата окончания триала
- promoCode? - промокод, по которому активирована подписка
- createdAt
- updatedAt

**Назначение:** Управление подписками и тарифными планами компаний.

### PromoCode (Промокод)

- id
- code (unique)
- plan (enum: START|TEAM|BUSINESS)
- durationDays? - длительность триала/подписки (null = вечно)
- maxUsages? - лимит использования (null = безлимит)
- usedCount (default: 0)
- isActive (default: true)
- expiresAt?
- createdAt

**Назначение:** Промокоды для активации подписок и триалов.

### AuditLog (Журнал аудита)

- id
- companyId
- userId
- action - действие (create, update, delete, confirm и т.д.)
- entity - тип сущности (operation, budget, article, user и т.д.)
- entityId - ID сущности
- changes? (JSON) - изменения (до/после)
- metadata? (JSON) - дополнительная информация
- createdAt

**Назначение:** Логирование всех действий пользователей для аудита и отладки.

## Виды деятельности (activity)

- operating (операционная)
- investing (инвестиционная)
- financing (финансовая)

## Правила и вычисления

### Transfer

- движение между счетами, не влияет на доход/расход, влияет на остатки

### Остатки по счетам

- openingBalance + ∑(income to account) − ∑(expense from account) ± transfers

### План-факт

- **План** строится из PlanItem (раскрывается в помесячные суммы по правилам repeat)
- **Факт** — из Operation
- **Сравнение** по ключам: период (месяц), articleId, departmentId?, dealId? (гранулярность таблицы настройки)

## Иерархия статей

- Article.parentId формирует древо; «Поступления/Списания/Перевод» — верхний уровень (по type)
- В таблицах план/факт используется тот же справочник (свёртывание по parentId)
- **UI реализация**: Полностью реализована в интерфейсе через компоненты ArticleTree, ArticleTreeNode, ArticleParentSelect с поддержкой drag-and-drop для изменения родителя, поиском по дереву и двумя режимами отображения (дерево/таблица)

## Ограничения и особенности реализации

### Soft Delete

- Поля `deletedAt` присутствуют в схеме БД, но не используются в сервисах
- Все операции удаления выполняют физическое удаление записей

### Отсутствующие функции

- **Recurrence**: Полностью реализована через поле repeat в Operation (компонент RecurringOperations для управления шаблонами, автоматическая генерация через Worker job operations.generate.recurring.ts)

### Реализованные функции

- **Demo System**: Полностью функциональная система демо-данных
- **Worker App**: Автоматическая генерация периодических операций
- **Caching**: Redis кэширование для отчетов
- **Reports API**: Все типы отчетов реализованы в API (Dashboard, Cashflow/ОДДС, BDDS, Plan-Fact)
- **Multi-tenancy**: Полная изоляция данных по companyId
- **Notifications System**: Полная система уведомлений с Redux store и UI компонентами
- **UI Customization**: Настройка иконок навигации и тем компании
- **Theme System**: Поддержка светлой/темной темы с автоматическим определением
- **Budget Management**: Полная система управления бюджетами с группировкой плановых записей
- **Plan Matrix Table**: Продвинутый компонент для отображения БДДС с группировкой по видам деятельности
- **User Management**: Полная система управления пользователями с ролями и правами доступа
- **Role-Based Access Control (RBAC)**: Система ролей и прав доступа на уровне сущностей и действий
- **Import System**: Полная система импорта банковских выписок с автоматическим сопоставлением и правилами маппинга
- **Mapping Rules**: Полная система настройки правил маппинга для импорта (MappingRule модель, типы правил: contains, equals, regex, alias, UI компоненты MappingRules и MappingRuleDialog)
- **Support Integration**: Интеграция с поддержкой через Telegram бот (SupportService, отправка сообщений в Telegram группу)
- **Ozon Integration**: Интеграция с Ozon для автоматической загрузки операций и выплат (UI компонент OzonIntegration, настройка API ключей, выбор статей и счетов)
- **Audit Logging**: Система логирования всех действий пользователей
- **Subscription System**: Система подписок и тарифных планов с промокодами
- **Email Verification**: Система верификации email и сброса пароля
- **Password Reset**: Система сброса пароля через email токены

### Частично реализованные функции

- **Soft Delete**: Поля deletedAt есть в схеме для Company, User, Account, Department, Role, но не используются в сервисах (выполняется физическое удаление)
