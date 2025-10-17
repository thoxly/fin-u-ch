import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/shared/api/axios';

interface DemoCredentials {
  email: string;
  password: string;
  companyName: string;
}

interface DemoCredentialsProps {
  className?: string;
}

export const DemoCredentials: React.FC<DemoCredentialsProps> = ({
  className,
}) => {
  const [credentials, setCredentials] = useState<DemoCredentials | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCredentials = async (): Promise<void> => {
      try {
        await fetchCredentials();
      } catch (error) {
        console.error('Failed to load demo credentials:', error);
      }
    };

    loadCredentials();
  }, []);

  const fetchCredentials = async (): Promise<void> => {
    try {
      const response = await apiClient.get('/demo/credentials');
      setCredentials(response.data);
    } catch (error) {
      console.error('Failed to fetch demo credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleLogin = (): void => {
    if (credentials) {
      // Redirect to login page with pre-filled credentials
      const loginUrl = `/login?email=${encodeURIComponent(credentials.email)}&password=${encodeURIComponent(credentials.password)}`;
      window.location.href = loginUrl;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Демо-доступ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!credentials) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Демо-доступ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Демо-пользователь недоступен</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="demo-credentials">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎯 Демо-доступ
          <span className="text-sm font-normal text-gray-600">
            (для ознакомления)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Email:</span>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {credentials.email}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(credentials.email, 'email')}
                className="h-8 w-8 p-0"
              >
                {copied === 'email' ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Пароль:</span>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {showPassword ? credentials.password : '•••••••'}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="h-8 w-8 p-0"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  copyToClipboard(credentials.password, 'password')
                }
                className="h-8 w-8 p-0"
              >
                {copied === 'password' ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Компания:</span>
            <span className="text-sm text-gray-600">
              {credentials.companyName}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <Button
            onClick={handleLogin}
            className="w-full"
            data-testid="demo-login-button"
          >
            Войти в демо-режим
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Полный доступ к демо-данным</p>
          <p>• Операции, планы, отчеты</p>
          <p>• Безопасная среда для тестирования</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoCredentials;
