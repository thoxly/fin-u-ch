import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification, CreateNotificationParams } from '@fin-u-ch/shared';

interface NotificationState {
  notifications: Notification[];
}

const initialState: NotificationState = {
  notifications: [],
};

/**
 * Генерирует UUID с fallback для старых браузеров
 */
const generateId = (): string => {
  // Пробуем использовать crypto.randomUUID() если доступен
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  // Fallback: генерируем UUID v4 вручную
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Redux slice для управления системой уведомлений
 */
export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    /**
     * Показать новое уведомление
     */
    showNotification: (
      state,
      action: PayloadAction<CreateNotificationParams>
    ) => {
      const { type, title, message, duration = 5000 } = action.payload;

      // Генерируем UUID для уведомления
      const id = generateId();

      const notification: Notification = {
        id,
        type,
        title,
        message,
        duration,
        isVisible: true,
        createdAt: Date.now(),
      };

      state.notifications.push(notification);

      // Ограничиваем количество уведомлений до 5
      if (state.notifications.length > 5) {
        state.notifications.shift();
      }
    },

    /**
     * Скрыть уведомление (начать анимацию исчезновения)
     */
    hideNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(
        (n) => n.id === action.payload
      );
      if (notification) {
        notification.isVisible = false;
      }
    },

    /**
     * Удалить уведомление из store (после анимации)
     */
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },

    /**
     * Очистить все уведомления
     */
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  showNotification,
  hideNotification,
  removeNotification,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
