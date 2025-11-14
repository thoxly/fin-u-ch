import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { SmartLoginButton } from '../SmartLoginButton';
import authReducer from '../../store/slices/authSlice';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const createMockStore = (isAuthenticated: boolean) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      notification: (state = { notifications: [] }) => state,
    },
    preloadedState: {
      auth: {
        user: isAuthenticated
          ? { id: '1', email: 'test@test.com', companyId: '1' }
          : null,
        accessToken: isAuthenticated ? 'token' : null,
        refreshToken: isAuthenticated ? 'refresh' : null,
        isAuthenticated,
      },
      notification: {
        notifications: [],
      },
    },
  });
};

const renderWithProviders = (
  component: React.ReactElement,
  isAuthenticated: boolean = false
) => {
  const store = createMockStore(isAuthenticated);
  return render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>
  );
};

describe('SmartLoginButton', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should navigate to /login when user is not authenticated', () => {
    renderWithProviders(<SmartLoginButton>Войти</SmartLoginButton>, false);

    const button = screen.getByText('Войти');
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should navigate to /redirect when user is authenticated', () => {
    renderWithProviders(<SmartLoginButton>Войти</SmartLoginButton>, true);

    const button = screen.getByText('Войти');
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/redirect', { replace: true });
  });

  it('should render with correct props', () => {
    renderWithProviders(
      <SmartLoginButton variant="primary" size="lg" className="test-class">
        Test Button
      </SmartLoginButton>
    );

    const button = screen.getByText('Test Button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('test-class');
  });
});
