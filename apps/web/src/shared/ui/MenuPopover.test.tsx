import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MenuPopover, MenuPopoverItem } from './MenuPopover';

const mockItems: MenuPopoverItem[] = [
  { name: 'Статьи', href: '/catalogs/articles', icon: 'FileText' },
  { name: 'Счета', href: '/catalogs/accounts', icon: 'Wallet' },
  { name: 'Контрагенты', href: '/catalogs/counterparties', icon: 'Users' },
];

const mockOnClose = jest.fn();

const renderMenuPopover = (items: MenuPopoverItem[] = mockItems) => {
  return render(
    <BrowserRouter>
      <MenuPopover
        items={items}
        onClose={mockOnClose}
        anchorPosition={{ top: 100, left: 200 }}
      />
    </BrowserRouter>
  );
};

describe('MenuPopover', () => {
  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should render menu items', () => {
    renderMenuPopover();

    expect(screen.getByText('Статьи')).toBeInTheDocument();
    expect(screen.getByText('Счета')).toBeInTheDocument();
    expect(screen.getByText('Контрагенты')).toBeInTheDocument();
  });

  it('should call onClose when menu item is clicked', () => {
    renderMenuPopover();

    const menuItem = screen.getByText('Статьи');
    fireEvent.click(menuItem);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking outside', () => {
    renderMenuPopover();

    fireEvent.mouseDown(document.body);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when pressing Escape', () => {
    renderMenuPopover();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when clicking inside popover', () => {
    renderMenuPopover();

    const menuItem = screen.getByText('Статьи');
    fireEvent.mouseDown(menuItem);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should apply custom positioning with offset', () => {
    const { container } = renderMenuPopover();

    const popover = container.querySelector('[role="menu"]');
    // Offset is 8px, so 100 + 8 = 108
    expect(popover).toHaveStyle({ top: '108px', left: '200px' });
  });

  it('should render menu items as links with correct href', () => {
    renderMenuPopover();

    const articleLink = screen.getByText('Статьи').closest('a');
    expect(articleLink).toHaveAttribute('href', '/catalogs/articles');

    const accountLink = screen.getByText('Счета').closest('a');
    expect(accountLink).toHaveAttribute('href', '/catalogs/accounts');
  });

  it('should render custom className', () => {
    const { container } = render(
      <BrowserRouter>
        <MenuPopover
          items={mockItems}
          onClose={mockOnClose}
          anchorPosition={{ top: 100, left: 200 }}
          className="custom-class"
        />
      </BrowserRouter>
    );

    const popover = container.querySelector('[role="menu"]');
    expect(popover).toHaveClass('custom-class');
  });

  it('should render empty state when no items provided', () => {
    renderMenuPopover([]);

    expect(screen.getByText('Нет доступных пунктов')).toBeInTheDocument();
  });

  it('should render default icon when icon is not provided', () => {
    const itemsWithoutIcon: MenuPopoverItem[] = [
      { name: 'Test Item', href: '/test' },
    ];

    renderMenuPopover(itemsWithoutIcon);

    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('should not render icons in menu items', () => {
    renderMenuPopover();

    // Icons should not be rendered in the menu items
    const menuItems = screen.getAllByRole('menuitem');
    menuItems.forEach((menuItem) => {
      const icon = menuItem.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });
  });

  it('should have proper ARIA attributes', () => {
    renderMenuPopover();

    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('aria-orientation', 'vertical');

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(mockItems.length);
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderMenuPopover();

    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mousedown',
      expect.any(Function)
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  it('should position popover on the right when position="right"', () => {
    const { container } = render(
      <BrowserRouter>
        <MenuPopover
          items={mockItems}
          onClose={mockOnClose}
          anchorPosition={{ top: 100, left: 200, right: 300 }}
          position="right"
        />
      </BrowserRouter>
    );

    const popover = container.querySelector('[role="menu"]');
    // Offset is 8px, so 100 + 8 = 108
    expect(popover).toHaveStyle({ top: '108px', left: '300px' });
  });

  it('should render create action button when provided', () => {
    const mockCreateAction = jest.fn();

    render(
      <BrowserRouter>
        <MenuPopover
          items={mockItems}
          onClose={mockOnClose}
          anchorPosition={{ top: 100, left: 200 }}
          createAction={{
            label: 'Создать новый',
            icon: 'Plus',
            onClick: mockCreateAction,
          }}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Создать новый')).toBeInTheDocument();
  });

  it('should call createAction onClick and close popover', () => {
    const mockCreateAction = jest.fn();

    render(
      <BrowserRouter>
        <MenuPopover
          items={mockItems}
          onClose={mockOnClose}
          anchorPosition={{ top: 100, left: 200 }}
          createAction={{
            label: 'Создать новый',
            onClick: mockCreateAction,
          }}
        />
      </BrowserRouter>
    );

    const createButton = screen.getByText('Создать новый');
    fireEvent.click(createButton);

    expect(mockCreateAction).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should render create action with proper styling', () => {
    render(
      <BrowserRouter>
        <MenuPopover
          items={mockItems}
          onClose={mockOnClose}
          anchorPosition={{ top: 100, left: 200 }}
          createAction={{
            label: 'Создать новый',
            onClick: jest.fn(),
          }}
        />
      </BrowserRouter>
    );

    const createButton = screen.getByText('Создать новый');
    expect(createButton).toHaveClass('font-medium');
    expect(createButton.closest('button')).toHaveClass('text-primary-600');
  });

  it('should not show empty state when createAction is provided', () => {
    render(
      <BrowserRouter>
        <MenuPopover
          items={[]}
          onClose={mockOnClose}
          anchorPosition={{ top: 100, left: 200 }}
          createAction={{
            label: 'Создать новый',
            onClick: jest.fn(),
          }}
        />
      </BrowserRouter>
    );

    expect(screen.queryByText('Нет доступных пунктов')).not.toBeInTheDocument();
    expect(screen.getByText('Создать новый')).toBeInTheDocument();
  });
});
