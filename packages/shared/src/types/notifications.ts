/** Типы уведомлений */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/** Интерфейс уведомления */
export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number; // в миллисекундах, по умолчанию 5000
  isVisible: boolean;
  createdAt: number; // timestamp
}

/** Конфигурация для создания уведомления */
export interface CreateNotificationParams {
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
}

/** Состояние системы уведомлений */
export interface NotificationState {
  notifications: Notification[];
  maxVisible: number; // максимальное количество одновременно видимых уведомлений
}

/** Действия для управления уведомлениями */
export interface NotificationActions {
  showNotification: (params: CreateNotificationParams) => void;
  hideNotification: (id: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}
