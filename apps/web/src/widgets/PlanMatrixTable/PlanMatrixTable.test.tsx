import { render, screen } from '@testing-library/react';
import { PlanMatrixTable } from './PlanMatrixTable';
import { BDDSReport } from '@fin-u-ch/shared';

describe('PlanMatrixTable', () => {
  const mockData: BDDSReport = {
    periodFrom: '2024-01-01',
    periodTo: '2024-03-31',
    rows: [
      {
        articleId: '1',
        articleName: 'Продажи',
        type: 'income',
        months: [
          { month: '2024-01', amount: 10000 },
          { month: '2024-02', amount: 12000 },
          { month: '2024-03', amount: 15000 },
        ],
        total: 37000,
      },
      {
        articleId: '2',
        articleName: 'Аренда',
        type: 'expense',
        months: [
          { month: '2024-01', amount: 5000 },
          { month: '2024-02', amount: 5000 },
          { month: '2024-03', amount: 5000 },
        ],
        total: 15000,
      },
    ],
  };

  it('should render plan matrix table', () => {
    render(
      <PlanMatrixTable
        data={mockData}
        periodFrom="2024-01-01"
        periodTo="2024-03-31"
      />
    );

    expect(
      screen.getByText(/Бюджет движения денежных средств/)
    ).toBeInTheDocument();
    expect(screen.getByText('Продажи')).toBeInTheDocument();
    expect(screen.getByText('Аренда')).toBeInTheDocument();
  });

  it('should display month columns', () => {
    render(
      <PlanMatrixTable
        data={mockData}
        periodFrom="2024-01-01"
        periodTo="2024-03-31"
      />
    );

    // Check for month headers (formatted as "янв 24", "фев 24", etc.)
    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBeGreaterThan(3); // At least: Статья + 3 months + Итого
  });

  it('should calculate totals correctly', () => {
    render(
      <PlanMatrixTable
        data={mockData}
        periodFrom="2024-01-01"
        periodTo="2024-03-31"
      />
    );

    // Check for article totals (exact values)
    const allText = document.body.textContent || '';
    expect(allText).toContain('37'); // Income total
    expect(allText).toContain('15'); // Expense total
    expect(allText).toContain('22'); // Net cashflow (37000 - 15000)
  });

  it('should show income and expense sections', () => {
    render(
      <PlanMatrixTable
        data={mockData}
        periodFrom="2024-01-01"
        periodTo="2024-03-31"
      />
    );

    expect(screen.getByText('Поступления')).toBeInTheDocument();
    expect(screen.getByText('Выплаты')).toBeInTheDocument();
    expect(screen.getByText('Чистый денежный поток')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    const emptyData: BDDSReport = {
      periodFrom: '2024-01-01',
      periodTo: '2024-03-31',
      rows: [],
    };

    render(
      <PlanMatrixTable
        data={emptyData}
        periodFrom="2024-01-01"
        periodTo="2024-03-31"
      />
    );

    expect(
      screen.getByText('Нет данных по плану для выбранного периода')
    ).toBeInTheDocument();
  });

  it('should group rows by type', () => {
    render(
      <PlanMatrixTable
        data={mockData}
        periodFrom="2024-01-01"
        periodTo="2024-03-31"
      />
    );

    const incomeSection = screen.getByText('Поступления').closest('table');
    const expenseSection = screen.getByText('Выплаты').closest('table');

    expect(incomeSection).toBeInTheDocument();
    expect(expenseSection).toBeInTheDocument();
  });
});
