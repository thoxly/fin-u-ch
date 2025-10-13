# Система всплывающих уведомлений (Notification System)

## Обзор

Система всплывающих уведомлений обеспечивает мгновенную обратную связь пользователям о результатах их действий в приложении. Уведомления отображаются в правом верхнем углу экрана и автоматически исчезают через заданное время.

## Архитектура

### Компоненты

1. **Типы и схемы** (`@fin-u-ch/shared`)
   - `Notification` - интерфейс уведомления
   - `CreateNotificationParams` - параметры создания
   - Zod схемы для валидации

2. **Redux Store** (`apps/web/src/store/slices/notificationSlice.ts`)
   - `showNotification` - показать уведомление
   - `hideNotification` - скрыть уведомление (анимация)
   - `removeNotification` - удалить из store
   - `clearNotifications` - очистить все

3. **React Hook** (`apps/web/src/shared/hooks/useNotification.ts`)
   - Удобный интерфейс для работы с уведомлениями
   - Вспомогательные методы: `showSuccess`, `showError`, `showWarning`, `showInfo`

4. **UI Компоненты**
   - `Notification` - отдельное уведомление
   - `NotificationContainer` - контейнер с логикой автоматического закрытия

## Использование

### Базовое использование

```tsx
import { useNotification } from '../../shared/hooks/useNotification';

const MyComponent = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  const handleAction = async () => {
    try {
      await someAsyncAction();
      showSuccess('Действие выполнено успешно');
    } catch (error) {
      showError('Произошла ошибка');
    }
  };

  return <button onClick={handleAction}>Выполнить</button>;
};
```

### Использование с предопределенными сообщениями

```tsx
import { useNotification } from '../../shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '../../constants/notificationMessages';

const OperationForm = () => {
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (data) => {
    try {
      await createOperation(data);
      showSuccess(NOTIFICATION_MESSAGES.OPERATION.CREATE_SUCCESS);
    } catch (error) {
      showError(NOTIFICATION_MESSAGES.OPERATION.CREATE_ERROR);
    }
  };
};
```

### Расширенное использование

```tsx
import { useNotification } from '../../shared/hooks/useNotification';

const MyComponent = () => {
  const { showNotification } = useNotification();

  const handleAction = () => {
    showNotification({
      type: 'info',
      title: 'Пользовательский заголовок',
      message: 'Детальное описание события',
      duration: 10000, // 10 секунд
    });
  };
};
```

## API

### useNotification()

Возвращает объект с методами:

- **showSuccess(message, title?, duration?)** - показать успешное уведомление
- **showError(message, title?, duration?)** - показать ошибку
- **showWarning(message, title?, duration?)** - показать предупреждение
- **showInfo(message, title?, duration?)** - показать информацию
- **showNotification(params)** - показать кастомное уведомление
- **hideNotification(id)** - скрыть уведомление
- **removeNotification(id)** - удалить уведомление
- **clearNotifications()** - очистить все уведомления

### CreateNotificationParams

```typescript
interface CreateNotificationParams {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string; // макс. 50 символов
  message: string; // макс. 200 символов
  duration?: number; // в миллисекундах, макс. 30000 (30 сек)
}
```

## Константы сообщений

Файл `apps/web/src/constants/notificationMessages.ts` содержит предопределенные сообщения:

```typescript
NOTIFICATION_MESSAGES.OPERATION.CREATE_SUCCESS;
NOTIFICATION_MESSAGES.OPERATION.UPDATE_SUCCESS;
NOTIFICATION_MESSAGES.OPERATION.DELETE_SUCCESS;
NOTIFICATION_MESSAGES.ACCOUNT.CREATE_ERROR;
// и т.д.
```

## Стилизация

### Типы уведомлений

- **Success** (зеленый) - успешные операции
- **Error** (красный) - ошибки
- **Warning** (желтый) - предупреждения
- **Info** (синий) - информация

### Позиционирование

Уведомления отображаются в правом верхнем углу экрана с отступом 20px.

### Анимация

- Появление: slide-in справа с fade-in
- Исчезновение: slide-out вправо с fade-out
- Длительность анимации: 300ms

### Адаптивность

На мобильных устройствах (< 480px) уведомления занимают всю ширину экрана с отступами по 10px.

### Темная тема

Автоматическая поддержка темной темы через `@media (prefers-color-scheme: dark)`.

## Ограничения

- Максимум 5 одновременных уведомлений
- Максимальная длина сообщения: 200 символов
- Максимальная длина заголовка: 50 символов
- Максимальная длительность отображения: 30 секунд

## Доступность (A11y)

- ARIA атрибуты: `role="alert"`, `aria-live="assertive"`, `aria-atomic="true"`
- Клавиатурная навигация для кнопки закрытия
- Семантическая разметка
- Видимые фокусные состояния

## Безопасность

- XSS защита: все сообщения экранируются React
- Валидация на клиенте через Zod схемы
- Ограничение длины сообщений

## Производительность

- Bundle size: ~3-5KB
- CSS transitions для плавности
- Автоматическая очистка из памяти
- Ограничение количества одновременных уведомлений

## Интеграция

Система уже интегрирована в:

- ✅ Форма создания/редактирования операций (`OperationForm.tsx`)
- ✅ Удаление операций (`OperationsPage.tsx`)
- ✅ Авторизация (`LoginPage.tsx`)

Можно легко добавить в другие компоненты, импортировав `useNotification` хук.

## Примеры

### Пример 1: CRUD операции

```tsx
const { showSuccess, showError } = useNotification();

// Create
try {
  await createItem(data);
  showSuccess('Элемент создан');
} catch (error) {
  showError('Ошибка создания элемента');
}

// Update
try {
  await updateItem(id, data);
  showSuccess('Изменения сохранены');
} catch (error) {
  showError('Ошибка сохранения');
}

// Delete
try {
  await deleteItem(id);
  showSuccess('Элемент удален');
} catch (error) {
  showError('Ошибка удаления элемента');
}
```

### Пример 2: Валидация формы

```tsx
const { showWarning, showError } = useNotification();

const validateForm = (data) => {
  if (!data.email) {
    showWarning('Пожалуйста, введите email');
    return false;
  }

  if (!isValidEmail(data.email)) {
    showError('Некорректный формат email');
    return false;
  }

  return true;
};
```

### Пример 3: Асинхронные операции

```tsx
const { showInfo, showSuccess } = useNotification();

const handleExport = async () => {
  showInfo('Начинается экспорт данных...', undefined, 2000);

  try {
    await exportData();
    showSuccess('Данные успешно экспортированы');
  } catch (error) {
    showError('Ошибка экспорта данных');
  }
};
```

## Будущие улучшения

- [ ] Поддержка звуковых уведомлений
- [ ] Анимация встряхивания для критических ошибок
- [ ] Персистентные уведомления (не закрываются автоматически)
- [ ] История уведомлений
- [ ] Группировка похожих уведомлений
- [ ] Кастомные иконки
- [ ] Действия в уведомлениях (кнопки)

## Решение проблем

### Уведомления не отображаются

1. Проверьте, что `NotificationContainer` добавлен в `App.tsx`
2. Убедитесь, что Redux store настроен корректно
3. Проверьте консоль на ошибки

### Уведомления накладываются друг на друга

Это нормальное поведение - максимум 5 уведомлений. Старые автоматически удаляются.

### Анимация не работает

Убедитесь, что CSS файл `Notification.css` импортирован корректно.

## Техническая документация

- **Локация типов**: `packages/shared/src/types/notifications.ts`
- **Локация схем**: `packages/shared/src/schemas/notifications.ts`
- **Redux slice**: `apps/web/src/store/slices/notificationSlice.ts`
- **React Hook**: `apps/web/src/shared/hooks/useNotification.ts`
- **UI компоненты**: `apps/web/src/components/Notification/`
- **Константы**: `apps/web/src/constants/notificationMessages.ts`

## Лицензия

Часть проекта fin-u-ch. Внутреннее использование.
