import { useState, useEffect } from 'react';
import { Save, Mail, Building, Lock, KeyRound } from 'lucide-react';
import {
  useGetMeQuery,
  useUpdateUserMutation,
  useChangePasswordMutation,
  useRequestEmailChangeMutation,
} from '../../store/api/authApi';
import { useUpdateCompanyMutation } from '../../store/api/companiesApi';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { CurrencySelect } from '../../shared/ui/CurrencySelect';

interface UserProfileFormProps {
  onClose: () => void;
}

export const UserProfileForm = ({
  onClose,
}: UserProfileFormProps): JSX.Element => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    companyName: '',
    currencyBase: 'RUB',
  });

  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const { data: user, isLoading: userLoading } = useGetMeQuery();
  const [updateUser, { isLoading: updateUserLoading }] =
    useUpdateUserMutation();
  const [updateCompany, { isLoading: updateCompanyLoading }] =
    useUpdateCompanyMutation();
  const [changePassword, { isLoading: changePasswordLoading }] =
    useChangePasswordMutation();
  const [requestEmailChange, { isLoading: requestEmailChangeLoading }] =
    useRequestEmailChangeMutation();

  const updateLoading = updateUserLoading || updateCompanyLoading;

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        companyName: user.companyName || '',
        currencyBase: user.company?.currencyBase || 'RUB',
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (): Promise<void> => {
    try {
      // Обновляем данные пользователя (без email, так как его нельзя менять напрямую)
      await updateUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
      }).unwrap();

      // Обновляем данные компании
      await updateCompany({
        name: formData.companyName,
        currencyBase: formData.currencyBase,
      }).unwrap();

      onClose();
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
    }
  };

  const handleRequestEmailChange = async (): Promise<void> => {
    try {
      if (!newEmail || newEmail === user?.email) {
        alert('Введите новый email, отличный от текущего');
        return;
      }

      await requestEmailChange({ newEmail }).unwrap();
      alert('Письмо с подтверждением отправлено на ваш текущий email');
      setShowChangeEmail(false);
      setNewEmail('');
    } catch (error: unknown) {
      const errorMessage = (error as { data?: { message?: string } })?.data
        ?.message;
      alert(errorMessage || 'Ошибка при запросе изменения email');
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        alert('Пароли не совпадают');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        alert('Пароль должен быть не менее 6 символов');
        return;
      }

      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }).unwrap();

      alert('Пароль успешно изменен');
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

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email секция */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChangeEmail(!showChangeEmail)}
          >
            Изменить email
          </Button>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Mail size={16} />
          <span>{formData.email}</span>
        </div>

        {showChangeEmail && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Новый email
              </label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Введите новый email"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowChangeEmail(false);
                  setNewEmail('');
                }}
              >
                Отмена
              </Button>
              <Button
                size="sm"
                onClick={handleRequestEmailChange}
                disabled={requestEmailChangeLoading}
              >
                {requestEmailChangeLoading ? 'Отправка...' : 'Отправить запрос'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              На ваш текущий email будет отправлено письмо с подтверждением
            </p>
          </div>
        )}
      </div>

      {/* Пароль секция */}
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
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                placeholder="Введите новый пароль"
                icon={<KeyRound size={16} />}
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
                disabled={changePasswordLoading}
              >
                {changePasswordLoading ? 'Изменение...' : 'Изменить пароль'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Имя
          </label>
          <Input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Введите имя"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Фамилия
          </label>
          <Input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Введите фамилию"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Название компании
        </label>
        <Input
          type="text"
          value={formData.companyName}
          onChange={(e) => handleInputChange('companyName', e.target.value)}
          icon={<Building size={16} />}
          placeholder="Введите название компании"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Базовая валюта
        </label>
        <CurrencySelect
          value={formData.currencyBase}
          onChange={(value) => handleInputChange('currencyBase', value)}
          placeholder="Выберите базовую валюту"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose} disabled={updateLoading}>
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateLoading}
          icon={<Save size={16} />}
        >
          {updateLoading ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
};
