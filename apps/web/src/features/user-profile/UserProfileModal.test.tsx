import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { UserProfileModal } from './UserProfileModal';

// Mock the authApi
const mockUseGetMeQuery = jest.fn();
const mockUseUpdateUserMutation = jest.fn();

jest.mock('../../store/api/authApi', () => ({
  useGetMeQuery: () => mockUseGetMeQuery(),
  useUpdateUserMutation: () => mockUseUpdateUserMutation(),
}));

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

describe('UserProfileModal', () => {
  const mockOnClose = jest.fn();
  const mockUpdateUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGetMeQuery.mockReturnValue({
      data: {
        id: '1',
        email: 'test@example.com',
        companyId: '1',
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Test Company',
      },
      isLoading: false,
    });

    mockUseUpdateUserMutation.mockReturnValue([
      mockUpdateUser,
      { isLoading: false },
    ]);
  });

  it('renders modal when isOpen is true', () => {
    renderWithProviders(
      <UserProfileModal isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Мой профиль')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
  });

  it('does not render modal when isOpen is false', () => {
    renderWithProviders(
      <UserProfileModal isOpen={false} onClose={mockOnClose} />
    );

    expect(screen.queryByText('Мой профиль')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderWithProviders(
      <UserProfileModal isOpen={true} onClose={mockOnClose} />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates form fields when user types', async () => {
    renderWithProviders(
      <UserProfileModal isOpen={true} onClose={mockOnClose} />
    );

    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    expect(emailInput).toHaveValue('newemail@example.com');
  });

  it('calls updateUser when save button is clicked', async () => {
    mockUpdateUser.mockResolvedValue({ unwrap: () => Promise.resolve() });

    renderWithProviders(
      <UserProfileModal isOpen={true} onClose={mockOnClose} />
    );

    const saveButton = screen.getByRole('button', { name: /сохранить/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Test Company',
      });
    });
  });

  it('shows loading state when updating', () => {
    mockUseUpdateUserMutation.mockReturnValue([
      mockUpdateUser,
      { isLoading: true },
    ]);

    renderWithProviders(
      <UserProfileModal isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Сохранение...')).toBeInTheDocument();
  });

  it('shows loading spinner when user data is loading', () => {
    mockUseGetMeQuery.mockReturnValue({
      data: null,
      isLoading: true,
    });

    renderWithProviders(
      <UserProfileModal isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    renderWithProviders(
      <UserProfileModal isOpen={true} onClose={mockOnClose} />
    );

    const cancelButton = screen.getByRole('button', { name: /отмена/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('restores original data when modal is closed', async () => {
    renderWithProviders(
      <UserProfileModal isOpen={true} onClose={mockOnClose} />
    );

    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'changed@example.com' } });

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // Re-open modal
    renderWithProviders(
      <UserProfileModal isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });
});
