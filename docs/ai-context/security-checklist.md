# Security Checklist for AI Code Review

Security checklist adapted for the Fin-U-CH project. Based on OWASP Top 10.

## 1. SQL Injection Prevention

### Prisma Parameterized Queries

- Prisma automatically uses parameterized queries
- Never use raw SQL without parameters
- If raw SQL is necessary, use $queryRaw with placeholders

```typescript
// SAFE - Prisma automatically escapes
const operations = await prisma.operation.findMany({
  where: {
    companyId,
    description: { contains: userInput },
  },
});

// DANGEROUS - SQL injection!
await prisma.$executeRawUnsafe(
  `SELECT * FROM operations WHERE description = '${userInput}'`
);

// SAFE - parameterized raw query
await prisma.$queryRaw`
  SELECT * FROM operations 
  WHERE companyId = ${companyId} 
  AND description LIKE ${`%${userInput}%`}
`;
```

## 2. XSS (Cross-Site Scripting) Prevention

### React Automatic Escaping

- React automatically escapes content
- Use DOMPurify for HTML from external sources
- Prohibit dangerouslySetInnerHTML without sanitization

```typescript
// SAFE - React automatically escapes
function OperationDescription({ description }: Props) {
  return <div>{description}</div>;
}

// DANGEROUS - XSS attack!
function OperationDescription({ description }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: description }} />;
}

// SAFE - with sanitization
import DOMPurify from 'dompurify';

function OperationDescription({ description }: Props) {
  const sanitized = DOMPurify.sanitize(description);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### Input Validation

- Validate all user data
- Use whitelist, not blacklist
- Limit string lengths

## 3. CSRF (Cross-Site Request Forgery) Protection

### SameSite Cookies

- SameSite cookies for refresh token
- CORS settings in API

```typescript
// SAFE cookie configuration
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

### CORS Configuration

- Limit allowed origins list
- Never use origin: '\*' in production

```typescript
// DANGEROUS in production
app.use(cors({ origin: '*' }));

// SAFE
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

- Access token: 15 minutes
- Refresh token: 7 days
- Rotation on use for refresh token

```typescript
// Correct configuration
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

- Access token in memory (React state/Redux)
- Refresh token in httpOnly cookie or secure storage
- Never store tokens in localStorage for sensitive data

### Sensitive Data in JWT

- Never store in JWT:
  - Passwords
  - Secret keys
  - Full user data
  - PII (personally identifiable information)
- Store only:
  - userId
  - companyId
  - role (if applicable)

## 5. Input Validation

### Zod Schemas

- Zod schemas on all input data
- Validation on frontend AND backend
- Reject invalid data with clear message

```typescript
// Good - validation via Zod
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

// In controller
try {
  const validatedData = CreateOperationSchema.parse(req.body);
  // ... processing
} catch (error) {
  return res.status(400).json({
    error: 'Validation failed',
    details: error.errors,
  });
}
```

### File Upload Validation

- Check MIME type
- Limit file size
- Check file extension
- Scan for viruses (if file import implemented)

## 6. Sensitive Data Protection

### Environment Variables

- All secrets in environment variables
- Never commit .env files
- Use .env.example with placeholder values

```bash
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
REDIS_URL=redis://localhost:6379
```

### Logging Sensitive Data

- Do not log:
  - Passwords
  - JWT tokens
  - API keys
  - Full card/account numbers
  - PII (email, phones without masking)

```typescript
// DANGEROUS
logger.info('User login', { email, password });

// SAFE
logger.info('User login', {
  userId: user.id,
  companyId: user.companyId,
});

// SAFE - email masking
logger.info('User registered', {
  email: maskEmail(email), // u***@example.com
});
```

### Password Hashing

- Only bcryptjs for password hashing (pure JavaScript, no native modules)
- Salt rounds: minimum 10
- Never store passwords in plain text

```typescript
// Correct hashing
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

// Verification
const isValid = await bcrypt.compare(inputPassword, user.passwordHash);
```

## 7. Multi-Tenancy Security

### CompanyId Filtering

- ALWAYS check companyId in middleware
- Isolate data at database level (WHERE companyId = ?)
- Never trust companyId from client request

```typescript
// Middleware for extracting companyId
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

  // Set companyId from database, not from request!
  req.companyId = user.companyId;
  next();
}

// In service always filter
async function getOperations(companyId: string) {
  return await prisma.operation.findMany({
    where: { companyId }, // Required!
  });
}
```

### Data Leakage Tests

- Tests for data leakage between tenants
- Check isolation in E2E tests

```typescript
// Test for data isolation
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

- Limit number of requests from single IP
- Different limits for auth endpoints (stricter)

```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: 'Too many requests from this IP',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts
  message: 'Too many login attempts',
});

app.use('/api/', apiLimiter);
app.use('/api/auth', authLimiter);
```

## 9. Dependency Security

### Regular Updates

- Regularly update dependencies
- Use pnpm audit to check vulnerabilities
- Automate checks via Dependabot

```bash
# Check vulnerabilities
pnpm audit

# Automatic fix
pnpm audit fix
```

### Lock Files

- Commit pnpm-lock.yaml
- Use --frozen-lockfile in CI/CD

## 10. Error Messages

### Do Not Expose Internal Structure

- Do not return stack traces in production
- Do not reveal database structure in error messages
- Return general messages to user
- Detailed errors only in logs

```typescript
// DANGEROUS - reveals database structure
catch (error) {
  res.status(500).json({ error: error.message });
}

// SAFE
catch (error) {
  logger.error('Operation failed', { error, userId, companyId });
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.id
  });
}
```

## Checklist for PR Review

When reviewing code check:

- [ ] All Prisma queries filtered by companyId
- [ ] No use of any type
- [ ] Passwords hashed via bcryptjs
- [ ] JWT tokens have correct expiration
- [ ] No secrets in code (using env variables)
- [ ] Input validation via Zod on front and back
- [ ] No dangerouslySetInnerHTML without sanitization
- [ ] CORS configured correctly (not \* in production)
- [ ] Logs do not contain sensitive data
- [ ] Error messages do not reveal internal structure
- [ ] Rate limiting configured for auth endpoints
- [ ] No SQL injection vulnerabilities (raw queries parameterized)
