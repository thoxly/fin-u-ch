# Тестирование почтового сервиса перед деплоем

## Быстрая проверка

### 1. Проверка миграции БД

```bash
cd apps/api
npx prisma migrate status
```

Должна быть применена миграция `20251109074332_add_email_verification`.

Если нет, примените:

```bash
npx prisma migrate deploy
npx prisma generate
```

### 2. Проверка переменных окружения

Убедитесь, что в `.env` (в корне проекта) есть:

```env
FRONTEND_URL=https://vect-a.ru
SMTP_HOST=smtp.reg.ru
SMTP_PORT=465
SMTP_USER=no-reply@vect-a.ru
SMTP_PASS=your-password
```

### 3. Запуск тестового скрипта

```bash
cd apps/api
pnpm test:email
```

Или с указанием тестового email:

```bash
TEST_EMAIL=your-email@example.com pnpm test:email
```

Скрипт проверит:

- ✅ Наличие всех переменных окружения
- ✅ Подключение к БД
- ✅ Создание и валидацию токенов
- ✅ Отправку всех типов писем

### 4. Ручная проверка через API

#### Запустите API сервер:

```bash
cd apps/api
pnpm dev
```

#### Тест 1: Регистрация нового пользователя

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "companyName": "Test Company"
  }'
```

**Ожидаемый результат:**

- Пользователь создан
- Письмо подтверждения отправлено на email
- В ответе есть `accessToken` и `refreshToken`

**Проверьте почту** - должно прийти письмо с подтверждением.

#### Тест 2: Подтверждение email

```bash
# Используйте токен из письма
curl -X POST http://localhost:4000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_EMAIL"
  }'
```

**Ожидаемый результат:**

- `{"message": "Email verified successfully"}`

#### Тест 3: Запрос восстановления пароля

```bash
curl -X POST http://localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Ожидаемый результат:**

- `{"message": "If email exists, password reset link has been sent"}`
- Письмо с ссылкой восстановления отправлено

**Проверьте почту** - должно прийти письмо с восстановлением пароля.

#### Тест 4: Сброс пароля

```bash
# Используйте токен из письма восстановления
curl -X POST http://localhost:4000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_FROM_EMAIL",
    "newPassword": "newpassword123"
  }'
```

**Ожидаемый результат:**

- `{"message": "Password reset successfully"}`

#### Тест 5: Повторная отправка письма подтверждения

```bash
curl -X POST http://localhost:4000/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Ожидаемый результат:**

- `{"message": "Verification email sent"}`
- Новое письмо отправлено

### 5. Проверка Rate Limiting

Попробуйте отправить 6 запросов подряд на `/api/auth/forgot-password`:

```bash
for i in {1..6}; do
  curl -X POST http://localhost:4000/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com"}'
  echo ""
done
```

**Ожидаемый результат:**

- Первые 5 запросов: `{"message": "If email exists..."}`
- 6-й запрос: `{"error": "Too many requests. Please try again later."}` (429)

### 6. Проверка Frontend

#### Запустите frontend:

```bash
cd apps/web
pnpm dev
```

#### Проверьте страницы:

1. **Регистрация**: `http://localhost:5173/register`
   - Зарегистрируйте нового пользователя
   - Должно появиться сообщение о письме подтверждения

2. **Подтверждение email**: `http://localhost:5173/verify-email?token=TOKEN`
   - Используйте токен из письма
   - Должно показать успешное подтверждение

3. **Восстановление пароля**: `http://localhost:5173/forgot-password`
   - Введите email
   - Должно показать сообщение об отправке письма

4. **Сброс пароля**: `http://localhost:5173/reset-password?token=TOKEN`
   - Используйте токен из письма
   - Введите новый пароль
   - Должно показать успешное изменение

## Чеклист перед деплоем

- [ ] Миграция БД применена
- [ ] Переменные окружения настроены
- [ ] Тестовый скрипт проходит успешно
- [ ] Все типы писем отправляются корректно
- [ ] Rate limiting работает (5 запросов/час)
- [ ] Токены создаются и валидируются
- [ ] Frontend страницы работают
- [ ] Письма приходят на реальный email
- [ ] Ссылки в письмах ведут на правильный домен (https://vect-a.ru)

## Возможные проблемы

### Письма не отправляются

1. Проверьте SMTP настройки в `.env`
2. Проверьте логи API сервера
3. Убедитесь, что SMTP сервер доступен

### Токены не работают

1. Проверьте, что миграция применена
2. Проверьте подключение к БД
3. Проверьте срок действия токена (30 мин для password reset, 7 дней для email verification)

### Rate limiting не работает

1. Проверьте подключение к Redis
2. Проверьте переменную `REDIS_URL` в `.env`
