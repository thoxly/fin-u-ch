import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import {
  useGetMeQuery,
  useUpdateUserMutation,
  useChangePasswordMutation,
  useRequestEmailChangeMutation,
} from '../../store/api/authApi';
import { Button } from '../../shared/ui/Button';
import { ProfileInfoSection } from './ProfileInfoSection';
import { EmailChangeSection } from './EmailChangeSection';
import { PasswordChangeSection } from './PasswordChangeSection';
import { useNotification } from '../../shared/hooks/useNotification';

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
  });

  const { data: user, isLoading: userLoading } = useGetMeQuery();
  const [updateUser, { isLoading: updateUserLoading }] =
    useUpdateUserMutation();
  const [changePassword, { isLoading: changePasswordLoading }] =
    useChangePasswordMutation();
  const [requestEmailChange, { isLoading: requestEmailChangeLoading }] =
    useRequestEmailChangeMutation();

  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
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
      // Обновляем только данные пользователя
      await updateUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
      }).unwrap();

      showSuccess('Профиль успешно обновлен');
      onClose();
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
      showError('Ошибка при обновлении профиля');
    }
  };

  const handleRequestEmailChange = async (newEmail: string): Promise<void> => {
    try {
      await requestEmailChange({ newEmail }).unwrap();
      showSuccess('Письмо с подтверждением отправлено на ваш текущий email');
    } catch (error) {
      console.error('Ошибка при запросе смены email:', error);
      showError('Ошибка при запросе смены email');
    }
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    try {
      await changePassword({
        currentPassword,
        newPassword,
      }).unwrap();
      showSuccess('Пароль успешно изменен');
    } catch (error) {
      console.error('Ошибка при смене пароля:', error);
      showError('Ошибка при смене пароля');
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
      <EmailChangeSection
        currentEmail={formData.email}
        onRequestEmailChange={handleRequestEmailChange}
        isLoading={requestEmailChangeLoading}
      />

      <PasswordChangeSection
        onChangePassword={handleChangePassword}
        isLoading={changePasswordLoading}
      />

      <ProfileInfoSection
        firstName={formData.firstName}
        lastName={formData.lastName}
        onFirstNameChange={(value) => handleInputChange('firstName', value)}
        onLastNameChange={(value) => handleInputChange('lastName', value)}
      />

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={updateUserLoading}
        >
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateUserLoading}
          icon={<Save size={16} />}
        >
          {updateUserLoading ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
};
