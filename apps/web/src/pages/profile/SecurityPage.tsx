import { ProfileLayout } from './ProfileLayout';
import { Card } from '../../shared/ui/Card';
import {
  useGetMeQuery,
  useChangePasswordMutation,
  useRequestEmailChangeMutation,
} from '../../store/api/authApi';
import { EmailChangeSection } from '../../features/user-profile/EmailChangeSection';
import { PasswordChangeSection } from '../../features/user-profile/PasswordChangeSection';
import { useNotification } from '../../shared/hooks/useNotification';

export const SecurityPage = () => {
  const { data: user, isLoading: userLoading } = useGetMeQuery();
  const [changePassword, { isLoading: changePasswordLoading }] =
    useChangePasswordMutation();
  const [requestEmailChange, { isLoading: requestEmailChangeLoading }] =
    useRequestEmailChangeMutation();
  const { showSuccess, showError } = useNotification();

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
      <ProfileLayout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2">Загрузка...</span>
        </div>
      </ProfileLayout>
    );
  }

  return (
    <ProfileLayout>
      <Card>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Безопасность аккаунта
            </h2>
            <div className="space-y-6">
              <EmailChangeSection
                currentEmail={user?.email || ''}
                onRequestEmailChange={handleRequestEmailChange}
                isLoading={requestEmailChangeLoading}
              />
              <PasswordChangeSection
                onChangePassword={handleChangePassword}
                isLoading={changePasswordLoading}
              />
            </div>
          </div>
        </div>
      </Card>
    </ProfileLayout>
  );
};
