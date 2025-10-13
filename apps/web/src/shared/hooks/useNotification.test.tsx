import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useNotification } from './useNotification';
import notificationReducer from '../../store/slices/notificationSlice';
import { ReactNode } from 'react';

const createWrapper = () => {
  const store = configureStore({
    reducer: {
      notification: notificationReducer,
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useNotification', () => {
  it('should provide notification methods', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: createWrapper(),
    });

    expect(result.current.showNotification).toBeDefined();
    expect(result.current.hideNotification).toBeDefined();
    expect(result.current.removeNotification).toBeDefined();
    expect(result.current.clearNotifications).toBeDefined();
    expect(result.current.showSuccess).toBeDefined();
    expect(result.current.showError).toBeDefined();
    expect(result.current.showWarning).toBeDefined();
    expect(result.current.showInfo).toBeDefined();
  });

  it('should show success notification', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.showSuccess('Success message');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('success');
    expect(result.current.notifications[0].message).toBe('Success message');
  });

  it('should show error notification', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.showError('Error message');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('error');
    expect(result.current.notifications[0].message).toBe('Error message');
  });

  it('should show warning notification', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.showWarning('Warning message');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('warning');
    expect(result.current.notifications[0].message).toBe('Warning message');
  });

  it('should show info notification', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.showInfo('Info message');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('info');
    expect(result.current.notifications[0].message).toBe('Info message');
  });

  it('should show notification with custom title and duration', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.showSuccess('Message', 'Custom Title', 10000);
    });

    expect(result.current.notifications[0].title).toBe('Custom Title');
    expect(result.current.notifications[0].duration).toBe(10000);
  });

  it('should hide notification', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.showSuccess('Test message');
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.hideNotification(notificationId);
    });

    expect(result.current.notifications[0].isVisible).toBe(false);
  });

  it('should remove notification', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.showSuccess('Test message');
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should clear all notifications', () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.showSuccess('Message 1');
      result.current.showError('Message 2');
      result.current.showWarning('Message 3');
    });

    expect(result.current.notifications).toHaveLength(3);

    act(() => {
      result.current.clearNotifications();
    });

    expect(result.current.notifications).toHaveLength(0);
  });
});
