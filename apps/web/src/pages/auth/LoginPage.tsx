import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from '../../store/api/authApi';
import { setCredentials } from '../../store/slices/authSlice';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { useNotification } from '../../shared/hooks/useNotification';
import { NOTIFICATION_MESSAGES } from '../../constants/notificationMessages';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const { showSuccess, showError } = useNotification();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await login({ email, password }).unwrap();
      dispatch(setCredentials(response));
      showSuccess(NOTIFICATION_MESSAGES.AUTH.LOGIN_SUCCESS);
      // Редирект будет выполнен компонентом RedirectToFirstAvailable
      // после загрузки прав пользователя
      navigate('/redirect', { replace: true });
    } catch (err: unknown) {
      // Извлекаем конкретное сообщение ошибки от API
      let errorMessage = 'Неверный email или пароль';

      if (err && typeof err === 'object' && 'data' in err) {
        const errorData = err as { data?: { message?: string } };
        if (errorData.data?.message) {
          // Используем сообщение от сервера
          const serverMessage = errorData.data.message;
          if (serverMessage === 'User account is inactive') {
            errorMessage =
              'Ваш аккаунт деактивирован. Обратитесь к администратору.';
          } else if (serverMessage === 'Invalid email or password') {
            errorMessage = 'Неверный email или пароль';
          } else {
            errorMessage = serverMessage;
          }
        }
      }

      // Показываем ошибку только один раз - в UI форме
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img
              src="/images/logo.png"
              alt="Fin-U-CH"
              className="h-10 sm:h-12 w-auto mx-auto"
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Добро пожаловать
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Войдите в свой аккаунт для продолжения
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-200 dark:border-gray-700 p-8 sm:p-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <p className="text-sm text-red-800 dark:text-red-300 text-center">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-5">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="transition-all"
              />

              <div>
                <Input
                  label="Пароль"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="transition-all"
                />
                <div className="mt-2 text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary-600 dark:text-primary-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                  >
                    Забыли пароль?
                  </Link>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={isLoading}
              className="mt-8 py-3 text-base font-semibold"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </form>

          {/* Sign up link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Нет аккаунта?{' '}
              <Link
                to="/register"
                className="font-semibold text-primary-600 dark:text-primary-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
