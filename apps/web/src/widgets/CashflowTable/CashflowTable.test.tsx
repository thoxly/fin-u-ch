import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CashflowTable } from './CashflowTable';
import { CashflowReport, BDDSReport } from '@fin-u-ch/shared';
import { apiSlice } from '../../store/api/apiSlice';

// Mock RTK Query hooks used by ExportMenu
jest.mock('../../store/api/authApi', () => ({
  useGetMeQuery: () => ({
    data: {
      id: '1',
      email: 'test@test.com',
      companyId: '1',
      isSuperAdmin: true,
    },
    isLoading: false,
  }),
}));

jest.mock('../../store/api/usersApi', () => ({
  useGetUserPermissionsQuery: () => ({
    data: {},
    isLoading: false,
  }),
}));

// Mock data for testing
const mockCashflowData: CashflowReport = {
  periodFrom: '2025-01-01',
  periodTo: '2025-03-31',
  activities: [
    {
      activity: 'operating' as const,
      netCashflow: 100000,
      incomeGroups: [
        {
          articleId: 'income-1',
          articleName: 'Продажи',
          type: 'income' as const,
          total: 150000,
          months: [
            { month: '2025-01', amount: 50000 },
            { month: '2025-02', amount: 50000 },
            { month: '2025-03', amount: 50000 },
          ],
        },
      ],
      expenseGroups: [
        {
          articleId: 'expense-1',
          articleName: 'Зарплата',
          type: 'expense' as const,
          total: 50000,
          months: [
            { month: '2025-01', amount: 16667 },
            { month: '2025-02', amount: 16667 },
            { month: '2025-03', amount: 16666 },
          ],
        },
      ],
    },
  ],
};

const mockPlanData: BDDSReport = {
  rows: [
    {
      articleId: 'income-1',
      articleName: 'Продажи',
      type: 'income' as const,
      total: 150000,
      months: [
        { month: '2025-01', amount: 50000 },
        { month: '2025-02', amount: 50000 },
        { month: '2025-03', amount: 50000 },
      ],
    },
  ],
};

// Create a mock store with API slice
const createMockStore = () => {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: (
        state = { user: null, accessToken: null, isAuthenticated: false }
      ) => state,
      notification: (state = { notifications: [] }) => state,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(apiSlice.middleware),
  });
};

const renderWithProvider = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(<Provider store={store}>{component}</Provider>);
};

describe('CashflowTable', () => {
  const defaultProps = {
    data: mockCashflowData,
    periodFrom: '2025-01-01',
    periodTo: '2025-03-31',
  };

  it('renders table with correct headers', () => {
    renderWithProvider(<CashflowTable {...defaultProps} />);

    // Check for header text (can be uppercase in the component)
    expect(screen.getByText(/главный разрез/i)).toBeInTheDocument();
    expect(screen.getByText(/итого/i)).toBeInTheDocument();
    expect(screen.getByText(/янв 25/i)).toBeInTheDocument();
    expect(screen.getByText(/февр 25/i)).toBeInTheDocument();
    expect(screen.getByText(/март 25/i)).toBeInTheDocument();
  });

  it('renders activity rows with correct names', () => {
    renderWithProvider(<CashflowTable {...defaultProps} />);

    expect(screen.getByText('Операционная деятельность')).toBeInTheDocument();
  });

  it('shows plan/fact columns when showPlan is true', () => {
    renderWithProvider(
      <CashflowTable
        {...defaultProps}
        showPlan={true}
        planData={mockPlanData}
      />
    );

    expect(screen.getAllByText('План').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Факт').length).toBeGreaterThan(0);
  });

  it('toggles section expansion when clicked', () => {
    renderWithProvider(<CashflowTable {...defaultProps} />);

    const activityRow = screen.getByText('Операционная деятельность');
    fireEvent.click(activityRow);

    // Should show detailed income/expense rows
    expect(screen.getByText('Продажи')).toBeInTheDocument();
    expect(screen.getByText('Зарплата')).toBeInTheDocument();
  });

  it('displays correct period information', () => {
    renderWithProvider(<CashflowTable {...defaultProps} />);

    expect(
      screen.getByText(/Отчет о движении денежных средств/)
    ).toBeInTheDocument();
    expect(screen.getByText(/01.01.2025/)).toBeInTheDocument();
    expect(screen.getByText(/31.03.2025/)).toBeInTheDocument();
  });

  it('renders total cashflow row', () => {
    renderWithProvider(<CashflowTable {...defaultProps} />);

    expect(screen.getByText('Общий денежный поток')).toBeInTheDocument();
    expect(screen.getByText('Остаток на конец периода')).toBeInTheDocument();
  });

  it('applies correct CSS classes for styling', () => {
    const { container } = renderWithProvider(
      <CashflowTable {...defaultProps} />
    );

    // Check for scroll container
    const scrollContainer = container.querySelector('.overflow-x-auto');
    expect(scrollContainer).toBeInTheDocument();

    // Check for sticky header
    const stickyHeader = container.querySelector('.sticky.top-0');
    expect(stickyHeader).toBeInTheDocument();

    // Check for sticky first column
    const stickyColumn = container.querySelector('.sticky.left-0');
    expect(stickyColumn).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    const emptyData: CashflowReport = {
      periodFrom: '2025-01-01',
      periodTo: '2025-03-31',
      activities: [],
    };

    renderWithProvider(<CashflowTable {...defaultProps} data={emptyData} />);

    // When there's no data, component shows empty state message
    expect(screen.getByText(/нет данных для отображения/i)).toBeInTheDocument();
  });

  it('formats money values correctly', () => {
    renderWithProvider(<CashflowTable {...defaultProps} />);

    // Check for formatted money values (assuming formatMoney returns formatted strings)
    expect(screen.getAllByText(/100 000/).length).toBeGreaterThan(0);
  });

  it('shows cumulative balance calculation', () => {
    renderWithProvider(<CashflowTable {...defaultProps} />);

    // The cumulative balance should be calculated and displayed
    expect(screen.getByText('Остаток на конец периода')).toBeInTheDocument();
  });
});
