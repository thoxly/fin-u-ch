import { useState, useEffect } from 'react';
import { X, Save, User, Mail, Building } from 'lucide-react';
import { useGetMeQuery, useUpdateUserMutation } from '../../store/api/authApi';
import { Input } from './Input';
import { Button } from './Button';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal = ({
  isOpen,
  onClose,
}: UserProfileModalProps): JSX.Element => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    companyName: '',
  });

  const { data: user, isLoading: userLoading } = useGetMeQuery();
  const [updateUser, { isLoading: updateLoading }] = useUpdateUserMutation();

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        companyName: user.companyName || '',
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
      await updateUser({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName,
      }).unwrap();
      onClose();
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
    }
  };

  const handleClose = (): void => {
    // Восстанавливаем исходные данные при закрытии
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        companyName: user.companyName || '',
      });
    }
    onClose();
  };

  if (!isOpen) return <></>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <User
              size={24}
              className="text-primary-600 dark:text-primary-400"
            />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Мой профиль
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {userLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  icon={<Mail size={16} />}
                  placeholder="Введите email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Имя
                  </label>
                  <Input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange('firstName', e.target.value)
                    }
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
                    onChange={(e) =>
                      handleInputChange('lastName', e.target.value)
                    }
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
                  onChange={(e) =>
                    handleInputChange('companyName', e.target.value)
                  }
                  icon={<Building size={16} />}
                  placeholder="Введите название компании"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={updateLoading}
          >
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
    </div>
  );
};
