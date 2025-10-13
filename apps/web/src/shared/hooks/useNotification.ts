import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import {
  showNotification as showNotificationAction,
  hideNotification as hideNotificationAction,
  removeNotification as removeNotificationAction,
  clearNotifications as clearNotificationsAction,
} from '../../store/slices/notificationSlice';
import { CreateNotificationParams } from '@fin-u-ch/shared';

/**
 * Хук для работы с системой уведомлений
 *
 * @example
 * ```tsx
 * const { showSuccess, showError } = useNotification();
 *
 * const handleSubmit = async () => {
 *   try {
 *     await api.createOperation(data);
 *     showSuccess('Операция создана');
 *   } catch (error) {
 *     showError('Ошибка создания операции');
 *   }
 * };
 * ```
 */
export const useNotification = () => {
  const dispatch = useDispatch<AppDispatch>();
  const notifications = useSelector(
    (state: RootState) => state.notification.notifications
  );

  const showNotification = useCallback(
    (params: CreateNotificationParams) => {
      dispatch(showNotificationAction(params));
    },
    [dispatch]
  );

  const hideNotification = useCallback(
    (id: string) => {
      dispatch(hideNotificationAction(id));
    },
    [dispatch]
  );

  const removeNotification = useCallback(
    (id: string) => {
      dispatch(removeNotificationAction(id));
    },
    [dispatch]
  );

  const clearNotifications = useCallback(() => {
    dispatch(clearNotificationsAction());
  }, [dispatch]);

  // Вспомогательные методы для типичных сценариев
  const showSuccess = useCallback(
    (message: string, title?: string, duration?: number) => {
      showNotification({ type: 'success', title, message, duration });
    },
    [showNotification]
  );

  const showError = useCallback(
    (message: string, title?: string, duration?: number) => {
      showNotification({ type: 'error', title, message, duration });
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string, title?: string, duration?: number) => {
      showNotification({ type: 'warning', title, message, duration });
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (message: string, title?: string, duration?: number) => {
      showNotification({ type: 'info', title, message, duration });
    },
    [showNotification]
  );

  return {
    notifications,
    showNotification,
    hideNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
