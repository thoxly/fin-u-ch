import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useConfirmEmailChangeMutation } from '../../store/api/authApi';
import { Button } from '../../shared/ui/Button';
import { CheckCircle, XCircle, Mail } from 'lucide-react';

export const VerifyEmailChangePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [confirmEmailChange, { isLoading, isSuccess, isError }] =
    useConfirmEmailChangeMutation();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      confirmEmailChange({ token })
        .unwrap()
        .then((response) => {
          setMessage(
            response.message ||
              'Email успешно изменён! Теперь вы можете войти с новым email адресом.'
          );
        })
        .catch((err) => {
          setError(
            err?.data?.message ||
              'Не удалось подтвердить новый email. Ссылка может быть недействительной или истекшей.'
          );
        });
    } else {
      setError('Токен подтверждения не найден');
    }
  }, [token, confirmEmailChange]);

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-6">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-4">
              Email успешно изменён!
            </h2>
            <p className="text-sm text-green-700 dark:text-green-400 mb-6">
              {message ||
                'Ваш email адрес успешно изменён. Теперь вы можете войти в систему, используя новый email адрес.'}
            </p>
            <div className="space-y-4">
              <Button onClick={() => navigate('/login')} fullWidth>
                Перейти на страницу входа
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Используйте новый email адрес для входа в систему
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-6">
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-4">
              Ошибка подтверждения
            </h2>
            <p className="text-sm text-red-700 dark:text-red-400 mb-6">
              {error ||
                'Не удалось подтвердить новый email. Ссылка может быть недействительной или истекшей.'}
            </p>
            <div className="space-y-4">
              <Button onClick={() => navigate('/login')} fullWidth>
                Перейти на страницу входа
              </Button>
              <Link
                to="/profile"
                className="block text-sm text-primary-600 dark:text-primary-500 hover:text-primary-500 dark:hover:text-primary-400"
              >
                Вернуться в профиль
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Подтверждение нового email
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isLoading ? 'Подтверждение...' : 'Ожидание токена...'}
          </p>
        </div>
      </div>
    </div>
  );
};
