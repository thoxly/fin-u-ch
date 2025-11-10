import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Выберите валюту');
  });

  it('should render with custom placeholder', () => {
    const placeholder = 'Выберите валюту';
    render(<CurrencySelect {...defaultProps} placeholder={placeholder} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(placeholder);
  });

  it('should display selected value', () => {
    render(<CurrencySelect {...defaultProps} value="USD" />);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('USD - Доллар США ($)');
  });

  it('should call onChange when selection changes', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<CurrencySelect {...defaultProps} onChange={onChange} />);

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      const eurOption = screen.getByText('EUR - Евро (€)');
      expect(eurOption).toBeInTheDocument();
    });

    // Find the option by role and click it
    const eurOption = await screen.findByRole('option', { name: /EUR - Евро/ });
    await user.click(eurOption);

    await waitFor(
      () => {
        expect(onChange).toHaveBeenCalledWith('EUR');
      },
      { timeout: 3000 }
    );
  });

  it('should be disabled when disabled prop is true', () => {
    render(<CurrencySelect {...defaultProps} disabled={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should not be disabled when disabled prop is false', () => {
    render(<CurrencySelect {...defaultProps} disabled={false} />);

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('should render all currency options when opened', async () => {
    const user = userEvent.setup();
    render(<CurrencySelect {...defaultProps} />);

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      const usdOption = screen.getByText('USD - Доллар США ($)');
      expect(usdOption).toBeInTheDocument();
    });

    // Check that major currencies are present
    expect(screen.getByText('USD - Доллар США ($)')).toBeInTheDocument();
    expect(screen.getByText('EUR - Евро (€)')).toBeInTheDocument();
    expect(screen.getByText('RUB - Российский рубль (₽)')).toBeInTheDocument();
  });

  it('should include major currencies in options', async () => {
    const user = userEvent.setup();
    render(<CurrencySelect {...defaultProps} />);

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      const usdOption = screen.getByText('USD - Доллар США ($)');
      const eurOption = screen.getByText('EUR - Евро (€)');
      const rubOption = screen.getByText('RUB - Российский рубль (₽)');

      expect(usdOption).toBeInTheDocument();
      expect(eurOption).toBeInTheDocument();
      expect(rubOption).toBeInTheDocument();
    });
  });

  it('should apply correct CSS classes', () => {
    render(<CurrencySelect {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full', 'px-3', 'py-2', 'pr-10');
  });

  it('should show chevron icon', () => {
    render(<CurrencySelect {...defaultProps} />);

    const button = screen.getByRole('button');
    const chevron = button.querySelector('svg');
    expect(chevron).toBeInTheDocument();
  });
});
