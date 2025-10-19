# Submodules

Эта папка содержит внешние репозитории, подключенные как git submodules.

## Оркестрационная система (orch-system)

- **Репозиторий**: https://github.com/thoxly/orch-system
- **Статус**: Репозиторий пустой, ожидает первого коммита
- **Описание**: Система оркестрации для управления компонентами

### Планируемые возможности

#### 🔍 Code Indexing Service

- **Целевой репозиторий**: [fin-u-ch](https://github.com/thoxly/fin-u-ch)
- **Функции**:
  - Семантический поиск по коду
  - Индексация документации
  - Анализ архитектуры проекта
  - Мониторинг изменений
  - Карта зависимостей

#### 🎯 Возможности индексации fin-u-ch:

- **Backend API** (Express + TypeScript + Prisma)
- **Frontend** (React + Vite)
- **Worker** (Node-cron)
- **Документация** (обширная база знаний)
- **Конфигурация** (Docker, CI/CD, Environment)

## Добавление submodule

Когда репозиторий orch-system будет содержать код, добавьте его как submodule командой:

```bash
git submodule add https://github.com/thoxly/orch-system.git orch-system
```

## Работа с submodules

### Инициализация и обновление

```bash
# Инициализация всех submodules
git submodule init

# Обновление до последних коммитов
git submodule update

# Инициализация и обновление одновременно
git submodule update --init --recursive
```

### Обновление submodule

```bash
# Переход в папку submodule
cd orch-system

# Получение изменений
git fetch origin
git checkout main  # или нужная ветка

# Возврат в основной проект и коммит изменений
cd ..
git add orch-system
git commit -m "Update orch-system submodule"
```

### Клонирование проекта с submodules

```bash
git clone --recursive <repository-url>
```

Или если проект уже склонирован:

```bash
git submodule update --init --recursive
```
