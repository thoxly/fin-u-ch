# 🛡️ Защита проекта - Краткая справка

Это краткий обзор всех систем защиты проекта Fin-U-CH. Для детальных инструкций см. полную документацию.

---

## ✅ Что уже защищено

### 1. Контроль версий кода ✅

- **Система**: Git + GitHub
- **Репозиторий**: https://github.com/thoxly/fin-u-ch.git
- **Что защищено**: Весь исходный код, конфигурации, документация
- **Как откатиться**: `git checkout <commit-hash>`

### 2. CI/CD Pipeline ✅

- **Система**: GitHub Actions
- **Проверки**:
  - Lint & Type Check
  - AI Code Review (Claude)
  - Build всех пакетов
  - Unit тесты
  - E2E тесты (Playwright)
  - Security scan (Trivy)
- **Статус**: Активен, работает при каждом PR

### 3. Docker Images ✅

- **Хранилище**: GitHub Container Registry (GHCR)
- **Образы**:
  - `ghcr.io/thoxly/fin-u-ch-api:latest`
  - `ghcr.io/thoxly/fin-u-ch-web:latest`
  - `ghcr.io/thoxly/fin-u-ch-worker:latest`
- **Версионирование**: Каждый commit = новый тег
- **Срок хранения**: Бессрочно

### 4. Backup при деплое ✅

- **Когда**: Перед каждым деплоем в production
- **Где**: `/opt/fin-u-ch/backups/` на VPS
- **Автоматически**: Да (в CI/CD workflow)

---

## ⚠️ Что нужно настроить

### 1. Branch Protection Rules ⚠️

**Статус**: ТРЕБУЕТ НАСТРОЙКИ

**Что делать**:

1. Откройте https://github.com/thoxly/fin-u-ch/settings/branches
2. Следуйте инструкциям в [GITHUB_PROTECTION_CHECKLIST.md](./GITHUB_PROTECTION_CHECKLIST.md)

**Цель**: Запретить прямые pushes в `main`, требовать PR и reviews

**Время**: 10 минут

---

### 2. Автоматические бэкапы БД ⚠️

**Статус**: ТРЕБУЕТ НАСТРОЙКИ

**Что делать**:

```bash
# На VPS
ssh root@83.166.244.139
cd /opt/fin-u-ch
sudo ./scripts/setup-backups.sh
```

**Цель**: Ежедневные автоматические бэкапы базы данных

**Время**: 5 минут

**Документация**: [BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md)

---

### 3. Off-site Backup Storage 🔄

**Статус**: РЕКОМЕНДУЕТСЯ

**Что делать**:

- Настроить копирование бэкапов в S3/Backblaze/Google Cloud
- Или периодически скачивать бэкапы локально

**Цель**: Защита от полной потери VPS

**Время**: 30 минут (зависит от сервиса)

---

## 🚀 Быстрый старт - 3 простых шага

### Шаг 1: Защитите GitHub (10 минут)

```
1. Откройте: https://github.com/thoxly/fin-u-ch/settings/branches
2. Добавьте Branch Protection Rule для `main`
3. Включите: Require PR, Require status checks, Block force pushes
```

См. детали: [GITHUB_PROTECTION_CHECKLIST.md](./GITHUB_PROTECTION_CHECKLIST.md)

---

### Шаг 2: Настройте автоматические бэкапы (5 минут)

```bash
# На VPS
ssh root@83.166.244.139
cd /opt/fin-u-ch
sudo ./scripts/setup-backups.sh
```

---

### Шаг 3: Проверьте что всё работает (5 минут)

```bash
# 1. Проверить бэкапы
/opt/fin-u-ch/scripts/check-backups.sh

# 2. Попробовать прямой push в main (должен блокироваться)
cd ~/Projects/fin-u-ch
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test"
git push origin main  # Должен быть rejected

# 3. Проверить что CI/CD работает
# Создайте тестовый PR на GitHub и посмотрите что все checks проходят
```

---

## 📋 Ежедневный/Еженедельный мониторинг

### Каждый день (автоматически)

- ✅ Бэкапы создаются автоматически (cron)
- ✅ CI/CD проверяет каждый PR
- ✅ GitHub отправляет уведомления о проблемах

### Каждую неделю (вручную, 5 минут)

```bash
# На VPS
ssh root@83.166.244.139

# 1. Проверить бэкапы
/opt/fin-u-ch/scripts/check-backups.sh

# 2. Проверить доступные бэкапы
ls -lht /opt/fin-u-ch/backups/ | head -10

# 3. Проверить место на диске
df -h

# 4. Проверить логи
docker compose -f /opt/fin-u-ch/docker-compose.prod.yml logs --tail=100
```

На GitHub:

- Проверить https://github.com/thoxly/fin-u-ch/security (уязвимости)
- Проверить https://github.com/thoxly/fin-u-ch/actions (CI/CD runs)

---

## 🚨 Что делать если...

### Если накосячили в коде и задеплоили в production

```bash
# 1. Быстрый откат к предыдущей версии
ssh root@83.166.244.139
cd /opt/fin-u-ch

# 2. Найти предыдущий working commit
git log --oneline -10

# 3. Изменить .env
nano .env
# IMAGE_TAG=<previous-commit-hash>

# 4. Передеплоить
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate api web worker

# 5. Проверить
curl http://83.166.244.139/api/health
```

**Время на откат**: ~2 минуты

**Документация**: [BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md) → "Откат к предыдущей версии"

---

### Если удалили данные в БД

```bash
# 1. Остановить приложение
ssh root@83.166.244.139
cd /opt/fin-u-ch
docker compose stop api worker

# 2. Восстановить из последнего бэкапа
./scripts/restore-db.sh

# Следуйте инструкциям скрипта
```

**Время на восстановление**: ~5 минут

**Документация**: [BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md) → "Восстановление из бэкапа"

---

### Если разработчик пытается push в main напрямую

**Если Branch Protection настроен правильно**:

- ❌ Push будет заблокирован автоматически
- Разработчик получит ошибку
- Код останется безопасным

**Если ещё не настроен**:

- ⚠️ СРОЧНО настройте Branch Protection (Шаг 1 выше)

---

## 📊 Статус защиты - Визуальная карта

```
┌─────────────────────────────────────────────────────────┐
│                  УРОВНИ ЗАЩИТЫ                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Git Version Control            ✅ Активен            │
│     └─ GitHub Repository            ✅ Настроен          │
│     └─ Branch Protection            ⚠️  НАСТРОИТЬ       │
│                                                          │
│  2. CI/CD Pipeline                 ✅ Активен            │
│     ├─ Lint & Type Check            ✅ Работает          │
│     ├─ AI Code Review               ✅ Работает          │
│     ├─ Build & Tests                ✅ Работает          │
│     └─ Security Scan                ✅ Работает          │
│                                                          │
│  3. Docker Images                  ✅ Активен            │
│     └─ GHCR Storage                 ✅ Настроен          │
│                                                          │
│  4. Database Backups               ⚠️  ЧАСТИЧНО          │
│     ├─ Deploy-time Backup           ✅ Работает          │
│     ├─ Automated Daily Backups      ⚠️  НАСТРОИТЬ       │
│     └─ Off-site Storage             🔄 РЕКОМЕНДУЕТСЯ     │
│                                                          │
│  5. Monitoring & Alerts            ✅ Активен            │
│     └─ GitHub Notifications         ✅ Настроен          │
│                                                          │
└─────────────────────────────────────────────────────────┘

Легенда:
✅ Работает      - Полностью настроено и активно
⚠️  Настроить   - Требует немедленной настройки
🔄 Рекомендуется - Опционально, но желательно
```

---

## 📚 Полная документация

Для детального изучения см.:

1. **[GITHUB_PROTECTION_CHECKLIST.md](./GITHUB_PROTECTION_CHECKLIST.md)**
   - Пошаговая настройка GitHub защиты
   - Branch protection rules
   - Security settings

2. **[BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md)**
   - Полная стратегия бэкапов
   - Процедуры восстановления
   - Disaster recovery план

3. **[CI_CD.md](./CI_CD.md)**
   - CI/CD pipeline в деталях
   - Troubleshooting
   - Настройка

4. **[scripts/README.md](../scripts/README.md)**
   - Документация всех скриптов
   - Команды и примеры

---

## ✅ Финальный чек-лист

Пройдитесь по этому списку прямо сейчас:

- [ ] **Настроить Branch Protection для `main`** (10 мин)
- [ ] **Настроить автоматические бэкапы БД** (5 мин)
- [ ] **Проверить что бэкап создался** (1 мин)
- [ ] **Попробовать откат версии** (5 мин, тестово)
- [ ] **Попробовать восстановление БД** (5 мин, тестово)
- [ ] **Настроить off-site backup** (30 мин, опционально)
- [ ] **Добавить в календарь: еженедельная проверка** (1 мин)

**Общее время**: ~30 минут (без off-site backup)

---

## 🎯 Итого

После выполнения всех шагов у вас будет:

✅ **Защита от случайных изменений кода**

- Branch protection на GitHub
- Обязательные PR reviews
- Автоматические CI/CD проверки

✅ **Защита от потери данных**

- Ежедневные автоматические бэкапы БД
- Бэкапы перед каждым деплоем
- Версионирование Docker images

✅ **Быстрое восстановление**

- Откат версии приложения за 2 минуты
- Восстановление БД за 5 минут
- Чёткие инструкции и скрипты

✅ **Мониторинг и уведомления**

- GitHub alerts о проблемах
- CI/CD notifications
- Health checks

---

**Последнее обновление**: 2024-01-08  
**Версия**: 1.0

**Вопросы?** См. полную документацию выше или [GitHub Discussions](https://github.com/thoxly/fin-u-ch/discussions)
