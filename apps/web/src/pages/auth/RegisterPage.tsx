import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  useRegisterMutation,
  useResendVerificationMutation,
} from '../../store/api/authApi';
import { setCredentials } from '../../store/slices/authSlice';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  const [resendVerification, { isLoading: isResending }] =
    useResendVerificationMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    try {
      const response = await register({
        email,
        password,
        companyName,
      }).unwrap();
      dispatch(setCredentials(response));
      // Редирект будет выполнен компонентом RedirectToFirstAvailable
      // после загрузки прав пользователя
      navigate('/redirect', { replace: true });
      setShowVerificationMessage(true);
    } catch (err) {
      setError('Ошибка регистрации. Возможно, пользователь уже существует');
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerification({ email }).unwrap();
    } catch (err) {
      setError('Не удалось отправить письмо. Попробуйте позже.');
    }
  };

  if (showVerificationMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6">
              <img
                src="/images/logo.png"
                alt="Fin-U-CH"
                className="h-10 sm:h-12 w-auto mx-auto"
              />
            </Link>
          </div>

          {/* Success Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-200 dark:border-gray-700 p-8 sm:p-10 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Регистрация успешна!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                На ваш email{' '}
                <strong className="text-gray-900 dark:text-white">
                  {email}
                </strong>{' '}
                отправлено письмо с подтверждением.
              </p>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Пожалуйста, проверьте почту и перейдите по ссылке для
              подтверждения email.
            </p>

            {error && (
              <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <p className="text-sm text-red-800 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                fullWidth
                disabled={isResending}
                className="py-3"
              >
                {isResending ? 'Отправка...' : 'Отправить письмо снова'}
              </Button>
              <Button
                onClick={() => navigate('/dashboard')}
                fullWidth
                variant="outline"
                className="py-3"
              >
                Перейти в приложение
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Создайте аккаунт
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Начните работу с финансовым учётом
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
                label="Название компании"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                autoComplete="organization"
                className="transition-all"
              />

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="transition-all"
              />

              <Input
                label="Пароль"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Минимум 6 символов"
                className="transition-all"
              />
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={isLoading}
              className="mt-8 py-3 text-base font-semibold"
            >
              {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Уже есть аккаунт?{' '}
              <Link
                to="/login"
                className="font-semibold text-primary-600 dark:text-primary-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
              >
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
