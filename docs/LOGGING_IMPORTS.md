# Логирование при загрузке выписки

## Где смотреть логи

### Локальная разработка (API запущен через `pnpm dev`)

Логи выводятся в консоль, где запущен API сервер.

### Docker окружение

Если API запущен в Docker контейнере:

```bash
# Логи API контейнера
docker logs -f fin-u-ch-api

# Или через docker-compose
cd ops/docker
docker compose logs -f api

# Последние 100 строк логов
docker logs --tail 100 fin-u-ch-api

# Логи с фильтрацией по ключевым словам
docker logs fin-u-ch-api 2>&1 | grep -i "upload\|import\|statement"
```

## Что логируется

### 1. Контроллер (`imports.controller.ts`)

- **Начало загрузки**: `Upload statement request received`
  - fileName, fileSize, companyId, userId

- **Успешное завершение**: `Upload statement completed successfully`
  - sessionId, importedCount, duplicatesCount, fileName, companyId

- **Ошибка**: `Upload statement failed`
  - fileName, companyId, userId, error, stack

### 2. Сервис (`imports.service.ts`)

- **Начало парсинга**: `Starting file parse`
  - fileName, fileSize, preview

- **Парсинг завершен**: `File parsed successfully`
  - fileName, documentsCount, companyAccountNumber

- **Ошибка парсинга**: `File parsing failed`
  - fileName, error, stack

- **Проверка дубликатов**: `Checking for duplicates`
  - fileName, totalDocuments, companyId

- **Дубликаты найдены**: `Duplicate check completed`
  - fileName, totalDocuments, duplicatesCount, uniqueDocumentsCount

- **Создание сессии**: `Creating import session` и `Import session created`
  - fileName, companyId, userId, documentsCount, sessionId

- **Обработка батчей**: `Starting batch processing`
  - sessionId, fileName, totalBatches, batchSize, totalDocuments

- **Батч обработан**: `Batch processed successfully` (debug уровень)
  - sessionId, fileName, batchNumber, batchSize, totalProcessed

- **Обработка завершена**: `Batch processing completed`
  - sessionId, fileName, totalBatches, totalProcessed

- **Итоговый результат**: `Upload statement processing completed`
  - sessionId, fileName, companyId, importedCount, duplicatesCount, parseStats

### 3. Парсер (`clientBankExchange.parser.ts`)

- Детальное логирование процесса парсинга файла
- Логирование найденных документов
- Логирование ошибок парсинга отдельных строк

## Примеры логов

### Успешная загрузка

```
2024-01-15 10:30:15 [info]: Upload statement request received {"fileName":"statement.txt","fileSize":12345,"companyId":"...","userId":"..."}
2024-01-15 10:30:15 [info]: Starting file parse {"fileName":"statement.txt","fileSize":12345,"preview":"..."}
2024-01-15 10:30:16 [info]: File parsed successfully {"fileName":"statement.txt","documentsCount":150,"companyAccountNumber":"..."}
2024-01-15 10:30:16 [info]: Checking for duplicates {"fileName":"statement.txt","totalDocuments":150,"companyId":"..."}
2024-01-15 10:30:16 [info]: Duplicate check completed {"fileName":"statement.txt","totalDocuments":150,"duplicatesCount":5,"uniqueDocumentsCount":145}
2024-01-15 10:30:16 [info]: Creating import session {"fileName":"statement.txt","companyId":"...","userId":"...","documentsCount":150}
2024-01-15 10:30:16 [info]: Import session created {"sessionId":"...","fileName":"statement.txt","companyId":"..."}
2024-01-15 10:30:16 [info]: Starting batch processing {"sessionId":"...","fileName":"statement.txt","totalBatches":2,"batchSize":100,"totalDocuments":150}
2024-01-15 10:30:17 [info]: Batch processing completed {"sessionId":"...","fileName":"statement.txt","totalBatches":2,"totalProcessed":145}
2024-01-15 10:30:17 [info]: Upload statement processing completed {"sessionId":"...","fileName":"statement.txt","companyId":"...","importedCount":145,"duplicatesCount":5}
2024-01-15 10:30:17 [info]: Upload statement completed successfully {"sessionId":"...","importedCount":145,"duplicatesCount":5,"fileName":"statement.txt","companyId":"..."}
```

### Ошибка парсинга

```
2024-01-15 10:30:15 [info]: Upload statement request received {"fileName":"invalid.txt","fileSize":5000,"companyId":"...","userId":"..."}
2024-01-15 10:30:15 [info]: Starting file parse {"fileName":"invalid.txt","fileSize":5000,"preview":"..."}
2024-01-15 10:30:15 [error]: File parsing failed {"fileName":"invalid.txt","error":"Invalid file format: file must contain \"1CClientBankExchange\" in the first lines","stack":"..."}
2024-01-15 10:30:15 [error]: Upload statement failed {"fileName":"invalid.txt","companyId":"...","userId":"...","error":"Invalid file format...","stack":"..."}
```

## Фильтрация логов

### Поиск логов загрузки выписки

```bash
# Все логи связанные с импортом
docker logs fin-u-ch-api 2>&1 | grep -i "upload\|import\|statement"

# Только ошибки
docker logs fin-u-ch-api 2>&1 | grep -i "error.*upload\|error.*import"

# Логи конкретной сессии
docker logs fin-u-ch-api 2>&1 | grep "sessionId.*<your-session-id>"
```

### Поиск в файле логов (если логи пишутся в файл)

```bash
# Если логи пишутся в файл
tail -f /var/log/api.log | grep -i "upload\|import"

# Поиск по времени
grep "2024-01-15 10:30" /var/log/api.log | grep -i "upload"
```

## Уровни логирования

- **info**: Основные события (загрузка, завершение, создание сессии)
- **debug**: Детальная информация (обработка батчей, парсинг)
- **warn**: Предупреждения (пропущенные документы, невалидные данные)
- **error**: Ошибки (ошибки парсинга, ошибки обработки)

## Настройка уровня логирования

В файле `apps/api/src/config/logger.ts`:

```typescript
level: env.NODE_ENV === 'production' ? 'info' : 'debug';
```

- В production: только `info`, `warn`, `error`
- В development: все уровни включая `debug`
