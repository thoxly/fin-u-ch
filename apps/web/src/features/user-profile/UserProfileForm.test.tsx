import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { UserProfileForm } from './UserProfileForm';

// Mock the authApi and companiesApi
const mockUseGetMeQuery = jest.fn();
const mockUseUpdateUserMutation = jest.fn();
const mockUseUpdateCompanyMutation = jest.fn();

jest.mock('../../store/api/authApi', () => ({
  useGetMeQuery: () => mockUseGetMeQuery(),
  useUpdateUserMutation: () => mockUseUpdateUserMutation(),
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

describe('UserProfileForm', () => {
  const mockOnClose = jest.fn();
  const mockUpdateUser = jest.fn();
  const mockUpdateCompany = jest.fn();

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
  });

  it('renders form with user data', () => {
    renderWithProviders(<UserProfileForm onClose={mockOnClose} />);

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
    expect(screen.getByText('Базовая валюта')).toBeInTheDocument();
  });

  it('updates form fields when user types', async () => {
    renderWithProviders(<UserProfileForm onClose={mockOnClose} />);

    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    expect(emailInput).toHaveValue('newemail@example.com');
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
        email: 'test@example.com',
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
