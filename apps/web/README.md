# Web Frontend

React frontend для финансовой системы Fin-U-CH.

## Технологии

- React 18 + TypeScript
- Vite
- Redux Toolkit + RTK Query
- React Router 6
- Tailwind CSS
- Axios

## Быстрый старт

### 1. Установка зависимостей

```bash
pnpm install
```

### 2. Запуск dev-сервера

```bash
pnpm dev
```

Приложение будет доступно на `http://localhost:3000`

### 3. Сборка для production

```bash
pnpm build
```

## Доступные скрипты

- `pnpm dev` - запуск dev-сервера
- `pnpm build` - сборка для production
- `pnpm preview` - предпросмотр production сборки
- `pnpm lint` - проверка кода с ESLint

## Структура проекта

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Root component с роутингом
├── components/           # Общие компоненты
├── pages/                # Страницы приложения
├── features/             # Feature-модули с бизнес-логикой
├── store/                # Redux store и API
└── shared/               # Переиспользуемые UI и утилиты
    ├── ui/               # UI компоненты
    ├── lib/              # Утилиты
    ├── api/              # API клиент
    └── config/           # Конфигурация
```

## Маршруты

### Публичные

- `/login` - вход
- `/register` - регистрация

### Приватные

- `/dashboard` - главная
- `/operations` - операции
- `/plans` - планы
- `/reports` - отчеты
- `/catalogs/*` - справочники

## API Integration

- Все запросы через `/api` проксируются на backend (localhost:4000)
- JWT токены хранятся в localStorage
- Автоматический refresh при 401

## Разработка

### Добавление новой страницы

1. Создать компонент в `src/pages/`
2. Добавить маршрут в `src/App.tsx`
3. Обернуть в `<PrivateRoute>` если нужна авторизация

### Добавление нового API endpoint

1. Открыть соответствующий файл в `src/store/api/`
2. Добавить endpoint через `injectEndpoints`
3. Использовать сгенерированный hook в компоненте

### Добавление нового UI компонента

1. Создать компонент в `src/shared/ui/`
2. Экспортировать из компонента
3. Использовать в страницах/features

## Переменные окружения

Создать `.env.local`:

```env
VITE_API_URL=/api
```

## Troubleshooting

### Не работает proxy к API

Проверьте что backend запущен на порту 4000

### TypeScript ошибки

```bash
pnpm tsc --noEmit
```

### Проблемы с типами из @shared

```bash
cd ../../packages/shared && pnpm build
```

## Документация

- [PHASE5_RESULTS.md](../../docs/PHASE5_RESULTS.md) - детальные результаты
- [PHASE5_SUMMARY.md](../../PHASE5_SUMMARY.md) - краткая сводка
