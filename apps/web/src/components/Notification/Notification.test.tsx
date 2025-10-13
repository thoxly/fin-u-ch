import { render, screen, fireEvent } from '@testing-library/react';
import Notification from './Notification';
import type { Notification as NotificationType } from '@fin-u-ch/shared';

describe('Notification', () => {
  const mockOnClose = jest.fn();

  const createNotification = (
    overrides?: Partial<NotificationType>
  ): NotificationType => ({
    id: 'test-id',
    type: 'success',
    message: 'Test message',
    isVisible: true,
    createdAt: Date.now(),
    duration: 5000,
    ...overrides,
  });

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should render notification message', () => {
    const notification = createNotification();
    render(<Notification notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render default title for success type', () => {
    const notification = createNotification({ type: 'success' });
    render(<Notification notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('Успешно')).toBeInTheDocument();
  });

  it('should render default title for error type', () => {
    const notification = createNotification({ type: 'error' });
    render(<Notification notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('Ошибка')).toBeInTheDocument();
  });

  it('should render default title for warning type', () => {
    const notification = createNotification({ type: 'warning' });
    render(<Notification notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('Предупреждение')).toBeInTheDocument();
  });

  it('should render default title for info type', () => {
    const notification = createNotification({ type: 'info' });
    render(<Notification notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('Информация')).toBeInTheDocument();
  });

  it('should render custom title when provided', () => {
    const notification = createNotification({ title: 'Custom Title' });
    render(<Notification notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const notification = createNotification();
    render(<Notification notification={notification} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Закрыть уведомление');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should have visible class when isVisible is true', () => {
    const notification = createNotification({ isVisible: true });
    const { container } = render(
      <Notification notification={notification} onClose={mockOnClose} />
    );

    const notificationElement = container.querySelector('.notification');
    expect(notificationElement).toHaveClass('visible');
  });

  it('should have hidden class when isVisible is false', () => {
    const notification = createNotification({ isVisible: false });
    const { container } = render(
      <Notification notification={notification} onClose={mockOnClose} />
    );

    const notificationElement = container.querySelector('.notification');
    expect(notificationElement).toHaveClass('hidden');
  });

  it('should have correct type class', () => {
    const notification = createNotification({ type: 'error' });
    const { container } = render(
      <Notification notification={notification} onClose={mockOnClose} />
    );

    const notificationElement = container.querySelector('.notification');
    expect(notificationElement).toHaveClass('notification-error');
  });

  it('should render success icon', () => {
    const notification = createNotification({ type: 'success' });
    render(<Notification notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('should render error icon', () => {
    const notification = createNotification({ type: 'error' });
    render(<Notification notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('❌')).toBeInTheDocument();
  });

  it('should render warning icon', () => {
    const notification = createNotification({ type: 'warning' });
    render(<Notification notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('should render info icon', () => {
    const notification = createNotification({ type: 'info' });
    render(<Notification notification={notification} onClose={mockOnClose} />);

    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('should have ARIA attributes', () => {
    const notification = createNotification();
    const { container } = render(
      <Notification notification={notification} onClose={mockOnClose} />
    );

    const notificationElement = container.querySelector('.notification');
    expect(notificationElement).toHaveAttribute('role', 'alert');
    expect(notificationElement).toHaveAttribute('aria-live', 'assertive');
    expect(notificationElement).toHaveAttribute('aria-atomic', 'true');
  });
});
