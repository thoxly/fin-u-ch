# Security Checklist для AI Code Review

Чеклист безопасности адаптированный под проект Fin-U-CH. Основан на OWASP Top 10.

## 1. SQL Injection Prevention

### Prisma Parameterized Queries

- ✅ Prisma автоматически использует параметризованные запросы
- ❌ Никогда не используйте raw SQL без параметров
- ⚠️ Если необходим raw SQL - используйте `$queryRaw` с плейсхолдерами

```typescript
// ✅ Безопасно - Prisma автоматически экранирует
const operations = await prisma.operation.findMany({
  where: {
    companyId,
    description: { contains: userInput },
  },
});

// ❌ ОПАСНО - SQL injection!
await prisma.$executeRawUnsafe(
  `SELECT * FROM operations WHERE description = '${userInput}'`
);

// ✅ Безопасно - параметризованный raw query
await prisma.$queryRaw`
  SELECT * FROM operations 
  WHERE companyId = ${companyId} 
  AND description LIKE ${`%${userInput}%`}
`;
```

## 2. XSS (Cross-Site Scripting) Prevention

### React Automatic Escaping

- ✅ React автоматически экранирует содержимое
- ⚠️ DOMPurify для HTML из внешних источников
- ❌ Запрет `dangerouslySetInnerHTML` без sanitization

```typescript
// ✅ Безопасно - React автоматически экранирует
function OperationDescription({ description }: Props) {
  return <div>{description}</div>;
}

// ❌ ОПАСНО - XSS атака!
function OperationDescription({ description }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: description }} />;
}

// ✅ Безопасно - с санитизацией
import DOMPurify from 'dompurify';

function OperationDescription({ description }: Props) {
  const sanitized = DOMPurify.sanitize(description);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### Input Validation

- ✅ Валидируйте все пользовательские данные
- ✅ Используйте whitelist, не blacklist
- ✅ Ограничивайте длину строк

## 3. CSRF (Cross-Site Request Forgery) Protection

### SameSite Cookies

- ✅ SameSite cookies для refresh token
- ✅ CORS настройки в API

```typescript
// ✅ Безопасная настройка cookie
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
});
```

### CORS Configuration

- ✅ Ограничьте список разрешенных origin
- ❌ Никогда не используйте `origin: '*'` в production

```typescript
// ❌ ОПАСНО в production
app.use(cors({ origin: '*' }));

// ✅ Безопасно
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
```

## 4. JWT Best Practices

### Token Expiration

- ✅ Access token: 15 минут
- ✅ Refresh token: 7 дней
- ✅ Rotation on use для refresh token

```typescript
// ✅ Правильная конфигурация
const accessToken = jwt.sign({ userId, companyId }, JWT_SECRET, {
  expiresIn: '15m',
});

const refreshToken = jwt.sign(
  { userId, companyId, tokenVersion },
  JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

### Token Storage

- ✅ Access token в памяти (React state/Redux)
- ✅ Refresh token в httpOnly cookie или secure storage
- ❌ Никогда не храните токены в localStorage для чувствительных данных

### Sensitive Data in JWT

- ❌ Никогда не храните в JWT:
  - Пароли
  - Секретные ключи
  - Полные данные пользователя
  - PII (personally identifiable information)
- ✅ Храните только:
  - userId
  - companyId
  - role (если есть)

## 5. Input Validation

### Zod Schemas

- ✅ Zod schemas на всех входных данных
- ✅ Валидация на фронтенде И бэкенде
- ✅ Отклонение невалидных данных с понятным сообщением

```typescript
// ✅ Хорошо - валидация через Zod
import { z } from 'zod';

const CreateOperationSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  operationDate: z.string().datetime(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  accountId: z.string().uuid(),
  articleId: z.string().uuid(),
  description: z.string().max(500).optional(),
});

// В контроллере
try {
  const validatedData = CreateOperationSchema.parse(req.body);
  // ... обработка
} catch (error) {
  return res.status(400).json({
    error: 'Validation failed',
    details: error.errors,
  });
}
```

### File Upload Validation

- ✅ Проверяйте MIME type
- ✅ Ограничивайте размер файла
- ✅ Проверяйте расширение файла
- ✅ Сканируйте на вирусы (если импорт файлов реализован)

## 6. Sensitive Data Protection

### Environment Variables

- ✅ Все секреты в переменных окружения
- ❌ Никогда не коммитьте `.env` файлы
- ✅ Используйте `.env.example` с placeholder значениями

```bash
# ✅ .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
REDIS_URL=redis://localhost:6379
```

### Logging Sensitive Data

- ❌ Не логируйте:
  - Пароли
  - JWT токены
  - API ключи
  - Полные номера карт/счетов
  - PII (email, телефоны без маскировки)

```typescript
// ❌ ОПАСНО
logger.info('User login', { email, password });

// ✅ Безопасно
logger.info('User login', {
  userId: user.id,
  companyId: user.companyId,
});

// ✅ Безопасно - маскировка email
logger.info('User registered', {
  email: maskEmail(email), // u***@example.com
});
```

### Password Hashing

- ✅ Только **bcryptjs** для хеширования паролей (pure JavaScript, без нативных модулей)
- ✅ Salt rounds: минимум 10
- ❌ Никогда не храните пароли в plain text

```typescript
// ✅ Правильное хеширование
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

// Проверка
const isValid = await bcrypt.compare(inputPassword, user.passwordHash);
```

## 7. Multi-Tenancy Security

### CompanyId Filtering

- ✅ **ВСЕГДА** проверяйте `companyId` в middleware
- ✅ Изолируйте данные на уровне БД (WHERE companyId = ?)
- ❌ Никогда не доверяйте companyId из клиентского запроса

```typescript
// ✅ Middleware для извлечения companyId
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Устанавливаем companyId из БД, не из запроса!
  req.companyId = user.companyId;
  next();
}

// ✅ В сервисе всегда фильтруем
async function getOperations(companyId: string) {
  return await prisma.operation.findMany({
    where: { companyId }, // Обязательно!
  });
}
```

### Data Leakage Tests

- ✅ Тесты на data leakage между тенантами
- ✅ Проверка изоляции в E2E тестах

```typescript
// ✅ Тест на изоляцию данных
describe('Multi-tenant isolation', () => {
  it('should not return operations from other company', async () => {
    const company1Operations = await createOperations(company1Id);
    const company2Operations = await createOperations(company2Id);

    const result = await getOperations(company1Id);

    expect(result).toHaveLength(company1Operations.length);
    expect(result.every((op) => op.companyId === company1Id)).toBe(true);
  });
});
```

## 8. API Rate Limiting

### Express Rate Limit

- ✅ Ограничьте количество запросов с одного IP
- ✅ Разные лимиты для auth endpoints (строже)

```typescript
// ✅ Rate limiting
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // 100 запросов
  message: 'Too many requests from this IP',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 попыток входа
  message: 'Too many login attempts',
});

app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);
```

## 9. Dependency Security

### Regular Updates

- ✅ Регулярно обновляйте зависимости
- ✅ Используйте `pnpm audit` для проверки уязвимостей
- ✅ Автоматизируйте проверку через Dependabot

```bash
# Проверка уязвимостей
pnpm audit

# Автоматическое исправление
pnpm audit fix
```

### Lock Files

- ✅ Коммитьте `pnpm-lock.yaml`
- ✅ Используйте `--frozen-lockfile` в CI/CD

## 10. Error Messages

### Не раскрывайте внутреннюю структуру

- ❌ Не возвращайте stack traces в production
- ❌ Не раскрывайте структуру БД в сообщениях об ошибках
- ✅ Возвращайте общие сообщения пользователю
- ✅ Детальные ошибки только в логах

```typescript
// ❌ ОПАСНО - раскрывает структуру БД
catch (error) {
  res.status(500).json({ error: error.message });
}

// ✅ Безопасно
catch (error) {
  logger.error('Operation failed', { error, userId, companyId });
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id
  });
}
```

## Checklist для PR Review

При ревью кода проверяйте:

- [ ] Все Prisma запросы фильтруются по `companyId`
- [ ] Нет использования `any` типа
- [ ] Пароли хешируются через bcryptjs
- [ ] JWT токены имеют правильный expiration
- [ ] Нет секретов в коде (используются env variables)
- [ ] Input validation через Zod на фронте и бэке
- [ ] Нет `dangerouslySetInnerHTML` без sanitization
- [ ] CORS настроен правильно (не `*` в production)
- [ ] Логи не содержат sensitive data
- [ ] Error messages не раскрывают внутреннюю структуру
- [ ] Rate limiting настроен для auth endpoints
- [ ] Нет SQL injection уязвимостей (raw queries параметризованы)
