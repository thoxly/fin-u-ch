import { useState, useEffect } from 'react';
import { User, Lock, Settings } from 'lucide-react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import {
  useGetMeQuery,
  useUpdateUserMutation,
  useChangePasswordMutation,
  useRequestEmailChangeMutation,
} from '../store/api/authApi';
import { EmailChangeSection } from '../features/user-profile/EmailChangeSection';
import { PasswordChangeSection } from '../features/user-profile/PasswordChangeSection';
import { PersonalSettingsSection } from '../features/user-profile/PersonalSettingsSection';
import { useNotification } from '../shared/hooks/useNotification';
import { Input } from '../shared/ui/Input';
import { Save } from 'lucide-react';

type TabType = 'profile' | 'security' | 'settings';

export const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { data: user, isLoading: userLoading } = useGetMeQuery();
  const [updateUser, { isLoading: updateUserLoading }] =
    useUpdateUserMutation();
  const [changePassword, { isLoading: changePasswordLoading }] =
    useChangePasswordMutation();
  const [requestEmailChange, { isLoading: requestEmailChangeLoading }] =
    useRequestEmailChangeMutation();
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
  });

  // Update form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      await updateUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
      }).unwrap();
      showSuccess('Профиль успешно обновлен');
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

  const tabs = [
    { id: 'profile' as TabType, label: 'Профиль', icon: User },
    { id: 'security' as TabType, label: 'Безопасность', icon: Lock },
    { id: 'settings' as TabType, label: 'Личные настройки', icon: Settings },
  ];

  if (userLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2">Загрузка...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Мой профиль
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Управление личными данными и настройками безопасности
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <Card>
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Личная информация
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Имя"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      placeholder="Введите имя"
                    />
                    <Input
                      label="Фамилия"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      placeholder="Введите фамилию"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateUserLoading}
                  icon={<Save size={16} />}
                >
                  {updateUserLoading ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
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
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Личные настройки
                </h2>
                <PersonalSettingsSection />
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};
