import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DemoCredentials } from './DemoCredentials';

// Mock fetch
global.fetch = jest.fn();

// Mock window.location
delete (window as unknown as { location?: Location }).location;
window.location = { href: '' } as Location;

describe('DemoCredentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<DemoCredentials />);

    expect(screen.getByText('Демо-доступ')).toBeInTheDocument();
    expect(
      screen.getByText('Демо-пользователь недоступен')
    ).not.toBeInTheDocument();
  });

  it('should render credentials when loaded successfully', async () => {
    const mockCredentials = {
      email: 'demo@example.com',
      password: 'demo123',
      companyName: 'Демо Компания ООО',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: mockCredentials,
        }),
    });

    render(<DemoCredentials />);

    await waitFor(() => {
      expect(screen.getByText('demo@example.com')).toBeInTheDocument();
    });

    expect(screen.getByText('Демо Компания ООО')).toBeInTheDocument();
    expect(screen.getByText('•••••••')).toBeInTheDocument(); // Hidden password
  });

  it('should show/hide password when eye icon is clicked', async () => {
    const mockCredentials = {
      email: 'demo@example.com',
      password: 'demo123',
      companyName: 'Демо Компания ООО',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: mockCredentials,
        }),
    });

    render(<DemoCredentials />);

    await waitFor(() => {
      expect(screen.getByText('•••••••')).toBeInTheDocument();
    });

    const eyeButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(eyeButton);

    expect(screen.getByText('demo123')).toBeInTheDocument();
    expect(screen.queryByText('•••••••')).not.toBeInTheDocument();
  });

  it('should copy email to clipboard when copy button is clicked', async () => {
    const mockCredentials = {
      email: 'demo@example.com',
      password: 'demo123',
      companyName: 'Демо Компания ООО',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: mockCredentials,
        }),
    });

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(<DemoCredentials />);

    await waitFor(() => {
      expect(screen.getByText('demo@example.com')).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByRole('button');
    const emailCopyButton = copyButtons.find(
      (button) => button.querySelector('svg') // Copy icon
    );

    if (emailCopyButton) {
      fireEvent.click(emailCopyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'demo@example.com'
      );
    }
  });

  it('should copy password to clipboard when copy button is clicked', async () => {
    const mockCredentials = {
      email: 'demo@example.com',
      password: 'demo123',
      companyName: 'Демо Компания ООО',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: mockCredentials,
        }),
    });

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(<DemoCredentials />);

    await waitFor(() => {
      expect(screen.getByText('demo@example.com')).toBeInTheDocument();
    });

    // Show password first
    const eyeButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(eyeButton);

    await waitFor(() => {
      expect(screen.getByText('demo123')).toBeInTheDocument();
    });

    const copyButtons = screen.getAllByRole('button');
    const passwordCopyButton = copyButtons.find(
      (button) => button.querySelector('svg') && button !== eyeButton // Copy icon, not eye button
    );

    if (passwordCopyButton) {
      fireEvent.click(passwordCopyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('demo123');
    }
  });

  it('should redirect to login page when login button is clicked', async () => {
    const mockCredentials = {
      email: 'demo@example.com',
      password: 'demo123',
      companyName: 'Демо Компания ООО',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: mockCredentials,
        }),
    });

    render(<DemoCredentials />);

    await waitFor(() => {
      expect(screen.getByText('Войти в демо-режим')).toBeInTheDocument();
    });

    const loginButton = screen.getByText('Войти в демо-режим');
    fireEvent.click(loginButton);

    expect(window.location.href).toBe(
      '/login?email=demo%40example.com&password=demo123'
    );
  });

  it('should render error state when credentials fetch fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<DemoCredentials />);

    await waitFor(() => {
      expect(
        screen.getByText('Демо-пользователь недоступен')
      ).toBeInTheDocument();
    });
  });

  it('should render error state when API returns error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Demo user not found',
        }),
    });

    render(<DemoCredentials />);

    await waitFor(() => {
      expect(
        screen.getByText('Демо-пользователь недоступен')
      ).toBeInTheDocument();
    });
  });

  it('should display demo features list', async () => {
    const mockCredentials = {
      email: 'demo@example.com',
      password: 'demo123',
      companyName: 'Демо Компания ООО',
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: mockCredentials,
        }),
    });

    render(<DemoCredentials />);

    await waitFor(() => {
      expect(
        screen.getByText('• Полный доступ к демо-данным')
      ).toBeInTheDocument();
    });

    expect(screen.getByText('• Операции, планы, отчеты')).toBeInTheDocument();
    expect(
      screen.getByText('• Безопасная среда для тестирования')
    ).toBeInTheDocument();
  });
});
