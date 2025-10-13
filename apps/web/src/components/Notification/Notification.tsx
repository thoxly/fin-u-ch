import React from 'react';
import { Notification as NotificationType } from '@fin-u-ch/shared';
import './Notification.css';

interface NotificationProps {
  notification: NotificationType;
  onClose: () => void;
}

/**
 * Компонент отдельного уведомления
 * Поддерживает 4 типа: success, error, warning, info
 */
const Notification: React.FC<NotificationProps> = ({
  notification,
  onClose,
}) => {
  const { type, title, message, isVisible } = notification;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'success':
        return 'Успешно';
      case 'error':
        return 'Ошибка';
      case 'warning':
        return 'Предупреждение';
      case 'info':
        return 'Информация';
      default:
        return 'Уведомление';
    }
  };

  return (
    <div
      className={`notification notification-${type} ${isVisible ? 'visible' : 'hidden'}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="notification-content">
        <span className="notification-icon" aria-hidden="true">
          {getIcon()}
        </span>
        <div className="notification-body">
          <div className="notification-title">{title || getDefaultTitle()}</div>
          <div className="notification-message">{message}</div>
        </div>
        <button
          className="notification-close"
          onClick={onClose}
          aria-label="Закрыть уведомление"
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification;
