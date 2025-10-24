import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { UserMenu } from './UserMenu';

// Mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: () => ({
        user: {
          id: '1',
          email: 'test@example.com',
          companyId: '1',
        },
        isAuthenticated: true,
      }),
    },
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
  const mockOnProfileClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user email when provided', () => {
    renderWithProviders(
      <UserMenu
        userEmail="test@example.com"
        onProfileClick={mockOnProfileClick}
      />
    );

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders default text when user email is not provided', () => {
    renderWithProviders(
      <UserMenu userEmail={undefined} onProfileClick={mockOnProfileClick} />
    );

    expect(screen.getByText('Пользователь')).toBeInTheDocument();
  });

  it('opens dropdown menu when clicked', async () => {
    renderWithProviders(
      <UserMenu
        userEmail="test@example.com"
        onProfileClick={mockOnProfileClick}
      />
    );

    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    await waitFor(
      () => {
        expect(screen.getByText('Мой профиль')).toBeInTheDocument();
        expect(screen.getByText('Выйти')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  }, 10000);

  it('calls onProfileClick when profile button is clicked', async () => {
    renderWithProviders(
      <UserMenu
        userEmail="test@example.com"
        onProfileClick={mockOnProfileClick}
      />
    );

    const menuButton = screen.getByRole('button');
    fireEvent.click(menuButton);

    await waitFor(() => {
      const profileButton = screen.getByText('Мой профиль');
      fireEvent.click(profileButton);
    });

    expect(mockOnProfileClick).toHaveBeenCalledTimes(1);
  });

  it('closes dropdown when clicking outside', async () => {
    renderWithProviders(
      <UserMenu
        userEmail="test@example.com"
        onProfileClick={mockOnProfileClick}
      />
    );

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
    renderWithProviders(
      <UserMenu
        userEmail="test@example.com"
        onProfileClick={mockOnProfileClick}
      />
    );

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
