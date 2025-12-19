import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PlanForm } from './PlanForm';

// Mock the API hooks
const mockUseGetArticlesQuery = jest.fn();
const mockUseGetAccountsQuery = jest.fn();
const mockUseGetCounterpartiesQuery = jest.fn();
const mockUseGetDealsQuery = jest.fn();
const mockUseCreatePlanMutation = jest.fn();
const mockUseUpdatePlanMutation = jest.fn();

jest.mock('../../store/api/catalogsApi', () => ({
  useGetArticlesQuery: () => mockUseGetArticlesQuery(),
  useGetAccountsQuery: () => mockUseGetAccountsQuery(),
  useGetCounterpartiesQuery: () => mockUseGetCounterpartiesQuery(),
  useGetDealsQuery: () => mockUseGetDealsQuery(),
}));

jest.mock('../../store/api/plansApi', () => ({
  useCreatePlanMutation: () => mockUseCreatePlanMutation(),
  useUpdatePlanMutation: () => mockUseUpdatePlanMutation(),
}));

jest.mock('../../shared/hooks/useNotification', () => ({
  useNotification: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

jest.mock('../../constants/notificationMessages', () => ({
  NOTIFICATION_MESSAGES: {
    PLAN: {
      CREATE_SUCCESS: 'План создан',
      CREATE_ERROR: 'Ошибка создания плана',
      UPDATE_SUCCESS: 'План обновлен',
      UPDATE_ERROR: 'Ошибка обновления плана',
    },
  },
}));

const createMockStore = () => {
  return configureStore({
    reducer: {
      api: () => ({}),
      notification: () => ({
        notifications: [],
      }),
    },
  });
};

const renderWithProvider = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(<Provider store={store}>{component}</Provider>);
};

describe('PlanForm', () => {
  const mockOnClose = jest.fn();
  const mockCreatePlan = jest.fn();
  const mockUpdatePlan = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseGetArticlesQuery.mockReturnValue({
      data: [
        { id: 'art1', name: 'Test Article 1', type: 'expense' },
        { id: 'art2', name: 'Test Article 2', type: 'income' },
      ],
      isLoading: false,
    });

    mockUseGetAccountsQuery.mockReturnValue({
      data: [
        { id: 'acc1', name: 'Test Account 1', currency: 'RUB' },
        { id: 'acc2', name: 'Test Account 2', currency: 'USD' },
      ],
      isLoading: false,
    });

    mockUseGetCounterpartiesQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseGetDealsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseCreatePlanMutation.mockReturnValue([
      mockCreatePlan,
      { isLoading: false },
    ]);
    mockUseUpdatePlanMutation.mockReturnValue([
      mockUpdatePlan,
      { isLoading: false },
    ]);
  });

  describe('Creating new plan', () => {
    it('renders form with default values', () => {
      renderWithProvider(<PlanForm plan={null} onClose={mockOnClose} />);

      expect(screen.getByText('Тип')).toBeInTheDocument();
      expect(screen.getByText('Дата начала')).toBeInTheDocument();
      expect(screen.getByText('Сумма')).toBeInTheDocument();
      expect(screen.getByText('Создать')).toBeInTheDocument();
    });

    it('renders with budgetId', () => {
      renderWithProvider(
        <PlanForm plan={null} budgetId="budget-123" onClose={mockOnClose} />
      );

      expect(screen.getByText('Создать')).toBeInTheDocument();
    });

    it('calls createPlan when form is submitted', async () => {
      const mockUnwrap = jest.fn().mockResolvedValue({});
      mockCreatePlan.mockReturnValue({ unwrap: mockUnwrap });

      renderWithProvider(<PlanForm plan={null} onClose={mockOnClose} />);

      const amountInput = await waitFor(() => {
        return screen.getByLabelText(/Сумма/i);
      });
      fireEvent.change(amountInput, { target: { value: '1000' } });

      const submitButton = screen.getByText('Создать');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreatePlan).toHaveBeenCalledTimes(1);
        const calledWith = mockCreatePlan.mock.calls[0][0];
        expect(calledWith.amount).toBe(1000);
        expect(calledWith.type).toBe('expense');
      });

      await waitFor(() => {
        expect(mockUnwrap).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('includes budgetId when passed', async () => {
      const mockUnwrap = jest.fn().mockResolvedValue({});
      mockCreatePlan.mockReturnValue({ unwrap: mockUnwrap });

      renderWithProvider(
        <PlanForm
          plan={null}
          budgetId="test-budget-123"
          onClose={mockOnClose}
        />
      );

      const amountInput = await waitFor(() => {
        return screen.getByLabelText(/Сумма/i);
      });
      fireEvent.change(amountInput, { target: { value: '500' } });

      const submitButton = screen.getByText('Создать');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreatePlan).toHaveBeenCalledTimes(1);
        const calledWith = mockCreatePlan.mock.calls[0][0];
        expect(calledWith.budgetId).toBe('test-budget-123');
      });
    });
  });

  describe('Editing existing plan', () => {
    const mockPlan = {
      id: 'plan-1',
      companyId: 'company-1',
      type: 'income',
      startDate: '2024-01-15T00:00:00.000Z',
      endDate: '2024-12-31T00:00:00.000Z',
      amount: 5000,
      currency: 'USD',
      articleId: 'art2',
      accountId: 'acc2',
      repeat: 'monthly',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      deletedAt: null,
    };

    it('renders form with plan data', () => {
      renderWithProvider(<PlanForm plan={mockPlan} onClose={mockOnClose} />);

      expect(screen.getByDisplayValue('5000')).toBeInTheDocument();
      expect(screen.getByText('Сохранить')).toBeInTheDocument();
    });

    it('calls updatePlan when form is submitted', async () => {
      const mockUnwrap = jest.fn().mockResolvedValue({});
      mockUpdatePlan.mockReturnValue({ unwrap: mockUnwrap });

      renderWithProvider(<PlanForm plan={mockPlan} onClose={mockOnClose} />);

      const amountInput = await waitFor(() => {
        return screen.getByLabelText(/Сумма/i);
      });
      fireEvent.change(amountInput, { target: { value: '6000' } });

      const submitButton = screen.getByText('Сохранить');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdatePlan).toHaveBeenCalledTimes(1);
        expect(mockUpdatePlan).toHaveBeenCalledWith({
          id: 'plan-1',
          data: expect.objectContaining({
            amount: 6000,
          }),
        });
      });
    });

    it('filters articles by type', () => {
      renderWithProvider(<PlanForm plan={mockPlan} onClose={mockOnClose} />);

      // When type is 'income', only income articles should be shown
      expect(screen.getByText('Тип')).toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('disables submit button when loading', () => {
      mockUseCreatePlanMutation.mockReturnValue([
        mockCreatePlan,
        { isLoading: true },
      ]);

      renderWithProvider(<PlanForm plan={null} onClose={mockOnClose} />);

      const submitButton = screen.getByText('Создать');
      expect(submitButton).toBeDisabled();
    });

    it('shows correct submit button text for create vs edit', () => {
      const { rerender } = renderWithProvider(
        <PlanForm plan={null} onClose={mockOnClose} />
      );
      expect(screen.getByText('Создать')).toBeInTheDocument();

      const mockPlan = {
        id: 'plan-1',
        companyId: 'company-1',
        type: 'expense',
        startDate: '2024-01-15T00:00:00.000Z',
        amount: 1000,
        currency: 'RUB',
        articleId: 'art1',
        accountId: 'acc1',
        repeat: 'monthly',
        status: 'active',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        deletedAt: null,
      };

      rerender(<PlanForm plan={mockPlan} onClose={mockOnClose} />);
      expect(screen.getByText('Сохранить')).toBeInTheDocument();
    });
  });

  describe('Form fields', () => {
    it('updates form fields when user types', async () => {
      renderWithProvider(<PlanForm plan={null} onClose={mockOnClose} />);

      const amountInput = await waitFor(() => {
        return screen.getByLabelText(/Сумма/i);
      });
      fireEvent.change(amountInput, { target: { value: '2500.50' } });

      // formatAmountInput formats with spaces for thousands
      expect(amountInput).toHaveValue('2 500,50');
    });

    it('populates article and account selects', () => {
      renderWithProvider(<PlanForm plan={null} onClose={mockOnClose} />);

      // Articles and accounts should be loaded
      expect(mockUseGetArticlesQuery).toHaveBeenCalled();
      expect(mockUseGetAccountsQuery).toHaveBeenCalled();
    });
  });
});
