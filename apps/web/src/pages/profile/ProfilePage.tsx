import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { ProfileLayout } from './ProfileLayout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { useGetMeQuery, useUpdateUserMutation } from '../../store/api/authApi';
import { useNotification } from '../../shared/hooks/useNotification';

export const ProfilePage = () => {
  const { data: user, isLoading: userLoading } = useGetMeQuery();
  const [updateUser, { isLoading: updateUserLoading }] =
    useUpdateUserMutation();
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
  });

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
      </Card>
    </ProfileLayout>
  );
};
