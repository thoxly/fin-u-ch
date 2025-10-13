import { configureStore } from '@reduxjs/toolkit';
import notificationReducer, {
  showNotification,
  hideNotification,
  removeNotification,
  clearNotifications,
} from './notificationSlice';

describe('notificationSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        notification: notificationReducer,
      },
    });
  });

  describe('showNotification', () => {
    it('should add a new notification', () => {
      const params = {
        type: 'success' as const,
        message: 'Test message',
      };

      store.dispatch(showNotification(params));

      const state = store.getState().notification;
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('success');
      expect(state.notifications[0].message).toBe('Test message');
      expect(state.notifications[0].isVisible).toBe(true);
    });

    it('should add notification with title and custom duration', () => {
      const params = {
        type: 'error' as const,
        title: 'Error Title',
        message: 'Error message',
        duration: 10000,
      };

      store.dispatch(showNotification(params));

      const state = store.getState().notification;
      expect(state.notifications[0].title).toBe('Error Title');
      expect(state.notifications[0].duration).toBe(10000);
    });

    it('should use default duration of 5000ms', () => {
      store.dispatch(
        showNotification({ type: 'info', message: 'Info message' })
      );

      const state = store.getState().notification;
      expect(state.notifications[0].duration).toBe(5000);
    });

    it('should limit notifications to 5 maximum', () => {
      // Add 6 notifications
      for (let i = 0; i < 6; i++) {
        store.dispatch(
          showNotification({ type: 'info', message: `Message ${i}` })
        );
      }

      const state = store.getState().notification;
      expect(state.notifications).toHaveLength(5);
      // First notification should be removed
      expect(state.notifications[0].message).toBe('Message 1');
      expect(state.notifications[4].message).toBe('Message 5');
    });

    it('should generate unique id for each notification', () => {
      store.dispatch(
        showNotification({ type: 'success', message: 'Message 1' })
      );
      store.dispatch(
        showNotification({ type: 'success', message: 'Message 2' })
      );

      const state = store.getState().notification;
      expect(state.notifications[0].id).not.toBe(state.notifications[1].id);
    });
  });

  describe('hideNotification', () => {
    it('should mark notification as not visible', () => {
      store.dispatch(
        showNotification({ type: 'success', message: 'Test message' })
      );

      const state1 = store.getState().notification;
      const notificationId = state1.notifications[0].id;
      expect(state1.notifications[0].isVisible).toBe(true);

      store.dispatch(hideNotification(notificationId));

      const state2 = store.getState().notification;
      expect(state2.notifications[0].isVisible).toBe(false);
    });

    it('should not affect other notifications', () => {
      store.dispatch(
        showNotification({ type: 'success', message: 'Message 1' })
      );
      store.dispatch(showNotification({ type: 'error', message: 'Message 2' }));

      const state1 = store.getState().notification;
      const firstId = state1.notifications[0].id;

      store.dispatch(hideNotification(firstId));

      const state2 = store.getState().notification;
      expect(state2.notifications[0].isVisible).toBe(false);
      expect(state2.notifications[1].isVisible).toBe(true);
    });

    it('should do nothing if notification id not found', () => {
      store.dispatch(
        showNotification({ type: 'success', message: 'Test message' })
      );

      store.dispatch(hideNotification('non-existent-id'));

      const state = store.getState().notification;
      expect(state.notifications[0].isVisible).toBe(true);
    });
  });

  describe('removeNotification', () => {
    it('should remove notification from state', () => {
      store.dispatch(
        showNotification({ type: 'success', message: 'Test message' })
      );

      const state1 = store.getState().notification;
      expect(state1.notifications).toHaveLength(1);

      const notificationId = state1.notifications[0].id;
      store.dispatch(removeNotification(notificationId));

      const state2 = store.getState().notification;
      expect(state2.notifications).toHaveLength(0);
    });

    it('should remove only specified notification', () => {
      store.dispatch(
        showNotification({ type: 'success', message: 'Message 1' })
      );
      store.dispatch(showNotification({ type: 'error', message: 'Message 2' }));

      const state1 = store.getState().notification;
      const firstId = state1.notifications[0].id;

      store.dispatch(removeNotification(firstId));

      const state2 = store.getState().notification;
      expect(state2.notifications).toHaveLength(1);
      expect(state2.notifications[0].message).toBe('Message 2');
    });
  });

  describe('clearNotifications', () => {
    it('should remove all notifications', () => {
      store.dispatch(
        showNotification({ type: 'success', message: 'Message 1' })
      );
      store.dispatch(showNotification({ type: 'error', message: 'Message 2' }));
      store.dispatch(
        showNotification({ type: 'warning', message: 'Message 3' })
      );

      const state1 = store.getState().notification;
      expect(state1.notifications).toHaveLength(3);

      store.dispatch(clearNotifications());

      const state2 = store.getState().notification;
      expect(state2.notifications).toHaveLength(0);
    });

    it('should work on empty state', () => {
      store.dispatch(clearNotifications());

      const state = store.getState().notification;
      expect(state.notifications).toHaveLength(0);
    });
  });
});
