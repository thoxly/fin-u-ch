import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CashflowTable } from './CashflowTable';
import { CashflowReport, BDDSReport } from '@shared/types/reports';

// Mock data for testing
const mockCashflowData: CashflowReport = {
  activities: [
    {
      activity: 'operating',
      netCashflow: 100000,
      incomeGroups: [
        {
          articleId: 'income-1',
          articleName: 'Продажи',
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
      total: 150000,
      months: [
        { month: '2025-01', amount: 50000 },
        { month: '2025-02', amount: 50000 },
        { month: '2025-03', amount: 50000 },
      ],
    },
  ],
};

describe('CashflowTable', () => {
  const defaultProps = {
    data: mockCashflowData,
    periodFrom: '2025-01-01',
    periodTo: '2025-03-31',
  };

  it('renders table with correct headers', () => {
    render(<CashflowTable {...defaultProps} />);

    expect(screen.getByText('Статья')).toBeInTheDocument();
    expect(screen.getByText('Итого')).toBeInTheDocument();
    expect(screen.getByText('янв 25')).toBeInTheDocument();
    expect(screen.getByText('февр 25')).toBeInTheDocument();
    expect(screen.getByText('март 25')).toBeInTheDocument();
  });

  it('renders activity rows with correct names', () => {
    render(<CashflowTable {...defaultProps} />);

    expect(screen.getByText('Операционная деятельность')).toBeInTheDocument();
  });

  it('shows plan/fact columns when showPlan is true', () => {
    render(
      <CashflowTable
        {...defaultProps}
        showPlan={true}
        planData={mockPlanData}
      />
    );

    expect(screen.getByText('План')).toBeInTheDocument();
    expect(screen.getByText('Факт')).toBeInTheDocument();
  });

  it('toggles section expansion when clicked', () => {
    render(<CashflowTable {...defaultProps} />);

    const activityRow = screen.getByText('Операционная деятельность');
    fireEvent.click(activityRow);

    // Should show detailed income/expense rows
    expect(screen.getByText('Продажи')).toBeInTheDocument();
    expect(screen.getByText('Зарплата')).toBeInTheDocument();
  });

  it('displays correct period information', () => {
    render(<CashflowTable {...defaultProps} />);

    expect(
      screen.getByText(/Отчет о движении денежных средств/)
    ).toBeInTheDocument();
    expect(screen.getByText(/01.01.2025/)).toBeInTheDocument();
    expect(screen.getByText(/31.03.2025/)).toBeInTheDocument();
  });

  it('renders total cashflow row', () => {
    render(<CashflowTable {...defaultProps} />);

    expect(screen.getByText('Общий денежный поток')).toBeInTheDocument();
    expect(screen.getByText('Остаток на конец периода')).toBeInTheDocument();
  });

  it('applies correct CSS classes for styling', () => {
    const { container } = render(<CashflowTable {...defaultProps} />);

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
    const emptyData: CashflowReport = { activities: [] };

    render(<CashflowTable {...defaultProps} data={emptyData} />);

    expect(screen.getByText('Статья')).toBeInTheDocument();
    expect(screen.getByText('Общий денежный поток')).toBeInTheDocument();
  });

  it('formats money values correctly', () => {
    render(<CashflowTable {...defaultProps} />);

    // Check for formatted money values (assuming formatMoney returns formatted strings)
    expect(screen.getByText(/100 000/)).toBeInTheDocument();
  });

  it('shows cumulative balance calculation', () => {
    render(<CashflowTable {...defaultProps} />);

    // The cumulative balance should be calculated and displayed
    expect(screen.getByText('Остаток на конец периода')).toBeInTheDocument();
  });
});
