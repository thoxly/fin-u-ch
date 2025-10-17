# Задача: Рефакторинг архитектуры форм справочников

## 📋 Метаданные

- **Тип**: Technical Debt / Refactoring
- **Приоритет**: High
- **Сложность**: Medium (3-4 часа)
- **Связано с**: PR #58 - MenuPopover для справочников

## 🎯 Цель

Устранить критические нарушения архитектуры слоев в компонентах форм справочников, выявленные AI Code Review, для соблюдения принципов чистой архитектуры и Feature-Sliced Design.

## ❌ Проблема

### 🔴 Критическая проблема (блокирует CI/CD)

**CatalogFormRenderer** в `/shared/ui` импортирует формы из `/pages`, что создает:

- **Циркулярные зависимости** между слоями (shared → pages)
- **Нарушение модульности** кода
- **Невозможность переиспользования** shared-компонентов

```typescript
// ❌ ПЛОХО: shared/ui зависит от pages
import { ArticleForm } from '../../pages/catalogs/ArticlesPage';
import { AccountForm } from '../../pages/catalogs/AccountsPage';
```

### 🟠 High проблемы (6 шт)

Формы экспортируются из page-компонентов, что нарушает разделение ответственности:

- `ArticleForm` экспортируется из `ArticlesPage.tsx`
- `AccountForm` экспортируется из `AccountsPage.tsx`
- `DepartmentForm` экспортируется из `DepartmentsPage.tsx`
- `CounterpartyForm` экспортируется из `CounterpartiesPage.tsx`
- `DealForm` экспортируется из `DealsPage.tsx`
- `SalaryForm` экспортируется из `SalariesPage.tsx`

**Почему это проблема:**

- Pages должны содержать только логику роутинга и композицию
- Формы - это переиспользуемая бизнес-логика
- Нарушается принцип единственной ответственности

## ✅ Решение

### 1. Переместить формы в `/features/catalog-forms/`

Создать структуру согласно Feature-Sliced Design:

```
apps/web/src/features/catalog-forms/
├── index.ts
├── ArticleForm/
│   ├── ArticleForm.tsx
│   └── index.ts
├── AccountForm/
│   ├── AccountForm.tsx
│   └── index.ts
├── DepartmentForm/
│   ├── DepartmentForm.tsx
│   └── index.ts
├── CounterpartyForm/
│   ├── CounterpartyForm.tsx
│   └── index.ts
├── DealForm/
│   ├── DealForm.tsx
│   └── index.ts
└── SalaryForm/
    ├── SalaryForm.tsx
    └── index.ts
```

### 2. Обновить CatalogFormRenderer

```typescript
// apps/web/src/shared/ui/CatalogFormRenderer.tsx
// ✅ ХОРОШО: импортируем из features
import { ArticleForm } from '@/features/catalog-forms/ArticleForm';
import { AccountForm } from '@/features/catalog-forms/AccountForm';
import { DepartmentForm } from '@/features/catalog-forms/DepartmentForm';
import { CounterpartyForm } from '@/features/catalog-forms/CounterpartyForm';
import { DealForm } from '@/features/catalog-forms/DealForm';
import { SalaryForm } from '@/features/catalog-forms/SalaryForm';

interface CatalogFormRendererProps {
  catalogType: string;
  onClose: () => void;
}

export const CatalogFormRenderer = ({
  catalogType,
  onClose,
}: CatalogFormRendererProps): JSX.Element => {
  const getFormComponent = (): JSX.Element => {
    switch (catalogType) {
      case 'Статьи':
        return <ArticleForm article={null} onClose={onClose} />;
      case 'Счета':
        return <AccountForm account={null} onClose={onClose} />;
      case 'Подразделения':
        return <DepartmentForm department={null} onClose={onClose} />;
      case 'Контрагенты':
        return <CounterpartyForm counterparty={null} onClose={onClose} />;
      case 'Сделки':
        return <DealForm deal={null} onClose={onClose} />;
      case 'Зарплаты':
        return <SalaryForm salary={null} onClose={onClose} />;
      default:
        return (
          <div className="p-4 text-gray-600 dark:text-gray-400">
            Форма для &quot;{catalogType}&quot; недоступна
          </div>
        );
    }
  };

  return getFormComponent();
};
```

### 3. Обновить page-компоненты

Импортировать формы из features вместо определения внутри:

```typescript
// apps/web/src/pages/catalogs/ArticlesPage.tsx
import { ArticleForm } from '@/features/catalog-forms/ArticleForm';

export const ArticlesPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);

  // ... остальная логика

  return (
    <Layout>
      {/* ... */}
      <OffCanvas
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? 'Редактировать статью' : 'Создать статью'}
      >
        <ArticleForm article={editing} onClose={() => setIsFormOpen(false)} />
      </OffCanvas>
    </Layout>
  );
};
```

## 📝 Пошаговый план выполнения

### Этап 1: Подготовка (10 мин)

- [ ] Создать директорию `/features/catalog-forms/`
- [ ] Создать поддиректории для каждой формы (6 штук)

### Этап 2: Миграция форм (1.5 часа)

- [ ] Извлечь `ArticleForm` из `ArticlesPage.tsx` → `features/catalog-forms/ArticleForm/ArticleForm.tsx`
- [ ] Извлечь `AccountForm` из `AccountsPage.tsx` → `features/catalog-forms/AccountForm/AccountForm.tsx`
- [ ] Извлечь `DepartmentForm` из `DepartmentsPage.tsx` → `features/catalog-forms/DepartmentForm/DepartmentForm.tsx`
- [ ] Извлечь `CounterpartyForm` из `CounterpartiesPage.tsx` → `features/catalog-forms/CounterpartyForm/CounterpartyForm.tsx`
- [ ] Извлечь `DealForm` из `DealsPage.tsx` → `features/catalog-forms/DealForm/DealForm.tsx`
- [ ] Извлечь `SalaryForm` из `SalariesPage.tsx` → `features/catalog-forms/SalaryForm/SalaryForm.tsx`
- [ ] Создать `index.ts` в каждой поддиректории для экспорта
- [ ] Создать общий `index.ts` в `catalog-forms/` для barrel export

### Этап 3: Обновление импортов (45 мин)

- [ ] Обновить `CatalogFormRenderer.tsx` - заменить импорты с `/pages` на `/features`
- [ ] Обновить `ArticlesPage.tsx` - импортировать `ArticleForm` из features
- [ ] Обновить `AccountsPage.tsx` - импортировать `AccountForm` из features
- [ ] Обновить `DepartmentsPage.tsx` - импортировать `DepartmentForm` из features
- [ ] Обновить `CounterpartiesPage.tsx` - импортировать `CounterpartyForm` из features
- [ ] Обновить `DealsPage.tsx` - импортировать `DealForm` из features
- [ ] Обновить `SalariesPage.tsx` - импортировать `SalaryForm` из features

### Этап 4: Обновление тестов (30 мин)

- [ ] Обновить mock в `Layout.test.tsx` для нового пути `CatalogFormRenderer`
- [ ] Запустить `pnpm test Layout.test.tsx`
- [ ] Запустить `pnpm test MenuPopover.test.tsx`
- [ ] Исправить возможные ошибки импортов в тестах

### Этап 5: Финальная проверка (30 мин)

- [ ] Запустить линтер: `pnpm lint`
- [ ] Запустить все тесты: `pnpm test`
- [ ] Запустить type check: `pnpm type-check`
- [ ] Запустить dev сервер и проверить работу форм
- [ ] Проверить что MenuPopover корректно открывает формы

## ✅ Acceptance Criteria

### Функциональные требования

- [ ] Все формы создания справочников работают из MenuPopover
- [ ] Формы открываются в OffCanvas при клике на "+"
- [ ] Все существующие тесты проходят
- [ ] Нет регрессии в функциональности

### Технические требования

- [ ] Все формы находятся в `/features/catalog-forms/`
- [ ] `CatalogFormRenderer` импортирует из `/features`, а не из `/pages`
- [ ] Pages содержат только композицию и роутинг
- [ ] Нет циркулярных зависимостей между слоями
- [ ] Соблюдается принцип разделения ответственности

### CI/CD требования

- [ ] ✅ Lint & Type Check - SUCCESS
- [ ] ✅ AI Code Review - SUCCESS (**0 critical, 0 high**)
- [ ] ✅ Build & Test - SUCCESS
- [ ] ✅ Security Scan - SUCCESS

## 🧪 Тестирование

### Автоматические тесты

```bash
# Unit тесты
cd apps/web
pnpm test Layout.test.tsx
pnpm test MenuPopover.test.tsx

# Все тесты
pnpm test

# Type check
pnpm type-check

# Linter
pnpm lint
```

### Ручное тестирование

1. Запустить dev сервер: `pnpm dev`
2. Открыть меню "Справочники"
3. Проверить наличие всех 6 пунктов
4. Нажать "+" рядом с каждым справочником (6 проверок)
5. Убедиться что открывается соответствующая форма
6. Заполнить и отправить форму
7. Проверить что данные сохраняются корректно

## 📊 Метрики успеха

| Метрика                     | До рефакторинга          | После рефакторинга    |
| --------------------------- | ------------------------ | --------------------- |
| **AI Code Review**          | 🔴 1 Critical, 🟠 6 High | ✅ 0 Critical, 0 High |
| **Архитектурные слои**      | ❌ Нарушены              | ✅ Соблюдены          |
| **Циркулярные зависимости** | ❌ Есть                  | ✅ Нет                |
| **Переиспользуемость форм** | ❌ Низкая                | ✅ Высокая            |

## 📚 Дополнительные ресурсы

- [Feature-Sliced Design](https://feature-sliced.design/) - методология организации кода
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - принципы чистой архитектуры
- [Dependency Rule](https://khalilstemmler.com/wiki/dependency-rule/) - правило зависимостей

## 🔗 Связанные задачи

- **PR #58** - Добавить переиспользуемый MenuPopover для справочников (базовая имплементация)
- **Эта задача** - Исправить архитектуру форм (критические проблемы)

## 💬 Важные заметки

⚠️ **Эта задача НЕ меняет функциональность** - только архитектуру и структуру файлов

✅ **Все существующие тесты должны продолжать работать** без изменения логики

🔄 **Это чистый рефакторинг** - не добавляем новые фичи, только переносим код

📦 **После завершения** этот паттерн можно применить к другим формам в приложении

## 🎯 Результат

После выполнения задачи:

- ✅ CI/CD pipeline полностью зеленый
- ✅ AI Code Review не находит критических проблем
- ✅ Архитектура соответствует Feature-Sliced Design
- ✅ Код легче поддерживать и тестировать
- ✅ Формы можно переиспользовать в других частях приложения
