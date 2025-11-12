import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Layout } from './Layout';

// Mock CatalogFormRenderer
jest.mock('./CatalogFormRenderer', () => ({
  CatalogFormRenderer: ({
    catalogType,
    onClose,
  }: {
    catalogType: string;
    onClose: () => void;
  }) => (
    <div data-testid="catalog-form-renderer">
      <div>Form for: {catalogType}</div>
      <button onClick={onClose}>Close Form</button>
    </div>
  ),
}));

// Mock navigation icons hook
const mockGetIcon = jest.fn((name: string) => {
  const icons: Record<string, string> = {
    Дашборд: 'LayoutDashboard',
    Операции: 'Receipt',
    Планы: 'ClipboardList',
    Отчеты: 'BarChart3',
    Справочники: 'FolderOpen',
    Статьи: 'FileText',
    Счета: 'Wallet',
    Контрагенты: 'Users',
  };
  return icons[name] || 'Circle';
});

const mockUpdateIcon = jest.fn();

jest.mock('../hooks/useNavigationIcons', () => ({
  useNavigationIcons: () => ({
    getIcon: mockGetIcon,
    updateIcon: mockUpdateIcon,
    isLoading: false,
  }),
}));

// Mock the useGetMeQuery hook
jest.mock('../../store/api/authApi', () => ({
  useGetMeQuery: () => ({
    data: { email: 'test@example.com', id: 'user-1', isSuperAdmin: false },
    isLoading: false,
  }),
}));

// Mock usePermissions hook
jest.mock('../hooks/usePermissions', () => ({
  usePermissions: () => {
    const checkPermission = () => true;
    return {
      hasPermission: checkPermission,
      isLoading: false,
      permissions: {
        articles: ['read', 'create', 'update', 'delete'],
        accounts: ['read', 'create', 'update', 'delete'],
        departments: ['read', 'create', 'update', 'delete'],
        counterparties: ['read', 'create', 'update', 'delete'],
        deals: ['read', 'create', 'update', 'delete'],
        salaries: ['read', 'create', 'update', 'delete'],
        operations: ['read', 'create', 'update', 'delete'],
        plans: ['read', 'create', 'update', 'delete'],
        budgets: ['read', 'create', 'update', 'delete'],
        reports: ['read'],
        users: ['read', 'create', 'update', 'delete'],
      },
      canRead: checkPermission,
      canCreate: checkPermission,
      canUpdate: checkPermission,
      canDelete: checkPermission,
      canManageRoles: checkPermission,
    };
  },
}));

// Mock companiesApi
jest.mock('../../store/api/companiesApi', () => ({
  useGetUiSettingsQuery: () => ({
    data: { navigationIcons: {} },
    isLoading: false,
  }),
  useUpdateUiSettingsMutation: () => [
    jest.fn().mockResolvedValue({ unwrap: jest.fn() }),
    { isLoading: false },
  ],
}));

import { apiSlice } from '../../store/api/apiSlice';

// Create a mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: (state = { user: null, token: null }) => state,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(apiSlice.middleware),
  });
};

const renderLayout = (children: React.ReactNode = <div>Test Content</div>) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <Layout>{children}</Layout>
      </BrowserRouter>
    </Provider>
  );
};

describe('Layout - MenuPopover Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render navigation with Справочники item', () => {
    renderLayout();

    expect(screen.getByText('Справочники')).toBeInTheDocument();
  });

  it('should render Справочники as clickable button', () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    expect(catalogButton).toBeInTheDocument();
    expect(catalogButton).toHaveClass('cursor-pointer');
  });

  it('should show chevron icon for Справочники', () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    expect(catalogButton).toBeInTheDocument();
    // The ChevronRight icon should be rendered
    const svg = catalogButton?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should open MenuPopover when Справочники is clicked', async () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    expect(catalogButton).toBeInTheDocument();

    if (catalogButton) {
      fireEvent.click(catalogButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Статьи')).toBeInTheDocument();
      expect(screen.getByText('Счета')).toBeInTheDocument();
      expect(screen.getByText('Контрагенты')).toBeInTheDocument();
      expect(screen.getByText('Сделки')).toBeInTheDocument();
      expect(screen.getByText('Зарплаты')).toBeInTheDocument();
    });
  });

  it('should open MenuPopover when Enter key is pressed on Справочники', async () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    expect(catalogButton).toBeInTheDocument();

    if (catalogButton) {
      fireEvent.keyDown(catalogButton, { key: 'Enter' });
    }

    await waitFor(() => {
      expect(screen.getByText('Статьи')).toBeInTheDocument();
    });
  });

  it('should open MenuPopover when Space key is pressed on Справочники', async () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    expect(catalogButton).toBeInTheDocument();

    if (catalogButton) {
      fireEvent.keyDown(catalogButton, { key: ' ' });
    }

    await waitFor(() => {
      expect(screen.getByText('Статьи')).toBeInTheDocument();
    });
  });

  it('should close MenuPopover when close button is clicked', async () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    if (catalogButton) {
      fireEvent.click(catalogButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Статьи')).toBeInTheDocument();
    });

    // Click outside to close the popover
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Статьи')).not.toBeInTheDocument();
    });
  });

  it('should close MenuPopover when a menu item is clicked', async () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    if (catalogButton) {
      fireEvent.click(catalogButton);
    }

    await waitFor(() => {
      expect(screen.getByText('Статьи')).toBeInTheDocument();
    });

    const articleLink = screen.getByText('Статьи');
    fireEvent.click(articleLink);

    await waitFor(() => {
      expect(screen.queryByText('Статьи')).not.toBeInTheDocument();
    });
  });

  it('should not open MenuPopover for items without children', () => {
    renderLayout();

    const dashboardLink = screen.getByText('Дашборд').closest('a');
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).not.toHaveAttribute('role', 'button');
  });

  it('should prevent icon button click from triggering menu', async () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    expect(catalogButton).toBeInTheDocument();

    if (catalogButton) {
      const iconButton = catalogButton.querySelector(
        'button[title="Изменить иконку"]'
      );
      expect(iconButton).toBeInTheDocument();

      if (iconButton) {
        fireEvent.click(iconButton);
      }
    }

    // Menu should not open, but icon picker should
    await waitFor(() => {
      const menuHeader = screen.queryByText('Меню');
      expect(menuHeader).not.toBeInTheDocument();
    });
  });

  it('should render child content', () => {
    renderLayout(<div>Custom Content</div>);

    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes for Справочники', () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    expect(catalogButton).toHaveAttribute('role', 'button');
    expect(catalogButton).toHaveAttribute('tabIndex', '0');
  });

  it('should not trigger menu when other keys are pressed', () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    expect(catalogButton).toBeInTheDocument();

    if (catalogButton) {
      fireEvent.keyDown(catalogButton, { key: 'a' });
    }

    const menuHeader = screen.queryByText('Меню');
    expect(menuHeader).not.toBeInTheDocument();
  });

  it('should show create action buttons for each catalog item', async () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    if (catalogButton) {
      fireEvent.click(catalogButton);
    }

    await waitFor(() => {
      expect(screen.getByLabelText('Создать статью')).toBeInTheDocument();
      expect(screen.getByLabelText('Создать счет')).toBeInTheDocument();
      expect(screen.getByLabelText('Создать контрагента')).toBeInTheDocument();
    });
  });

  it('should open OffCanvas when create action is clicked for a specific catalog', async () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    if (catalogButton) {
      fireEvent.click(catalogButton);
    }

    await waitFor(() => {
      expect(screen.getByLabelText('Создать статью')).toBeInTheDocument();
    });

    const createButton = screen.getByLabelText('Создать статью');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByTestId('catalog-form-renderer')).toBeInTheDocument();
    });
  });

  it('should not show icons in menu items', async () => {
    renderLayout();

    const catalogButton = screen
      .getByText('Справочники')
      .closest('[role="button"]');
    if (catalogButton) {
      fireEvent.click(catalogButton);
    }

    await waitFor(() => {
      const menuItem = screen.getByText('Статьи').closest('[role="menuitem"]');
      expect(menuItem).toBeInTheDocument();
      // Icons should not be rendered in the menu items
      const icon = menuItem?.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });
  });
});
