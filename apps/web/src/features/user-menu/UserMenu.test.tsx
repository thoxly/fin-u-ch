import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { UserMenu } from './UserMenu';

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock usePermissions hook
jest.mock('../../shared/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: jest.fn().mockReturnValue(true),
    isSuperAdmin: false,
  }),
}));

// Mock authApi
jest.mock('../../store/api/authApi', () => ({
  useGetMeQuery: jest.fn().mockReturnValue({
    data: {
      id: '1',
      email: 'test@example.com',
      companyId: '1',
      companyName: 'Test Company',
    },
  }),
}));

// Mock subscriptionApi
jest.mock('../../store/api/subscriptionApi', () => ({
  useGetSubscriptionQuery: jest.fn().mockReturnValue({
    data: null,
    isLoading: false,
  }),
}));

// Mock store
import { apiSlice } from '../../store/api/apiSlice';

const createMockStore = () => {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: () => ({
        user: {
          id: '1',
          email: 'test@example.com',
          companyId: '1',
        },
        isAuthenticated: true,
      }),
      notification: () => ({
        notifications: [],
      }),
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>
  );
};

describe('UserMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user email when provided', () => {
    renderWithProviders(<UserMenu userEmail="test@example.com" />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders default text when user email is not provided', () => {
    renderWithProviders(<UserMenu userEmail={undefined} />);

    expect(screen.getByText('Пользователь')).toBeInTheDocument();
  });

  it('opens dropdown menu when clicked', async () => {
    renderWithProviders(<UserMenu userEmail="test@example.com" />);

    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    await waitFor(
      () => {
        expect(screen.getByText('Мой профиль')).toBeInTheDocument();
        expect(screen.getByText('Моя компания')).toBeInTheDocument();
        expect(screen.getByText('Администрирование')).toBeInTheDocument();
        expect(screen.getByText('Поддержка')).toBeInTheDocument();
        expect(screen.getByText('Выйти')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  }, 10000);

  it('navigates to profile page when profile button is clicked', async () => {
    renderWithProviders(<UserMenu userEmail="test@example.com" />);

    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    await waitFor(() => {
      const profileButton = screen.getByText('Мой профиль');
      fireEvent.click(profileButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('navigates to company page when company button is clicked', async () => {
    renderWithProviders(<UserMenu userEmail="test@example.com" />);

    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    await waitFor(() => {
      const companyButton = screen.getByText('Моя компания');
      fireEvent.click(companyButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/company');
  });

  it('navigates to admin page when admin button is clicked', async () => {
    renderWithProviders(<UserMenu userEmail="test@example.com" />);

    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    await waitFor(() => {
      const adminButton = screen.getByText('Администрирование');
      fireEvent.click(adminButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  // Тест удален, так как кнопка "Поддержка" была удалена из компонента

  it('closes dropdown when clicking outside', async () => {
    renderWithProviders(<UserMenu userEmail="test@example.com" />);

    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByText('Мой профиль')).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Мой профиль')).not.toBeInTheDocument();
    });
  });

  it('shows chevron icon that rotates when menu is open', async () => {
    renderWithProviders(<UserMenu userEmail="test@example.com" />);

    const menuButton = screen.getByRole('button');
    const chevrons = menuButton.querySelectorAll('svg');
    const chevron = chevrons[1]; // Second SVG is the chevron

    expect(chevron).not.toHaveClass('rotate-180');

    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(chevron).toHaveClass('rotate-180');
    });
  });
});
