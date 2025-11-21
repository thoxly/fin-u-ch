import { useState, useEffect } from 'react';
import {
  Building2,
  DollarSign,
  CreditCard,
  FileText,
  Link as LinkIcon,
  Save,
} from 'lucide-react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import { useGetMeQuery } from '../store/api/authApi';
import {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
} from '../store/api/companiesApi';
import { useNotification } from '../shared/hooks/useNotification';
import { CurrencySelect } from '../shared/ui/CurrencySelect';

type TabType = 'general' | 'currency' | 'billing' | 'details' | 'integrations';

export const CompanyPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const { data: user } = useGetMeQuery();
  const { data: company, isLoading } = useGetCompanyQuery();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState({
    companyName: '',
    companyInn: '',
    currencyBase: 'RUB',
  });

  useEffect(() => {
    if (user && company) {
      setFormData({
        companyName: user.companyName || '',
        companyInn: company.inn || '',
        currencyBase: company.currencyBase || 'RUB',
      });
    }
  }, [user, company]);

  const handleSave = async () => {
    try {
      await updateCompany({
        name: formData.companyName,
        inn: formData.companyInn || undefined,
        currencyBase: formData.currencyBase,
      }).unwrap();
      showSuccess('Данные компании успешно обновлены');
    } catch (error) {
      console.error('Ошибка при обновлении данных компании:', error);
      showError('Ошибка при обновлении данных компании');
    }
  };

  const tabs = [
    { id: 'general' as TabType, label: 'Основные настройки', icon: Building2 },
    { id: 'currency' as TabType, label: 'Валюта', icon: DollarSign },
    { id: 'billing' as TabType, label: 'Тариф и биллинг', icon: CreditCard },
    { id: 'details' as TabType, label: 'Реквизиты', icon: FileText },
    { id: 'integrations' as TabType, label: 'Интеграции', icon: LinkIcon },
  ];

  if (isLoading) {
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
            Моя компания
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Управление настройками и параметрами компании
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
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
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Основные настройки компании
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
          )}

          {activeTab === 'currency' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Настройки валюты
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Базовая валюта
                    </label>
                    <CurrencySelect
                      value={formData.currencyBase}
                      onChange={(value) =>
                        setFormData({ ...formData, currencyBase: value })
                      }
                      placeholder="Выберите базовую валюту"
                    />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Базовая валюта используется для отображения сумм в отчётах
                      и операциях
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  icon={<Save size={16} />}
                >
                  {isUpdating ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Тариф и биллинг
                </h2>
                <div className="text-gray-600 dark:text-gray-400">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CreditCard
                        size={20}
                        className="text-blue-600 dark:text-blue-400 mt-0.5"
                      />
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Текущий тариф: Базовый
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Управление тарифными планами, историей платежей и
                          настройками биллинга.
                        </p>
                        <p className="mt-2 text-sm italic">
                          Раздел в разработке
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Реквизиты компании
                </h2>
                <div className="text-gray-600 dark:text-gray-400">
                  <p>
                    Полные банковские реквизиты, юридический адрес и другая
                    официальная информация.
                  </p>
                  <p className="mt-2 text-sm italic">Раздел в разработке</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Интеграции
                </h2>
                <div className="text-gray-600 dark:text-gray-400">
                  <p>
                    Настройка интеграций с банками, бухгалтерскими системами и
                    другими сервисами.
                  </p>
                  <p className="mt-2 text-sm italic">Раздел в разработке</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Info Card */}
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
    </Layout>
  );
};
