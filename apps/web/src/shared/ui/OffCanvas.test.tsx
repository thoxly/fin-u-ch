// src/components/OffCanvas/OffCanvas.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { OffCanvas } from './OffCanvas';

describe('OffCanvas', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
    // Очистим body от предыдущих классов
    document.body.className = '';
  });

  it('renders children and title when open', () => {
    render(
      <OffCanvas isOpen={true} onClose={onClose} title="Test Drawer">
        <div data-testid="offcanvas-content">Test Content</div>
      </OffCanvas>
    );

    expect(screen.getByText('Test Drawer')).toBeInTheDocument();
    expect(screen.getByTestId('offcanvas-content')).toBeInTheDocument();
  });

  it('keeps content in DOM when closed (for state preservation)', () => {
    render(
      <OffCanvas isOpen={false} onClose={onClose} title="Test Drawer">
        <div data-testid="offcanvas-content">Hidden Content</div>
      </OffCanvas>
    );

    expect(screen.getByTestId('offcanvas-content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <OffCanvas isOpen={true} onClose={onClose} title="Test Drawer">
        <div>Content</div>
      </OffCanvas>
    );

    fireEvent.click(screen.getByLabelText('Закрыть'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking on overlay', () => {
    render(
      <OffCanvas isOpen={true} onClose={onClose} title="Test Drawer">
        <div>Content</div>
      </OffCanvas>
    );

    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
