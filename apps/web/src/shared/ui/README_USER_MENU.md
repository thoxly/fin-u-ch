# User Menu Implementation

## Обзор

Добавлено новое меню пользователя в хедер приложения с функциональностью выхода и редактирования профиля.

## Компоненты

### UserMenu

- Выпадающее меню с кнопками "Мой профиль" и "Выйти"
- Отображает email пользователя
- Адаптивный дизайн (скрывает email на мобильных устройствах)
- Автоматическое закрытие при клике вне меню

### UserProfileModal

- Модальное окно для редактирования данных пользователя
- Поля: email, имя, фамилия, название компании
- Валидация и обработка ошибок
- Интеграция с API для сохранения изменений

## API Изменения

### authApi.ts

Добавлен новый эндпоинт:

- `updateUser` - PATCH /users/me для обновления данных пользователя

## Использование

```tsx
import { UserMenu, UserProfileModal } from '@/shared/ui';

// В компоненте
<UserMenu
  userEmail={user?.email}
  onProfileClick={() => setProfileModalOpen(true)}
/>

<UserProfileModal
  isOpen={profileModalOpen}
  onClose={() => setProfileModalOpen(false)}
/>
```

## Стили

- Использует Tailwind CSS классы
- Поддержка темной темы
- Адаптивный дизайн
- Иконки из библиотеки Lucide React
