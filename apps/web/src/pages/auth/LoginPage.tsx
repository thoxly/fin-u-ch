import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from '../../store/api/authApi';
import { useStartDemoSessionMutation } from '../../store/api/demoApi';
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
  const [startDemoSession, { isLoading: isDemoLoading }] =
    useStartDemoSessionMutation();
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

  const handleDemoClick = async () => {
    setError('');

    try {
      // Создаем динамическую демо-сессию
      const response = await startDemoSession().unwrap();

      // Автоматически авторизуем пользователя с полученными токенами
      dispatch(
        setCredentials({
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        })
      );

      showSuccess('🎉 Добро пожаловать в демо-режим!');
      navigate('/redirect', { replace: true });
    } catch (err: unknown) {
      showError('Не удалось создать демо-сессию. Попробуйте позже.');
      console.error('Demo session creation failed:', err);
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
              disabled={isLoading || isDemoLoading}
              className="mt-8 py-3 text-base font-semibold"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </form>

          {/* Demo button */}
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  или
                </span>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleDemoClick}
              disabled={isLoading || isDemoLoading}
              variant="secondary"
              fullWidth
              className="mt-4 py-3 text-base font-semibold"
            >
              {isDemoLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700 dark:text-gray-300"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Создание демо...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Попробовать демо
                </>
              )}
            </Button>
          </div>

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
