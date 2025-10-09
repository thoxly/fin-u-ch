# ENV Workflow - Как это работает

## 🔄 Рабочий процесс ENV файлов

### Схема работы

```
┌─────────────────────────────────────────────────────────────┐
│                         GITHUB                              │
│  ┌───────────────────────────────────────────────────┐      │
│  │  env.example (в репозитории)                      │      │
│  │  ────────────────────────────────────────────     │      │
│  │  # Шаблон с примерами (БЕЗ реальных секретов)    │      │
│  │  DATABASE_URL=postgresql://postgres:postgres@...  │      │
│  │  JWT_SECRET=your-secret-here                      │      │
│  │  VITE_API_URL=http://localhost:4000               │      │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓ git clone
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  ЛОКАЛЬНАЯ МАШИНА                           │
│                                                             │
│  ┌────────────────────────────────────────────┐            │
│  │  env.example (скопирован из Git)           │            │
│  └────────────────────────────────────────────┘            │
│                      ↓ cp env.example .env                 │
│  ┌────────────────────────────────────────────┐            │
│  │  .env (ваш личный файл, НЕ в Git)          │            │
│  │  ──────────────────────────────────────    │            │
│  │  # Реальные данные для ВАШЕЙ машины        │            │
│  │  DATABASE_URL=postgresql://postgres:...    │            │
│  │  JWT_SECRET=abc123real...                  │            │
│  │  VITE_API_URL=http://localhost:4000        │            │
│  └────────────────────────────────────────────┘            │
│                      ↓ используется приложением            │
│  ┌────────────────────────────────────────────┐            │
│  │  API, Web, Worker читают из .env           │            │
│  └────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Пошаговое объяснение

### Шаг 1: Что в Git

```bash
# В репозитории Git ЕСТЬ:
✅ env.example         # Шаблон (безопасно коммитить)

# В репозитории Git НЕТ:
❌ .env                # Личный файл (в .gitignore)
❌ .env.local
❌ .env.development
❌ .env.staging
❌ .env.production
```

### Шаг 2: Новый разработчик клонирует проект

```bash
git clone https://github.com/user/fin-u-ch.git
cd fin-u-ch

# Что он получает:
# ✅ env.example - есть (из Git)
# ❌ .env - НЕТ (не в Git)
```

### Шаг 3: Создание локального .env

```bash
# Копирует шаблон в свой .env
cp env.example .env

# Теперь у него:
# ✅ env.example - шаблон (не трогаем)
# ✅ .env - личный файл (редактируем)
```

### Шаг 4: Редактирование .env

```bash
# Открывает .env
nano .env

# Для локальной разработки:
# - Можно оставить значения как есть (они рабочие)
# - Или изменить под свои нужды

# Для staging/production:
# - Получить реальные credentials от команды
# - Заменить примеры на реальные значения
```

### Шаг 5: Приложение читает .env

```bash
# API, Web, Worker используют .env
pnpm dev

# dotenv.config() загружает переменные из .env
# НЕ из env.example!
```

## 🔐 Безопасность

### ✅ env.example (в Git)

```env
# Безопасно - НЕ содержит реальных секретов
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev
JWT_SECRET=your-secret-here-change-in-production
VITE_API_URL=http://localhost:4000
```

### ❌ .env (НЕ в Git)

```env
# ОПАСНО если попадет в Git - содержит РЕАЛЬНЫЕ секреты
DATABASE_URL=postgresql://prod_user:Str0ngP@ssw0rd@db.example.com:5432/production_db
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
VITE_API_URL=https://api.example.com
```

## 📤 Когда нужно обновить env.example

### Добавили новую переменную в проект?

```bash
# 1. Добавьте в env.example с ПРИМЕРОМ (не реальным значением)
echo "NEW_FEATURE_FLAG=false" >> env.example

# 2. Закоммитьте в Git
git add env.example
git commit -m "Add NEW_FEATURE_FLAG to env.example"

# 3. Другие разработчики получат обновление
git pull
# Увидят что нужна новая переменная
# Добавят её в свой .env
```

## 🤝 Обмен credentials в команде

### ❌ НЕ ДЕЛАЙТЕ ТАК:

```bash
# НЕ отправляйте .env через:
❌ Email
❌ Slack/Telegram
❌ Git commit
❌ Публичные каналы
```

### ✅ ДЕЛАЙТЕ ТАК:

```bash
# Используйте безопасные каналы:
✅ 1Password / Bitwarden (secure notes)
✅ HashiCorp Vault
✅ AWS Secrets Manager
✅ GitHub Secrets (для CI/CD)
✅ Безопасный корпоративный чат (encrypted)
```

## 🔄 Workflow для разных окружений

### Локальная разработка

```bash
# Достаточно скопировать env.example
cp env.example .env
# Значения уже рабочие для локального Docker!
```

### Staging

```bash
# 1. Получите credentials от DevOps
# 2. Создайте .env.staging
cp env.example .env.staging

# 3. Замените на реальные значения staging
nano .env.staging

# 4. Переключитесь
pnpm env:staging
```

### Production

```bash
# 1. Получите credentials от тимлида
# 2. Создайте .env.production
cp env.example .env.production

# 3. Замените на реальные продакшн значения
nano .env.production

# 4. Переключитесь
pnpm env:prod
```

## 📚 FAQ

### Q: Зачем нужен env.example если есть .env?

**A:** `env.example` - это документация! Он показывает:

- Какие переменные нужны проекту
- Какой формат они должны иметь
- Примеры значений для локальной разработки

### Q: Почему .env не в Git?

**A:** Безопасность! `.env` содержит реальные секреты:

- Пароли от БД
- API ключи
- JWT секреты
- Если попадет в Git → утечка данных!

### Q: Откуда новый разработчик узнает credentials?

**A:** Зависит от окружения:

- **Локально:** из `env.example` (готовые значения)
- **Staging/Prod:** от команды (безопасное хранилище)

### Q: Что если я случайно закоммитил .env?

**A:** Немедленно:

1. Удалите файл из Git: `git rm --cached .env`
2. Добавьте в .gitignore
3. Смените ВСЕ секреты (БД пароли, JWT, API ключи)
4. Force push (если еще не в main): `git push --force`
5. Сообщите команде

### Q: Можно ли держать разные env.example для окружений?

**A:** Нет необходимости. Один `env.example` содержит ВСЕ переменные с комментариями для каждого окружения:

```env
# Локально:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_u_ch_dev

# Production (пример):
# DATABASE_URL=postgresql://user:pass@prod-db:5432/fin_u_ch
```

## ✅ Checklist для новых разработчиков

- [ ] Склонировал проект: `git clone ...`
- [ ] Проверил что есть `env.example` в проекте
- [ ] Скопировал: `cp env.example .env`
- [ ] Проверил что `.env` в `.gitignore`
- [ ] Запустил: `pnpm env:current`
- [ ] Для локальной разработки - оставил значения как есть
- [ ] Для staging/prod - получил credentials от команды
- [ ] Готово! ✨

## 🔗 Связанная документация

- [ENV Setup Guide](ENV_SETUP.md) - Полное руководство
- [ENV Cheatsheet](ENV_CHEATSHEET.md) - Быстрая шпаргалка
- [ENV Hot Reload](ENV_HOT_RELOAD.md) - Горячая перезагрузка

---

**Итог:** `env.example` - это шаблон в Git, `.env` - ваши личные данные локально!
