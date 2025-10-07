# GIT_GUIDE

Короткий и практичный гид по работе с Git в проекте Fin-U-CH. Без воды, только команды и правила.

---

## 🌳 Git Flow

```
feature/<task> → dev → main → production
     ↓            ↓      ↓
  develop      test   deploy
```

**Основные ветки:**

- `main` — production-ready код (защищена, только через PR)
- `dev` — integration ветка для разработки
- `feature/*` — фичи и багфиксы
- `hotfix/*` — срочные исправления для production

---

## 🚀 Быстрый старт

### Клонирование проекта

```bash
git clone <repo-url>
cd fin-u-ch
pnpm install  # установит husky hooks автоматически
```

### Начало работы над задачей

```bash
# Переключиться на dev и обновить
git checkout dev
git pull origin dev

# Создать feature ветку
git checkout -b feature/add-operations-filter

# Альтернативно: одной командой
git checkout dev && git pull && git checkout -b feature/add-operations-filter
```

**Naming convention для веток:**

- `feature/` — новый функционал (`feature/add-planfact-report`)
- `fix/` — исправление бага (`fix/operations-date-validation`)
- `refactor/` — рефакторинг (`refactor/extract-salary-logic`)
- `docs/` — изменения в документации (`docs/update-api-guide`)
- `hotfix/` — срочный фикс для production (`hotfix/security-jwt-leak`)

---

## 📝 Коммиты (Conventional Commits)

Формат коммита строгий — проверяется через husky hook:

```
<type>(<scope>): <subject>
```

### Типы (types)

| Тип        | Описание                                  | Пример                                     |
| ---------- | ----------------------------------------- | ------------------------------------------ |
| `feat`     | Новый функционал                          | `feat(api): add filtering by date range`   |
| `fix`      | Исправление бага                          | `fix(web): resolve dashboard crash`        |
| `docs`     | Изменения в документации                  | `docs: update git workflow guide`          |
| `style`    | Форматирование, без изменений в логике    | `style(api): fix code formatting`          |
| `refactor` | Рефакторинг без изменения поведения       | `refactor(reports): extract query builder` |
| `perf`     | Оптимизация производительности            | `perf(api): add index on operations table` |
| `test`     | Добавление/исправление тестов             | `test(api): add unit tests for auth`       |
| `chore`    | Рутинные задачи (обновление зависимостей) | `chore: update dependencies`               |
| `build`    | Изменения в сборке/CI                     | `build: update docker compose config`      |
| `ci`       | Изменения в CI/CD                         | `ci: add AI review step`                   |
| `revert`   | Откат предыдущего коммита                 | `revert: revert "feat: add new feature"`   |

### Scope (опционально)

Указывает область изменений:

- `api` — backend
- `web` — frontend
- `worker` — фоновые задачи
- `shared` — общие типы/утилиты
- Название модуля: `auth`, `operations`, `reports`, `plans`, `catalogs`

### Subject

- Краткое описание (до 72 символов)
- Начинается с маленькой буквы (английский)
- Без точки в конце
- Императивное наклонение: "add", "fix", а не "added", "fixed"

### Примеры правильных коммитов

```bash
git commit -m "feat(api): add operation filtering by date range"
git commit -m "fix(web): resolve dashboard loading issue"
git commit -m "docs: update installation guide"
git commit -m "refactor(reports): extract BDDS calculation logic"
git commit -m "perf(api): add database index for operations query"
git commit -m "test(auth): add unit tests for JWT generation"
```

### ❌ Неправильные коммиты (будут отклонены)

```bash
git commit -m "Added new feature"         # нет типа
git commit -m "fix bug"                   # слишком общее
git commit -m "feat: Added."              # с точкой, не императив
git commit -m "update"                    # нет типа и деталей
```

---

## 🔄 Работа с изменениями

### Проверка статуса

```bash
git status                 # показать измененные файлы
git diff                   # показать изменения
git diff --staged          # показать staged изменения
git log --oneline -10      # последние 10 коммитов
```

### Коммит изменений

```bash
# Добавить конкретные файлы
git add apps/api/src/modules/operations/controller.ts
git add apps/web/src/pages/Operations.tsx

# Добавить все изменения (осторожно!)
git add .

# Коммит с автоматическими проверками (lint, format, type-check)
git commit -m "feat(operations): add date range filter"

# Если нужно исправить последний коммит (до push)
git commit --amend -m "feat(operations): add date range filter and pagination"
```

**Что происходит при коммите (через husky):**

1. ✅ **lint-staged** — автоматический ESLint + Prettier на измененные файлы
2. ✅ **commit-msg** — валидация формата Conventional Commits

Если проверки не прошли — коммит будет отклонен. Исправьте ошибки и попробуйте снова.

### Push в удаленный репозиторий

```bash
# Первый push новой ветки
git push -u origin feature/add-operations-filter

# Последующие push'ы
git push

# Force push (только для своих feature веток!)
git push --force-with-lease
```

**⚠️ НИКОГДА не делайте `git push --force` в `main` или `dev`!**

---

## 🔀 Pull Requests

### Создание PR

1. Завершите работу над фичей и закоммитьте все изменения
2. Push ветки в GitHub:
   ```bash
   git push -u origin feature/add-operations-filter
   ```
3. Откройте GitHub и создайте Pull Request:
   - **Base**: `dev` (или `main` для hotfix)
   - **Compare**: ваша feature ветка
4. Заполните описание PR (шаблон):

```markdown
## Описание

Краткое описание изменений и зачем они нужны.

## Изменения

- [ ] Добавлена фильтрация операций по дате
- [ ] Обновлены тесты
- [ ] Обновлена документация API.md

## Тестирование

- [ ] Unit тесты пройдены
- [ ] E2E тесты пройдены
- [ ] Проверено вручную в dev окружении

## Чеклист

- [ ] Код следует style guide
- [ ] Миграции БД добавлены (если нужно)
- [ ] API задокументирован (если изменения в API)
- [ ] Тесты добавлены/обновлены
- [ ] CHANGELOG.md обновлен
```

5. Дождитесь прохождения CI checks:
   - ✅ Lint & Type Check
   - ✅ AI Code Review
   - ✅ Build All Packages
   - ✅ Run Tests
   - ✅ E2E Tests
   - ✅ Security Scan

### AI Code Review

При создании PR автоматически запускается AI code review (Claude):

**Что проверяет:**

- 🔒 Security (SQL injection, XSS, data leakage)
- 🚀 Performance (N+1 queries, missing indexes)
- ✨ Best Practices (error handling, validation, TypeScript)
- 🎨 Code Style (naming, structure)
- 👥 Multi-tenancy (companyId filtering)

**Результат:**

- 🔴 **CRITICAL/HIGH** → `REQUEST_CHANGES` (блокирует merge)
- 🟡 **MEDIUM** → `COMMENT` (рекомендации)
- 🟢 **LOW** → `COMMENT` (опциональные улучшения)
- ✅ **No issues** → `APPROVE`

Исправьте критичные замечания и обновите PR:

```bash
# Внести исправления
git add .
git commit -m "fix: address AI review feedback"
git push
```

### Ревью от команды

- Минимум **1 approval** для merge в `main`
- Для `dev` можно без approval (но желательно ревью)
- Обсуждение в комментариях PR

### Merge PR

После прохождения всех проверок и approval:

1. **Squash and merge** (рекомендуется для feature веток)
2. **Rebase and merge** (для чистой истории)
3. ❌ **Merge commit** (избегать для feature веток)

Удалите ветку после merge:

```bash
git checkout dev
git pull
git branch -d feature/add-operations-filter  # удалить локальную ветку
```

---

## 🔥 Hotfix Workflow

Срочный фикс для production (минуя `dev`):

```bash
# Создать hotfix ветку от main
git checkout main
git pull
git checkout -b hotfix/fix-critical-jwt-issue

# Внести исправления
git add .
git commit -m "fix(auth): patch JWT validation vulnerability"
git push -u origin hotfix/fix-critical-jwt-issue
```

**PR workflow:**

1. Создать PR в `main`
2. После merge в `main` → автоматический deploy
3. Обязательно смержить `main` в `dev`:

```bash
git checkout dev
git pull
git merge main
git push
```

---

## 🌿 Синхронизация с upstream

### Обновить свою ветку от dev

```bash
git checkout feature/my-feature
git fetch origin
git rebase origin/dev

# Если есть конфликты — разрешите их
# После разрешения конфликтов:
git rebase --continue

# Если нужно отменить rebase:
git rebase --abort
```

### Альтернатива: merge вместо rebase

```bash
git checkout feature/my-feature
git merge origin/dev

# Разрешите конфликты, затем:
git commit
git push
```

**Когда использовать rebase vs merge:**

- **Rebase** — чистая линейная история (предпочтительно для feature веток)
- **Merge** — сохраняет всю историю (для долгоживущих веток)

---

## 🔧 Полезные команды

### Отмена изменений

```bash
# Отменить unstaged изменения в файле
git restore apps/api/src/controller.ts

# Отменить staged изменения (вернуть в unstaged)
git restore --staged apps/api/src/controller.ts

# Отменить все unstaged изменения (ОСТОРОЖНО!)
git restore .

# Отменить последний коммит (сохранить изменения в рабочей директории)
git reset --soft HEAD~1

# Отменить последний коммит (удалить изменения)
git reset --hard HEAD~1  # ОСТОРОЖНО!
```

### Stash (временное сохранение изменений)

```bash
# Сохранить текущие изменения
git stash

# Сохранить с описанием
git stash save "WIP: operations filter implementation"

# Посмотреть список stash'ей
git stash list

# Применить последний stash
git stash apply

# Применить конкретный stash
git stash apply stash@{1}

# Применить и удалить stash
git stash pop

# Удалить все stash'и
git stash clear
```

### Ветки

```bash
# Список локальных веток
git branch

# Список всех веток (включая удаленные)
git branch -a

# Удалить локальную ветку
git branch -d feature/old-feature

# Удалить удаленную ветку
git push origin --delete feature/old-feature

# Переименовать текущую ветку
git branch -m new-branch-name
```

### История и логи

```bash
# Красивый лог последних 20 коммитов
git log --oneline --graph --decorate -20

# Лог с изменениями
git log -p -2

# Поиск коммитов по автору
git log --author="username"

# Поиск коммитов по сообщению
git log --grep="operations"

# История изменений конкретного файла
git log --follow -- apps/api/src/modules/operations/controller.ts
```

### Сравнение

```bash
# Разница между ветками
git diff dev..feature/my-feature

# Разница между коммитами
git diff abc123..def456

# Файлы, которые изменились между ветками
git diff --name-only dev..feature/my-feature

# Статистика изменений
git diff --stat dev..feature/my-feature
```

---

## 🚨 Типичные проблемы и решения

### Проблема: Коммит отклонен из-за формата

```
❌ Invalid commit message format!
```

**Решение:**

Используйте правильный формат `<type>(<scope>): <subject>`:

```bash
git commit -m "feat(api): add operations filter"
```

### Проблема: Lint ошибки при коммите

```
✖ ESLint found errors
```

**Решение:**

Запустите lint с автофиксом:

```bash
pnpm lint --fix
git add .
git commit -m "fix: resolve linting issues"
```

### Проблема: Merge конфликты

```
CONFLICT (content): Merge conflict in apps/api/src/...
```

**Решение:**

1. Откройте файл с конфликтом
2. Найдите маркеры конфликта:
   ```
   <<<<<<< HEAD
   ваш код
   =======
   код из другой ветки
   >>>>>>> feature/other-branch
   ```
3. Разрешите конфликт (оставьте нужный код)
4. Удалите маркеры конфликта
5. Завершите merge/rebase:
   ```bash
   git add <resolved-files>
   git commit  # для merge
   git rebase --continue  # для rebase
   ```

### Проблема: Случайно закоммитили в main/dev

**Решение:**

```bash
# НЕ ДЕЛАЙТЕ push!
# Отменить коммит и сохранить изменения
git reset --soft HEAD~1

# Создать правильную ветку
git checkout -b feature/my-feature

# Закоммитить снова
git commit -m "feat: my feature"
git push -u origin feature/my-feature
```

### Проблема: Нужно отменить последний push в feature ветку

**Решение:**

```bash
# Отменить коммит локально
git reset --hard HEAD~1

# Force push (только для своих веток!)
git push --force-with-lease
```

### Проблема: Забыли создать ветку и работали в dev

**Решение:**

```bash
# Создать новую ветку (изменения останутся)
git checkout -b feature/my-feature

# Теперь можно коммитить
git add .
git commit -m "feat: my changes"
git push -u origin feature/my-feature
```

---

## 🔒 Branch Protection Rules

### Main ветка

- ✅ Require pull request (минимум 1 approval)
- ✅ Require status checks (все CI проверки)
- ✅ Require conversation resolution
- ❌ Allow force pushes
- ❌ Allow deletions
- ✅ Require linear history (rebase/squash merge)

### Dev ветка

- ✅ Require pull request (0 approvals, но рекомендуется ревью)
- ✅ Require status checks
- ❌ Allow force pushes

---

## 📊 Git Aliases (опционально)

Добавьте в `~/.gitconfig` для ускорения работы:

```ini
[alias]
    st = status
    co = checkout
    br = branch
    cm = commit -m
    lg = log --oneline --graph --decorate -20
    unstage = restore --staged
    undo = reset --soft HEAD~1
    sync = !git fetch origin && git rebase origin/dev
    cleanup = !git branch --merged | grep -v '\\*\\|main\\|dev' | xargs -n 1 git branch -d
```

Использование:

```bash
git st               # вместо git status
git co -b feature/x  # вместо git checkout -b feature/x
git cm "feat: add"   # вместо git commit -m "feat: add"
git lg               # красивый лог
git sync             # обновить от dev
git cleanup          # удалить смерженные ветки
```

---

## 📚 Связанные документы

- [DEV_GUIDE.md](./DEV_GUIDE.md) — общий гид для разработчиков
- [CI_CD.md](./CI_CD.md) — детали CI/CD pipeline и AI review
- [ARCHITECTURE.md](./ARCHITECTURE.md) — архитектура проекта
- [docs/ai-context/style-guide.md](./ai-context/style-guide.md) — стайл-гайд для кода

---

## 🎯 Quick Reference

```bash
# Начать новую фичу
git checkout dev && git pull && git checkout -b feature/my-feature

# Коммит
git add . && git commit -m "feat(scope): description"

# Push
git push -u origin feature/my-feature

# Создать PR на GitHub
# → Дождаться AI review + проверок + approval

# После merge — обновить dev
git checkout dev && git pull

# Удалить feature ветку
git branch -d feature/my-feature
```

---

**Последнее обновление**: 2024-01-07  
**Версия документа**: 1.0
