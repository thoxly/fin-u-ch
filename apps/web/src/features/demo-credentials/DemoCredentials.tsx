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
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
          <p className="text-gray-500">Не удалось загрузить демо-данные</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Демо-доступ</CardTitle>
        <p className="text-sm text-gray-600">
          Используйте эти данные для входа в демо-режим
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="text-sm text-gray-900 font-mono">
                {credentials.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(credentials.email, 'email')}
              className="ml-2"
            >
              <Copy className="h-4 w-4" />
              {copied === 'email' ? 'Скопировано!' : 'Копировать'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">
                Пароль
              </label>
              <p className="text-sm text-gray-900 font-mono">
                {showPassword ? credentials.password : '••••••••'}
              </p>
            </div>
            <div className="flex gap-2 ml-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(credentials.password, 'password')
                }
              >
                <Copy className="h-4 w-4" />
                {copied === 'password' ? 'Скопировано!' : 'Копировать'}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">
                Компания
              </label>
              <p className="text-sm text-gray-900">{credentials.companyName}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copyToClipboard(credentials.companyName, 'company')
              }
              className="ml-2"
            >
              <Copy className="h-4 w-4" />
              {copied === 'company' ? 'Скопировано!' : 'Копировать'}
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleLogin} className="w-full">
            Войти в демо-режим
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoCredentials;
