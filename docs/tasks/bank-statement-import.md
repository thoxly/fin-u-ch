# Тикет: Импорт банковских выписок (формат 1С ClientBankExchange)

## 🎯 Цель

Реализовать функционал импорта банковских выписок из файлов формата 1С ClientBankExchange (.txt) с автоматическим созданием операций в системе, возможностью ручного маппинга данных и сохранения правил для будущих импортов.

**Примечание:** ИИ-модуль не используется на старте, реализация строится на шаблонах, правилах и эвристиках.

---

## 📋 Общее описание

Пользователь должен иметь возможность:

1. Загружать файлы выписок в формате 1С ClientBankExchange
2. Просматривать и редактировать черновики операций перед импортом
3. Сохранять правила маппинга для автоматического сопоставления в будущих импортах
4. Импортировать проверенные операции в основную коллекцию

---

## 🏗️ Архитектурные требования

### Мультитенантность

⚠️ **КРИТИЧЕСКИ ВАЖНО:** Все сущности должны быть изолированы по `companyId`. Использовать middleware `extractTenant` из `apps/api/src/middlewares/tenant.ts` для всех endpoints.

### База данных

- **ORM:** Prisma
- **База:** PostgreSQL
- **Миграции:** Создать миграцию для новых таблиц

### Структура проекта

- **Backend:** `apps/api/src/modules/imports/` (новый модуль)
- **Frontend:** `apps/web/src/features/bank-import/` (новый feature)
- **Shared types:** `packages/shared/src/types/imports.ts`

---

## 🗄️ Модели данных

### 1. ImportSession (сессия импорта)

Группирует черновики операций одного импорта.

```prisma
model ImportSession {
  id            String   @id @default(uuid())
  companyId     String
  userId        String   // кто загрузил
  fileName      String
  status        String   @default("draft") // draft|confirmed|processed|canceled
  importedCount Int      @default(0) // всего строк из файла
  confirmedCount Int     @default(0) // подтверждено пользователем
  processedCount Int     @default(0) // создано операций
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  company           Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  importedOperations ImportedOperation[]

  @@index([companyId, status])
  @@index([companyId, createdAt])
  @@map("import_sessions")
}
```

### 2. ImportedOperation (черновик операции)

Временная запись операции из выписки.

```prisma
model ImportedOperation {
  id                String   @id @default(uuid())
  importSessionId   String
  companyId         String

  // Данные из выписки
  date              DateTime
  number            String?  // номер документа
  amount            Float
  description       String   // НазначениеПлатежа
  direction         String   // income|expense|transfer

  // Плательщик
  payer             String?
  payerInn          String?
  payerAccount      String?  // ПлательщикСчет

  // Получатель
  receiver          String?
  receiverInn       String?
  receiverAccount   String?  // ПолучательСчет

  // Результаты автосопоставления
  matchedArticleId        String?
  matchedCounterpartyId   String?
  matchedAccountId        String?
  matchedBy               String?  // template|fuzzy|manual|null
  matchedRuleId           String?  // ссылка на примененное правило

  // Статусы
  confirmed         Boolean  @default(false)
  processed         Boolean  @default(false)
  draft             Boolean  @default(true)

  // Метаданные
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  importSession     ImportSession @relation(fields: [importSessionId], references: [id], onDelete: Cascade)
  company           Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)

  matchedArticle      Article?      @relation(fields: [matchedArticleId], references: [id], onDelete: SetNull)
  matchedCounterparty Counterparty? @relation(fields: [matchedCounterpartyId], references: [id], onDelete: SetNull)
  matchedAccount      Account?      @relation(fields: [matchedAccountId], references: [id], onDelete: SetNull)
  matchedRule         MappingRule?  @relation(fields: [matchedRuleId], references: [id], onDelete: SetNull)

  @@index([companyId, importSessionId])
  @@index([companyId, confirmed, processed])
  @@index([importSessionId])
  @@map("imported_operations")
}
```

### 3. MappingRule (правило маппинга)

Правила для автоматического сопоставления данных.

```prisma
model MappingRule {
  id          String   @id @default(uuid())
  companyId   String
  userId      String   // кто создал правило

  ruleType    String   // contains|equals|regex|alias
  pattern     String   // текст для поиска
  targetType  String   // article|counterparty|account|operationType
  targetId    String?  // ID сущности (если null, то targetName используется для создания)
  targetName  String?  // читаемое имя для удобства

  sourceField String   @default("description") // description|receiver|payer|inn

  usageCount  Int      @default(0)
  lastUsedAt  DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company           Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  importedOperations ImportedOperation[]

  @@index([companyId, ruleType, sourceField])
  @@index([companyId, targetType])
  @@map("mapping_rules")
}
```

### 4. Company (дополнение)

⚠️ **Требуется добавить поле для хранения ИНН компании** (для определения направления операций):

```prisma
model Company {
  // ... существующие поля
  inn         String?  // ИНН компании для определения направления операций
}
```

---

## 🔄 API Endpoints

### Backend: `apps/api/src/modules/imports/`

#### 1. Загрузка файла и создание сессии

```
POST /api/imports/upload
Content-Type: multipart/form-data

Request:
  file: File (.txt)
  companyId: string (из middleware)

Response:
{
  sessionId: string
  importedCount: number
  fileName: string
}
```

**Логика:**

- Парсит файл формата 1С ClientBankExchange
- Создает `ImportSession` со статусом `draft`
- Для каждой `СекцияДокумент=Платежное поручение` создает `ImportedOperation`
- Применяет автосопоставление (см. раздел "Автосопоставление")
- Возвращает ID сессии и количество созданных записей

#### 2. Получение списка черновиков операции

```
GET /api/imports/sessions/:sessionId/operations
Query params:
  limit?: number (default: 20)
  offset?: number (default: 0)
  confirmed?: boolean
  matched?: boolean (true = только с автосопоставлением, false = только без)

Response:
{
  operations: ImportedOperation[]
  total: number
  confirmed: number
  unmatched: number
}
```

#### 3. Обновление черновика операции

```
PATCH /api/imports/operations/:id

Request:
{
  matchedArticleId?: string | null
  matchedCounterpartyId?: string | null
  matchedAccountId?: string | null
  confirmed?: boolean
  direction?: "income" | "expense" | "transfer"
}

Response: ImportedOperation
```

#### 4. Массовое обновление черновиков

```
PATCH /api/imports/sessions/:sessionId/operations/bulk

Request:
{
  operationIds: string[]
  matchedArticleId?: string | null
  matchedCounterpartyId?: string | null
  matchedAccountId?: string | null
  confirmed?: boolean
}

Response:
{
  updated: number
}
```

#### 5. Применение правил маппинга

```
POST /api/imports/sessions/:sessionId/apply-rules

Response:
{
  applied: number
  updated: number
}
```

#### 6. Импорт операций (создание реальных операций)

```
POST /api/imports/sessions/:sessionId/import

Request:
{
  operationIds?: string[] // если не указано, импортируются все confirmed=true
}

Response:
{
  imported: number
  created: number
  sessionId: string
}
```

**Логика:**

- Берет все `ImportedOperation` с `confirmed=true` из сессии
- Для каждой создает `Operation` в основной таблице
- При необходимости создает новые `Article` или `Counterparty` (если `targetId` был null, но `targetName` указан)
- Обновляет счетчики в `ImportSession`
- Помечает `ImportedOperation` как `processed=true`
- Обновляет `ImportSession.status` на `processed`

#### 7. Отмена импорта

```
DELETE /api/imports/sessions/:sessionId

Response:
{
  deleted: number
}
```

**Логика:**

- Удаляет все `ImportedOperation` сессии
- Удаляет `ImportSession`
- Возвращает количество удаленных записей

#### 8. Управление правилами маппинга

```
GET /api/imports/rules
Query params:
  targetType?: string
  sourceField?: string

Response: MappingRule[]

POST /api/imports/rules
Request:
{
  ruleType: "contains" | "equals" | "regex" | "alias"
  pattern: string
  targetType: "article" | "counterparty" | "account" | "operationType"
  targetId?: string
  targetName?: string
  sourceField?: "description" | "receiver" | "payer" | "inn"
}

Response: MappingRule

PATCH /api/imports/rules/:id
Request: Partial<MappingRule>

DELETE /api/imports/rules/:id
```

#### 9. Получение истории импортов

```
GET /api/imports/sessions
Query params:
  status?: string
  limit?: number
  offset?: number

Response:
{
  sessions: ImportSession[]
  total: number
}
```

---

## 🔍 Логика парсинга файла 1С ClientBankExchange

### Формат файла

Файл содержит секции в формате ключ=значение:

```
1CClientBankExchange
ВерсияФормата=1.03
Кодировка=Windows
Отправитель=Банк
ДатаСоздания=24.10.2025
ВремяСоздания=10:30:00

СекцияДокумент=Платежное поручение
Номер=115
Дата=24.10.2025
Сумма=8263.00
ПлательщикСчет=40702810068000001468
Плательщик=ООО АКСОН
ПлательщикИНН=5262382878
ПлательщикКПП=526201001
ПолучательСчет=03100643000000018500
Получатель=ФНС России
ПолучательИНН=7727406020
ПолучательКПП=0
НазначениеПлатежа=Единый налоговый платеж
КонецДокумента

СекцияДокумент=Платежное поручение
...
КонецДокумента
```

### Реализация парсера

**Файл:** `apps/api/src/modules/imports/parsers/clientBankExchange.parser.ts`

```typescript
interface ParsedDocument {
  date: Date;
  number?: string;
  amount: number;
  payer?: string;
  payerInn?: string;
  payerAccount?: string;
  receiver?: string;
  receiverInn?: string;
  receiverAccount?: string;
  purpose?: string;
}

export function parseClientBankExchange(content: string): ParsedDocument[] {
  // Реализация парсинга
  // 1. Разбить на секции
  // 2. Для каждой "СекцияДокумент=Платежное поручение" извлечь поля
  // 3. Вернуть массив ParsedDocument
}
```

---

## 🎯 Логика автосопоставления

### Определение направления операции

**Файл:** `apps/api/src/modules/imports/services/matching.service.ts`

```typescript
async function determineDirection(
  payerInn: string | null,
  receiverInn: string | null,
  companyInn: string | null
): Promise<'income' | 'expense' | 'transfer'> {
  if (!companyInn) {
    // Если ИНН компании не указан, требуем ручного выбора
    throw new AppError('Company INN not configured', 400);
  }

  if (payerInn === companyInn && receiverInn === companyInn) {
    return 'transfer';
  }
  if (payerInn === companyInn) {
    return 'expense';
  }
  if (receiverInn === companyInn) {
    return 'income';
  }

  // По умолчанию - требует ручного выбора
  throw new AppError('Cannot determine direction', 400);
}
```

### Приоритеты сопоставления

1. **По ИНН контрагента** (100% совпадение)
   - Если `payerInn` или `receiverInn` найдено в `Counterparty.inn` → `matchedCounterpartyId`
2. **По правилам маппинга** (`MappingRule`)
   - Проверка правил по типу `alias` (для контрагентов)
   - Проверка правил по типу `contains`/`equals`/`regex` (для статей по назначению)
3. **По fuzzy match названия контрагента** (если нет ИНН)
   - Использовать библиотеку типа `fuse.js` или `string-similarity`
   - Порог совпадения: ≥ 0.8
4. **По ключевым словам в назначении платежа** (для статей)
   - Предустановленные правила:
     - "налог", "ФНС", "ПФР", "ФСС" → статья "Налоги"
     - "зарплата", "отпускные", "аванс" → статья "Зарплата"
     - "оплата по счету", "выручка" → статья "Выручка от продаж"
5. **По номеру счета** (для счетов)
   - Если `payerAccount` или `receiverAccount` найдено в `Account.number` → `matchedAccountId`

### Реализация автосопоставления

```typescript
async function autoMatch(
  companyId: string,
  operation: ParsedDocument,
  companyInn: string | null
): Promise<{
  matchedArticleId?: string;
  matchedCounterpartyId?: string;
  matchedAccountId?: string;
  matchedBy?: string;
  matchedRuleId?: string;
  direction: 'income' | 'expense' | 'transfer';
}> {
  // 1. Определить направление
  const direction = await determineDirection(
    operation.payerInn,
    operation.receiverInn,
    companyInn
  );

  // 2. Сопоставить контрагента
  const counterparty = await matchCounterparty(companyId, operation);

  // 3. Сопоставить статью
  const article = await matchArticle(companyId, operation, direction);

  // 4. Сопоставить счет
  const account = await matchAccount(companyId, operation, direction);

  return {
    matchedArticleId: article?.id,
    matchedCounterpartyId: counterparty?.id,
    matchedAccountId: account?.id,
    matchedBy:
      counterparty?.matchedBy || article?.matchedBy || account?.matchedBy,
    matchedRuleId: counterparty?.ruleId || article?.ruleId || account?.ruleId,
    direction,
  };
}
```

---

## 🎨 Frontend: UI компоненты

### Структура компонентов

```
apps/web/src/features/bank-import/
├── BankImportModal.tsx          # Модальное окно импорта
├── ImportMappingTable.tsx       # Таблица маппинга
├── ImportMappingRow.tsx         # Строка таблицы (редактируемая)
├── MappingRuleDialog.tsx        # Диалог создания/редактирования правила
├── ImportHistory.tsx            # История импортов
└── hooks/
    ├── useBankImport.ts         # Хук для управления импортом
    └── useMappingRules.ts       # Хук для работы с правилами
```

### 1. Модальное окно импорта

**Компонент:** `BankImportModal.tsx`

**Функционал:**

- Drag-and-drop зона для загрузки файла
- Кнопка выбора файла
- После загрузки → открывается экран маппинга

**Интеграция:**

- Добавить кнопку "Импорт выписки" на странице `OperationsPage.tsx`

### 2. Таблица маппинга

**Компонент:** `ImportMappingTable.tsx`

**Колонки:**

- ☑️ Чекбокс (для массовых операций)
- № (номер документа)
- Дата
- Назначение
- Сумма (форматированная)
- Направление (badge: Доход/Расход/Перевод)
- Контрагент (селект с возможностью создания)
- Статья (селект с возможностью создания)
- Счёт (селект, необязательное)
- Примечание (иконка: шаблон найден ✅, требует внимания ⚠️)

**Функционал:**

- Пагинация (20 строк на страницу)
- Фильтры:
  - "Только несопоставленные"
  - "Показать автозаполненные"
  - "Только подтвержденные"
- Массовые операции:
  - Выделение нескольких строк
  - Кнопка "Применить к выбранным" (контрагент/статья/счет)
- Кнопки:
  - "Автозаполнить по шаблонам"
  - "Импортировать операции" (только confirmed=true)
  - "Отменить"
  - "Экспорт шаблонов" (JSON)

### 3. Редактируемая строка

**Компонент:** `ImportMappingRow.tsx`

**Редактирование:**

- Клик по ячейке → открывается inline-редактор или dropdown
- Селекты используют существующие справочники:
  - `useGetCounterpartiesQuery()`
  - `useGetArticlesQuery()`
  - `useGetAccountsQuery()`
- Кнопка "+ создать" в селектах
- Чекбокс "Сохранить правило" при изменении

### 4. Создание правила маппинга

**Диалог:** `MappingRuleDialog.tsx`

**Поля:**

- Где искать: селект (Назначение платежа / Имя контрагента / ИНН)
- Тип поиска: селект (Содержит / Совпадает / Регулярка / Псевдоним)
- Текст для поиска: input (автоподстановка из текущей строки)
- Сопоставить с: селект (Статья / Контрагент / Счет)
- Выбор значения: селект существующих или input для создания нового

### 5. RTK Query endpoints

**Файл:** `apps/web/src/store/api/importsApi.ts`

```typescript
export const importsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    uploadStatement: builder.mutation<
      { sessionId: string; importedCount: number },
      FormData
    >({
      query: (formData) => ({
        url: '/imports/upload',
        method: 'POST',
        body: formData,
      }),
    }),
    getImportedOperations: builder.query<
      { operations: ImportedOperation[]; total: number },
      { sessionId: string; params?: any }
    >({
      query: ({ sessionId, params }) => ({
        url: `/imports/sessions/${sessionId}/operations`,
        params,
      }),
    }),
    updateImportedOperation: builder.mutation<
      ImportedOperation,
      { id: string; data: Partial<ImportedOperation> }
    >({
      query: ({ id, data }) => ({
        url: `/imports/operations/${id}`,
        method: 'PATCH',
        body: data,
      }),
    }),
    bulkUpdateImportedOperations: builder.mutation<
      { updated: number },
      { sessionId: string; data: any }
    >({
      query: ({ sessionId, data }) => ({
        url: `/imports/sessions/${sessionId}/operations/bulk`,
        method: 'PATCH',
        body: data,
      }),
    }),
    importOperations: builder.mutation<
      { imported: number },
      { sessionId: string; operationIds?: string[] }
    >({
      query: ({ sessionId, operationIds }) => ({
        url: `/imports/sessions/${sessionId}/import`,
        method: 'POST',
        body: { operationIds },
      }),
      invalidatesTags: ['Operation', 'Dashboard', 'Report'],
    }),
    getMappingRules: builder.query<MappingRule[], any>({
      query: (params) => ({
        url: '/imports/rules',
        params,
      }),
    }),
    createMappingRule: builder.mutation<MappingRule, Partial<MappingRule>>({
      query: (data) => ({
        url: '/imports/rules',
        method: 'POST',
        body: data,
      }),
    }),
    // ... остальные endpoints
  }),
});
```

---

## 🔐 Безопасность и валидация

### Валидация файла

- Проверка формата файла (должен начинаться с `1CClientBankExchange`)
- Максимальный размер файла: 10MB
- Максимальное количество операций в файле: 1000
- Проверка кодировки (Windows-1251, UTF-8)

### Валидация данных

- Проверка обязательных полей (дата, сумма)
- Валидация ИНН (10 или 12 цифр)
- Валидация номеров счетов (20 цифр)
- Проверка суммы (должна быть положительным числом)

### Права доступа

- Только аутентифицированные пользователи
- Доступ только к данным своей компании (`companyId` из middleware)
- Логирование всех действий импорта

---

## 📝 Тестирование

### Unit тесты

- Парсер файла 1С ClientBankExchange
- Логика автосопоставления
- Определение направления операции

### Integration тесты

- Endpoints API
- Создание и импорт операций
- Применение правил маппинга

### E2E тесты (Playwright)

- Загрузка файла
- Редактирование маппинга
- Импорт операций

---

## 🚀 Этапы реализации

### Этап 1: База данных и парсинг

- [ ] Создать миграцию для новых таблиц (`ImportSession`, `ImportedOperation`, `MappingRule`)
- [ ] Добавить поле `inn` в модель `Company`
- [ ] Реализовать парсер файла 1С ClientBankExchange
- [ ] Написать unit-тесты для парсера

### Этап 2: Backend API

- [ ] Создать модуль `apps/api/src/modules/imports/`
- [ ] Реализовать сервис автосопоставления
- [ ] Реализовать endpoints для загрузки и управления импортом
- [ ] Реализовать endpoints для управления правилами
- [ ] Написать integration-тесты

### Этап 3: Frontend UI

- [ ] Создать компонент `BankImportModal`
- [ ] Создать компонент `ImportMappingTable`
- [ ] Интегрировать в `OperationsPage`
- [ ] Реализовать создание правил маппинга
- [ ] Добавить историю импортов

### Этап 4: Тестирование и доработка

- [ ] Написать E2E тесты
- [ ] Провести тестирование на реальных данных
- [ ] Оптимизация производительности (для больших файлов)
- [ ] Документация API (Swagger)

---

## 📚 Дополнительные материалы

### Примеры файлов

Создать тестовые файлы в `apps/api/src/modules/imports/__tests__/fixtures/`:

- `sample-statement.txt` - пример корректной выписки
- `sample-statement-large.txt` - большой файл (100+ операций)
- `sample-statement-invalid.txt` - файл с ошибками

### Документация формата 1С

Ссылка на спецификацию формата 1С ClientBankExchange (если доступна)

---

## ⚠️ Важные замечания

1. **Мультитенантность:** Все запросы должны фильтроваться по `companyId`. Использовать middleware `extractTenant` перед всеми роутами.

2. **Производительность:**
   - Для файлов с большим количеством операций использовать пагинацию
   - Массовые обновления выполнять через транзакции
   - Индексы на `companyId` и `importSessionId` обязательны

3. **Откат:** При отмене импорта все черновики должны удаляться без создания операций.

4. **ИНН компании:** Если ИНН компании не указан, система должна требовать ручного выбора направления для каждой операции.

5. **Создание новых сущностей:** При создании новых статей/контрагентов из правил маппинга использовать стандартные DTO и валидацию.

---

## ✅ Критерии приемки

- [ ] Пользователь может загрузить файл выписки формата 1С ClientBankExchange
- [ ] Система автоматически парсит файл и создает черновики операций
- [ ] Система автоматически сопоставляет контрагентов по ИНН
- [ ] Система автоматически сопоставляет статьи по правилам и ключевым словам
- [ ] Пользователь может редактировать маппинг в таблице
- [ ] Пользователь может создавать новые контрагенты и статьи из таблицы маппинга
- [ ] Пользователь может сохранять правила маппинга
- [ ] Правила применяются автоматически при следующем импорте
- [ ] Пользователь может импортировать подтвержденные операции
- [ ] После импорта создаются реальные операции в таблице `operations`
- [ ] Все данные изолированы по `companyId`
- [ ] Реализована пагинация для больших файлов
- [ ] Реализована история импортов

---

**Зависимости:** Требуется добавить поле `inn` в модель `Company`
