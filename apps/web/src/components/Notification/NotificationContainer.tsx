import React, { useEffect } from 'react';
import { useNotification } from '../../shared/hooks/useNotification';
import Notification from './Notification';
import './Notification.css';

/**
 * Контейнер для управления отображением уведомлений
 * - Автоматически скрывает уведомления после истечения duration
 * - Управляет очередью уведомлений
 * - Позиционируется в правом верхнем углу
 */
const NotificationContainer: React.FC = () => {
  const { notifications, hideNotification, removeNotification } =
    useNotification();

  // Автоматическое скрытие уведомлений
  useEffect(() => {
    const visibleNotifications = notifications.filter((n) => n.isVisible);

    const timers = visibleNotifications.map((notification) => {
      const timer = setTimeout(() => {
        hideNotification(notification.id);

        // Удаляем из store после анимации (300ms)
        setTimeout(() => {
          removeNotification(notification.id);
        }, 300);
      }, notification.duration || 5000);

      return { id: notification.id, timer };
    });

    // Очистка таймеров при размонтировании или изменении уведомлений
    return () => {
      timers.forEach(({ timer }) => clearTimeout(timer));
    };
  }, [notifications, hideNotification, removeNotification]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="notification-container"
      aria-live="polite"
      aria-atomic="true"
    >
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={() => {
            hideNotification(notification.id);
            setTimeout(() => removeNotification(notification.id), 300);
          }}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
