import { useState, useEffect } from 'react';
import { Save, User, Mail, Building } from 'lucide-react';
import { useGetMeQuery, useUpdateUserMutation } from '../../store/api/authApi';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';

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

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
