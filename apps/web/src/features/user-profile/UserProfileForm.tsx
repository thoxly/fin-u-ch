import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import {
  useGetMeQuery,
  useUpdateUserMutation,
  useChangePasswordMutation,
  useRequestEmailChangeMutation,
} from '../../store/api/authApi';
import { useUpdateCompanyMutation } from '../../store/api/companiesApi';
import { Button } from '../../shared/ui/Button';
import { ProfileInfoSection } from './ProfileInfoSection';
import { EmailChangeSection } from './EmailChangeSection';
import { PasswordChangeSection } from './PasswordChangeSection';

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

  const handleRequestEmailChange = async (newEmail: string): Promise<void> => {
    await requestEmailChange({ newEmail }).unwrap();
    alert('Письмо с подтверждением отправлено на ваш текущий email');
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    await changePassword({
      currentPassword,
      newPassword,
    }).unwrap();
    alert('Пароль успешно изменен');
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
        companyName={formData.companyName}
        currencyBase={formData.currencyBase}
        onFirstNameChange={(value) => handleInputChange('firstName', value)}
        onLastNameChange={(value) => handleInputChange('lastName', value)}
        onCompanyNameChange={(value) => handleInputChange('companyName', value)}
        onCurrencyBaseChange={(value) =>
          handleInputChange('currencyBase', value)
        }
      />

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
