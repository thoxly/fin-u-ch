import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPasswordMutation } from '../../store/api/authApi';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Введите email адрес');
      return;
    }

    try {
      await forgotPassword({ email }).unwrap();
      setSuccess(true);
    } catch (err) {
      setError(
        (err as { data?: { message?: string } })?.data?.message ||
          'Не удалось отправить письмо. Попробуйте позже.'
      );
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Письмо отправлено
            </h2>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Если аккаунт с email <strong>{email}</strong> существует, на него
              отправлено письмо с инструкциями по восстановлению пароля.
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Проверьте почту и перейдите по ссылке для создания нового пароля.
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="font-medium text-primary-600 dark:text-primary-500 hover:text-primary-500 dark:hover:text-primary-400"
              >
                Вернуться на страницу входа
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Восстановление пароля
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Введите ваш email адрес, и мы отправим вам ссылку для восстановления
            пароля.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="your@email.com"
            />
          </div>

          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? 'Отправка...' : 'Отправить письмо'}
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-primary-600 dark:text-primary-500 hover:text-primary-500 dark:hover:text-primary-400"
            >
              Вернуться на страницу входа
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
