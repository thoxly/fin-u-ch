import { render, screen, fireEvent } from '@testing-library/react';
import { CurrencySelect } from '../CurrencySelect';

describe('CurrencySelect', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default props', () => {
    render(<CurrencySelect {...defaultProps} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('');
  });

  it('should render with custom placeholder', () => {
    const placeholder = 'Выберите валюту';
    render(<CurrencySelect {...defaultProps} placeholder={placeholder} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('should display selected value', () => {
    render(<CurrencySelect {...defaultProps} value="USD" />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('USD');
  });

  it('should call onChange when selection changes', () => {
    const onChange = jest.fn();
    render(<CurrencySelect {...defaultProps} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'EUR' } });

    expect(onChange).toHaveBeenCalledWith('EUR');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<CurrencySelect {...defaultProps} disabled={true} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('should not be disabled when disabled prop is false', () => {
    render(<CurrencySelect {...defaultProps} disabled={false} />);

    const select = screen.getByRole('combobox');
    expect(select).not.toBeDisabled();
  });

  it('should render all currency options', () => {
    render(<CurrencySelect {...defaultProps} />);

    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');

    // Should have placeholder option + all currencies
    expect(options).toHaveLength(36); // 1 placeholder + 35 currencies
  });

  it('should have placeholder as first option', () => {
    render(<CurrencySelect {...defaultProps} placeholder="Выберите валюту" />);

    const select = screen.getByRole('combobox');
    const firstOption = select.querySelector('option:first-child');
    expect(firstOption).toHaveTextContent('Выберите валюту');
    expect(firstOption).toBeDisabled();
  });

  it('should include major currencies in options', () => {
    render(<CurrencySelect {...defaultProps} />);

    const select = screen.getByRole('combobox');
    const usdOption = screen.getByText('USD - Доллар США ($)');
    const eurOption = screen.getByText('EUR - Евро (€)');
    const rubOption = screen.getByText('RUB - Российский рубль (₽)');

    expect(usdOption).toBeInTheDocument();
    expect(eurOption).toBeInTheDocument();
    expect(rubOption).toBeInTheDocument();
  });

  it('should have proper option format', () => {
    render(<CurrencySelect {...defaultProps} />);

    const usdOption = screen.getByText('USD - Доллар США ($)');
    expect(usdOption).toBeInTheDocument();
    expect(usdOption).toHaveValue('USD');
  });

  it('should apply correct CSS classes', () => {
    render(<CurrencySelect {...defaultProps} />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('w-full', 'px-3', 'py-2', 'pr-10');
  });

  it('should show chevron icon', () => {
    render(<CurrencySelect {...defaultProps} />);

    const chevron = screen
      .getByRole('combobox')
      .parentElement?.querySelector('svg');
    expect(chevron).toBeInTheDocument();
  });
});
