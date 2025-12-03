# Исправление ошибок TypeScript с Prisma

## Проблема

TypeScript не видит модели `importedOperation`, `importSession`, `mappingRule` и поле `sourceHash` в Prisma Client.

## Решение

### 1. Перегенерировать Prisma Client

```bash
cd /Users/shoxy/Projects/fin-u-ch
pnpm prisma:generate
```

### 2. Перезапустить TypeScript сервер в IDE

**VS Code / Cursor:**

- Нажмите `Cmd+Shift+P` (Mac) или `Ctrl+Shift+P` (Windows/Linux)
- Введите "TypeScript: Restart TS Server"
- Нажмите Enter

**Или через команду:**

```bash
# В VS Code/Cursor откройте Command Palette (Cmd+Shift+P)
# Выберите: "TypeScript: Restart TS Server"
```

### 3. Если проблема сохраняется

Попробуйте:

```bash
# Очистить кэш node_modules
cd /Users/shoxy/Projects/fin-u-ch
rm -rf node_modules/.prisma
rm -rf apps/api/node_modules/.prisma

# Перегенерировать Prisma Client
pnpm prisma:generate

# Перезапустить TypeScript сервер в IDE
```

### 4. Проверить, что Prisma Client правильно импортирован

Убедитесь, что в `apps/api/src/config/db.ts` используется правильный импорт:

```typescript
import { PrismaClient } from '@prisma/client';
```

### 5. Если ничего не помогает

Попробуйте полностью переустановить зависимости:

```bash
cd /Users/shoxy/Projects/fin-u-ch
rm -rf node_modules
rm -rf apps/*/node_modules
pnpm install
pnpm prisma:generate
```

## Проверка

После выполнения шагов, проверьте, что ошибки исчезли:

1. Откройте файл `apps/api/src/modules/imports/imports.service.ts`
2. Проверьте, что TypeScript не показывает ошибки для:
   - `prisma.importedOperation`
   - `prisma.importSession`
   - `prisma.mappingRule`
   - `sourceHash` в запросах к `prisma.operation`

## Примечание

Эти ошибки обычно возникают, когда:

- Prisma Client был сгенерирован, но TypeScript сервер в IDE не обновил кэш
- Или Prisma Client не был правильно сгенерирован

После перезапуска TypeScript сервера ошибки должны исчезнуть.
