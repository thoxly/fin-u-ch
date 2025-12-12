import { useEffect, useState } from 'react';
import { Building2, Save } from 'lucide-react';
import { CompanyLayout } from './CompanyLayout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
} from '../../store/api/companiesApi';
import { useNotification } from '../../shared/hooks/useNotification';

export const CompanySettingsPage = () => {
  const { data: company, isLoading } = useGetCompanyQuery();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState({
    companyName: '',
    companyInn: '',
  });

  useEffect(() => {
    if (company) {
      setFormData({
        companyName: company.name || '',
        companyInn: company.inn || '',
      });
    }
  }, [company]);

  const handleSave = async () => {
    try {
      await updateCompany({
        name: formData.companyName,
        inn: formData.companyInn || undefined,
      }).unwrap();
      showSuccess('Данные компании успешно обновлены');
    } catch (error) {
      console.error('Ошибка при обновлении данных компании:', error);
      showError('Ошибка при обновлении данных компании');
    }
  };

  if (isLoading) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2">Загрузка...</span>
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <div className="space-y-6">
        <Card>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Основная информация
              </h2>
              <div className="space-y-4">
                <Input
                  label="Название компании"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  icon={<Building2 size={16} />}
                  placeholder="Введите название компании"
                  required
                />
                <Input
                  label="ИНН"
                  value={formData.companyInn}
                  onChange={(e) =>
                    setFormData({ ...formData, companyInn: e.target.value })
                  }
                  placeholder="Введите ИНН компании"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={handleSave}
                disabled={isUpdating || !formData.companyName.trim()}
                icon={<Save size={16} />}
              >
                {isUpdating ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Building2
              size={20}
              className="text-blue-600 dark:text-blue-400 mt-0.5"
            />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                О настройках компании
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Изменения в настройках компании применяются для всех
                пользователей организации. Некоторые настройки могут потребовать
                прав администратора.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </CompanyLayout>
  );
};
