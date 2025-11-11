import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { UserProfileForm } from './UserProfileForm';

// Mock the authApi and companiesApi
const mockUseGetMeQuery = jest.fn();
const mockUseUpdateUserMutation = jest.fn();
const mockUseChangePasswordMutation = jest.fn();
const mockUseRequestEmailChangeMutation = jest.fn();
const mockUseUpdateCompanyMutation = jest.fn();

jest.mock('../../store/api/authApi', () => ({
  useGetMeQuery: () => mockUseGetMeQuery(),
  useUpdateUserMutation: () => mockUseUpdateUserMutation(),
  useChangePasswordMutation: () => mockUseChangePasswordMutation(),
  useRequestEmailChangeMutation: () => mockUseRequestEmailChangeMutation(),
}));

jest.mock('../../store/api/companiesApi', () => ({
  useUpdateCompanyMutation: () => mockUseUpdateCompanyMutation(),
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
      notification: () => ({
        notifications: [],
      }),
    },
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('UserProfileForm', () => {
  const mockOnClose = jest.fn();
  const mockUpdateUser = jest.fn();
  const mockUpdateCompany = jest.fn();
  const mockChangePassword = jest.fn();
  const mockRequestEmailChange = jest.fn();

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
        company: {
          currencyBase: 'USD',
        },
      },
      isLoading: false,
    });

    mockUseUpdateUserMutation.mockReturnValue([
      mockUpdateUser,
      { isLoading: false },
    ]);

    mockUseUpdateCompanyMutation.mockReturnValue([
      mockUpdateCompany,
      { isLoading: false },
    ]);

    mockUseChangePasswordMutation.mockReturnValue([
      mockChangePassword,
      { isLoading: false },
    ]);

    mockUseRequestEmailChangeMutation.mockReturnValue([
      mockRequestEmailChange,
      { isLoading: false },
    ]);
  });

  it('renders form with user data', async () => {
    renderWithProviders(<UserProfileForm onClose={mockOnClose} />);

    // Email is displayed as text, not input
    expect(await screen.findByText('test@example.com')).toBeInTheDocument();
    // Other fields are set via useEffect, so we need to wait for them
    expect(await screen.findByDisplayValue('John')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Doe')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Test Company')).toBeInTheDocument();
    expect(screen.getByText('Базовая валюта')).toBeInTheDocument();
  });

  it('updates form fields when user types', async () => {
    renderWithProviders(<UserProfileForm onClose={mockOnClose} />);

    // Wait for form to be populated, then find firstName input to test
    const firstNameInput = await screen.findByDisplayValue('John');
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });

    expect(firstNameInput).toHaveValue('Jane');
  });

  it('calls updateUser and updateCompany when save button is clicked', async () => {
    const mockUnwrapUser = jest.fn().mockResolvedValue({});
    const mockUnwrapCompany = jest.fn().mockResolvedValue({});
    mockUpdateUser.mockReturnValue({ unwrap: mockUnwrapUser });
    mockUpdateCompany.mockReturnValue({ unwrap: mockUnwrapCompany });

    renderWithProviders(<UserProfileForm onClose={mockOnClose} />);

    const saveButton = screen.getByRole('button', { name: /сохранить/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(mockUpdateCompany).toHaveBeenCalledWith({
        name: 'Test Company',
        currencyBase: 'USD',
      });
    });
  });

  it('shows loading state when updating user', () => {
    mockUseUpdateUserMutation.mockReturnValue([
      mockUpdateUser,
      { isLoading: true },
    ]);
    mockUseUpdateCompanyMutation.mockReturnValue([
      mockUpdateCompany,
      { isLoading: false },
    ]);

    renderWithProviders(<UserProfileForm onClose={mockOnClose} />);

    expect(screen.getByText('Сохранение...')).toBeInTheDocument();
  });

  it('shows loading state when updating company', () => {
    mockUseUpdateUserMutation.mockReturnValue([
      mockUpdateUser,
      { isLoading: false },
    ]);
    mockUseUpdateCompanyMutation.mockReturnValue([
      mockUpdateCompany,
      { isLoading: true },
    ]);

    renderWithProviders(<UserProfileForm onClose={mockOnClose} />);

    expect(screen.getByText('Сохранение...')).toBeInTheDocument();
  });

  it('shows loading spinner when user data is loading', () => {
    mockUseGetMeQuery.mockReturnValue({
      data: null,
      isLoading: true,
    });

    renderWithProviders(<UserProfileForm onClose={mockOnClose} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    renderWithProviders(<UserProfileForm onClose={mockOnClose} />);

    const cancelButton = screen.getByRole('button', { name: /отмена/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
