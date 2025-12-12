import { useState, FormEvent, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAcceptInvitationMutation } from '../../store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import {
  PasswordInput,
  Button,
  PasswordValidationError,
} from '../../shared/ui';
import { Input } from '../../shared/ui/Input';
import { CheckCircle, XCircle, Mail } from 'lucide-react';

const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  hasLowercase: /[a-z]/,
  hasUppercase: /[A-Z]/,
  hasDigit: /\d/,
};

const validatePassword = (password: string): boolean => {
  return (
    password.length >= PASSWORD_REQUIREMENTS.minLength &&
    PASSWORD_REQUIREMENTS.hasLowercase.test(password) &&
    PASSWORD_REQUIREMENTS.hasUppercase.test(password) &&
    PASSWORD_REQUIREMENTS.hasDigit.test(password)
  );
};

export const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const [acceptInvitation, { isLoading }] = useAcceptInvitationMutation();

  useEffect(() => {
    if (!token) {
      setError('Токен приглашения не найден');
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Токен приглашения не найден');
      return;
    }

    if (!validatePassword(password)) {
      setShowPasswordError(true);
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      const result = await acceptInvitation({ token, password }).unwrap();

      // Сохраняем токены и пользователя в Redux store
      dispatch(
        setCredentials({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        })
      );

      setSuccess(true);

      // Перенаправляем на главную страницу через 2 секунды
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(
        (err as { data?: { message?: string } })?.data?.message ||
          'Не удалось принять приглашение. Ссылка может быть недействительной или истекшей.'
      );
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-6">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-4">
              Приглашение принято!
            </h2>
            <p className="text-sm text-green-700 dark:text-green-400 mb-6">
              Ваш аккаунт успешно активирован. Вы будете перенаправлены на
              главную страницу через несколько секунд.
            </p>
            <Button onClick={() => navigate('/')} fullWidth>
              Перейти на главную
            </Button>
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
            Принятие приглашения
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Вы были приглашены присоединиться к компании. Установите пароль для
            завершения регистрации.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <PasswordInput
              label="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Минимум 12 символов"
              showValidation={true}
              onValidationChange={setIsPasswordValid}
            />

            <Input
              label="Подтвердите пароль"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Повторите пароль"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            disabled={isLoading || !token || !isPasswordValid}
          >
            {isLoading ? 'Принятие приглашения...' : 'Принять приглашение'}
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

        <PasswordValidationError
          isOpen={showPasswordError}
          onClose={() => setShowPasswordError(false)}
        />
      </div>
    </div>
  );
};
