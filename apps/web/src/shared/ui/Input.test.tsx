import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('should render input', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<Input label="Username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('should render with error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should apply error class when error is present', () => {
    render(<Input error="Error" data-testid="input-field" />);
    const input = screen.getByTestId('input-field');
    expect(input).toHaveClass('input-error');
  });

  it('should apply full width by default', () => {
    const { container } = render(<Input />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('w-full');
  });

  it('should not apply full width when fullWidth is false', () => {
    const { container } = render(<Input fullWidth={false} />);
    const wrapper = container.firstChild;
    expect(wrapper).not.toHaveClass('w-full');
  });

  it('should forward ref correctly', () => {
    const ref = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<Input ref={ref as any} />);
    expect(ref).toHaveBeenCalled();
  });

  it('should pass through HTML input attributes', () => {
    render(<Input type="email" placeholder="Email" required />);
    const input = screen.getByPlaceholderText('Email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toBeRequired();
  });

  it('should merge custom className', () => {
    render(<Input className="custom-input" data-testid="input-field" />);
    const input = screen.getByTestId('input-field');
    expect(input).toHaveClass('custom-input');
    expect(input).toHaveClass('input');
  });
});
