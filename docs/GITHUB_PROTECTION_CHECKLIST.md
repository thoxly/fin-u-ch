# 🔐 GitHub Protection Checklist

## Цель

Этот документ содержит пошаговые инструкции по настройке защиты репозитория на GitHub, чтобы предотвратить случайные проблемы с кодом.

---

## ✅ Branch Protection Rules

### Шаг 1: Перейдите в настройки репозитория

1. Откройте https://github.com/thoxly/fin-u-ch
2. Перейдите в **Settings** (вкладка справа вверху)
3. В левом меню выберите **Branches** (в разделе Code and automation)

### Шаг 2: Защита ветки `main`

Нажмите **Add branch protection rule** и настройте:

#### Branch name pattern

```
main
```

#### Protect matching branches

- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners (опционально)

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Выберите обязательные проверки**:
    - `Lint & Type Check`
    - `Build All Packages`
    - `Run Tests`
    - `E2E Tests`
    - `Security Scan`

- [x] **Require conversation resolution before merging**
  - Все комментарии в PR должны быть resolve

- [x] **Require signed commits** (опционально, но рекомендуется)

- [x] **Require linear history**
  - Запретить merge commits, только squash или rebase

- [x] **Include administrators**
  - Правила применяются даже к администраторам

#### Правила, которые НЕ нужно включать

- [ ] ~~Allow force pushes~~ ❌ ОСТАВИТЬ ВЫКЛЮЧЕННЫМ
- [ ] ~~Allow deletions~~ ❌ ОСТАВИТЬ ВЫКЛЮЧЕННЫМ

**Нажмите "Create" или "Save changes"**

---

### Шаг 3: Защита ветки `dev` (если используете)

Повторите те же шаги для ветки `dev`, но с более мягкими правилами:

#### Branch name pattern

```
dev
```

#### Protect matching branches

- [x] **Require a pull request before merging**
  - [x] Require approvals: **0** (опционально, можно оставить 1)

- [x] **Require status checks to pass before merging**
  - `Lint & Type Check`
  - `Build All Packages`
  - `Run Tests`

- [ ] Остальные правила можно не включать для dev

**Нажмите "Create" или "Save changes"**

---

## ✅ Repository Settings

### Общие настройки безопасности

1. Перейдите в **Settings** → **General**
2. Прокрутите до раздела **Pull Requests**:
   - [x] Allow squash merging
   - [x] Allow rebase merging
   - [ ] Allow merge commits (можно отключить для чистой истории)
   - [x] Always suggest updating pull request branches
   - [x] Automatically delete head branches (автоудаление веток после merge)

---

## ✅ Security Settings

### Шаг 4: Dependabot Alerts

1. Перейдите в **Settings** → **Code security and analysis**
2. Включите:
   - [x] **Dependency graph** (обычно включен по умолчанию)
   - [x] **Dependabot alerts** (уведомления об уязвимостях)
   - [x] **Dependabot security updates** (автоматические PR для исправления)

### Шаг 5: Secret Scanning

- [x] **Secret scanning** (доступно для public репозиториев бесплатно)
- [x] **Push protection** (блокировка commit'ов с секретами)

### Шаг 6: Code Scanning (GitHub Advanced Security)

Если у вас есть доступ:

- [x] **Code scanning** (CodeQL для поиска уязвимостей)

Если нет, у вас уже есть Trivy в CI/CD, этого достаточно.

---

## ✅ Collaborators & Teams

### Шаг 7: Управление доступом

1. Перейдите в **Settings** → **Collaborators and teams**
2. Настройте права доступа:

#### Для основного разработчика (вы):

- **Role**: Admin

#### Для других разработчиков:

- **Role**: Write (может создавать PR, но не может напрямую push в protected branches)

#### Для внешних помощников:

- **Role**: Read (только чтение и создание issues)

---

## ✅ Secrets Management

### Шаг 8: Проверка GitHub Secrets

1. Перейдите в **Settings** → **Secrets and variables** → **Actions**
2. Убедитесь, что настроены все необходимые секреты:

#### Repository secrets:

- [x] `ANTHROPIC_API_KEY` - для AI Code Review
- [x] `VPS_HOST` - IP адрес VPS
- [x] `VPS_USER` - SSH пользователь
- [x] `VPS_SSH_KEY` - приватный SSH ключ
- [x] `GHCR_TOKEN` - токен для GitHub Container Registry

**Как проверить**: Просто убедитесь что они есть в списке. GitHub не показывает значения секретов.

**Если чего-то не хватает**: См. [SETUP_EXTERNAL.md](./SETUP_EXTERNAL.md) для инструкций по созданию

---

## ✅ Notifications & Monitoring

### Шаг 9: Настройка уведомлений

1. Перейдите в свой профиль → **Settings** → **Notifications**
2. Убедитесь что включены:
   - [x] Email notifications для:
     - Pull request reviews
     - Pull request pushes
     - CI/CD failures
     - Security alerts
     - Dependabot alerts

### Шаг 10: GitHub Actions уведомления

В настройках репозитория **Settings** → **Notifications**:

- [x] Уведомлять при failed workflow runs
- [x] Уведомлять при deployment failures

---

## ✅ Проверка работы защиты

### Тест 1: Попытка прямого push в main (должна быть заблокирована)

```bash
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test: direct push"
git push origin main
```

**Ожидаемый результат**: ❌ Push rejected (если настроены правильно branch protection rules)

### Тест 2: Создание PR с ошибками (должен быть заблокирован merge)

1. Создайте feature ветку
2. Добавьте код с lint ошибками
3. Создайте PR в `main`
4. **Ожидаемый результат**: ❌ CI checks failed, merge button disabled

### Тест 3: Правильный процесс

1. Создайте feature ветку
2. Добавьте правильный код
3. Создайте PR в `main`
4. Дождитесь прохождения всех checks
5. Попросите кого-то approve (или approve сами)
6. **Ожидаемый результат**: ✅ Merge button enabled

---

## 📊 Monitoring & Insights

### Полезные страницы для мониторинга

1. **Security**
   - https://github.com/thoxly/fin-u-ch/security
   - Показывает уязвимости и alerts

2. **Insights** → **Pulse**
   - Активность за последнюю неделю
   - Merged PRs, opened issues, etc.

3. **Actions**
   - https://github.com/thoxly/fin-u-ch/actions
   - История всех CI/CD runs

4. **Network** → **Branches**
   - Визуализация веток и коммитов

---

## 🚨 Red Flags - На что обращать внимание

### Признаки проблем:

- ⚠️ Много failed CI/CD runs подряд
- ⚠️ Security alerts не решаются
- ⚠️ Dependabot PRs игнорируются
- ⚠️ Прямые pushes в main (если защита не работает)
- ⚠️ Force pushes в историю
- ⚠️ Большие бинарные файлы в коммитах

### Как проверить историю на проблемы:

```bash
# Проверить force pushes
git log --walk-reflogs --oneline | grep "forced-update"

# Проверить большие файлы
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print substr($0,6)}' | sort -n -k 2 | tail -10

# Проверить кто делал коммиты в main напрямую
git log main --pretty=format:"%h %an %s" | grep -v "Merge pull request"
```

---

## 📝 Чек-лист финальной проверки

Пройдитесь по этому списку и убедитесь что всё настроено:

### GitHub Repository

- [ ] Branch protection для `main` включена
- [ ] Branch protection для `dev` включена (если используете)
- [ ] Require status checks настроены
- [ ] Require pull request reviews настроены
- [ ] Force pushes и deletions заблокированы
- [ ] Auto-delete head branches включено

### Security

- [ ] Dependabot alerts включены
- [ ] Dependabot security updates включены
- [ ] Secret scanning включен (если доступен)
- [ ] Все необходимые secrets настроены

### Access Control

- [ ] Права доступа для collaborators настроены правильно
- [ ] Admin права только у доверенных людей
- [ ] 2FA включена для всех с admin правами

### Notifications

- [ ] Email уведомления настроены
- [ ] Уведомления о CI/CD failures включены
- [ ] Уведомления о security alerts включены

### Testing

- [ ] Попробовали прямой push в main (должен блокироваться)
- [ ] Создали тестовый PR и проверили что CI/CD работает
- [ ] Проверили что merge блокируется при failed checks

---

## 🔗 Дополнительные ресурсы

- [GitHub Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Security Features](https://docs.github.com/en/code-security)
- [Git Guide для вашего проекта](./GIT_GUIDE.md)
- [CI/CD Documentation](./CI_CD.md)

---

**Последнее обновление**: 2024-01-08  
**Проверено для**: GitHub Free/Pro
