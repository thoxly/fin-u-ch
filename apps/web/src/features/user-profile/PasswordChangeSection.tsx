import { useState } from 'react';
import { Lock, KeyRound } from 'lucide-react';
import {
  Input,
  PasswordInput,
  Button,
  PasswordValidationError,
} from '../../shared/ui';

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

interface PasswordChangeSectionProps {
  onChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  isLoading: boolean;
}

export const PasswordChangeSection = ({
  onChangePassword,
  isLoading,
}: PasswordChangeSectionProps) => {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async (): Promise<void> => {
    try {
      if (!validatePassword(passwordData.newPassword)) {
        setShowPasswordError(true);
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        alert('Пароли не совпадают');
        return;
      }

      await onChangePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      setShowChangePassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: unknown) {
      const errorMessage = (error as { data?: { message?: string } })?.data
        ?.message;
      alert(errorMessage || 'Ошибка при изменении пароля');
    }
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Пароль
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowChangePassword(!showChangePassword)}
        >
          Изменить пароль
        </Button>
      </div>
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Lock size={16} />
        <span>••••••••</span>
      </div>

      {showChangePassword && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Текущий пароль
            </label>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value,
                })
              }
              placeholder="Введите текущий пароль"
              icon={<KeyRound size={16} />}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Новый пароль
            </label>
            <PasswordInput
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              placeholder="Введите новый пароль"
              showValidation={true}
              onValidationChange={setIsPasswordValid}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Подтвердите новый пароль
            </label>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              placeholder="Повторите новый пароль"
              icon={<KeyRound size={16} />}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowChangePassword(false);
                setPasswordData({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                });
              }}
            >
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={handleChangePassword}
              disabled={isLoading || !isPasswordValid}
            >
              {isLoading ? 'Изменение...' : 'Изменить пароль'}
            </Button>
          </div>

          <PasswordValidationError
            isOpen={showPasswordError}
            onClose={() => setShowPasswordError(false)}
          />
        </div>
      )}
    </div>
  );
};
