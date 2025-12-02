import { useState, useEffect } from 'react';
import { Building2, Save, DollarSign } from 'lucide-react';
import { AdminLayout } from '../../shared/ui/AdminLayout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
} from '../../store/api/companiesApi';
import { useNotification } from '../../shared/hooks/useNotification';
import { usePermissions } from '../../shared/hooks/usePermissions';

const CURRENCIES = [
  { value: 'RUB', label: 'Российский рубль (RUB)' },
  { value: 'USD', label: 'Доллар США (USD)' },
  { value: 'EUR', label: 'Евро (EUR)' },
  { value: 'GBP', label: 'Фунт стерлингов (GBP)' },
  { value: 'CNY', label: 'Китайский юань (CNY)' },
  { value: 'JPY', label: 'Японская иена (JPY)' },
];

export const CompanySettingsPage = () => {
  const { showSuccess, showError } = useNotification();
  const { canRead } = usePermissions();

  const { data: company, isLoading } = useGetCompanyQuery(undefined, {
    skip: !canRead('users'), // Используем users:read как проверку доступа к админке
  });
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();

  const [companyName, setCompanyName] = useState('');
  const [currencyBase, setCurrencyBase] = useState('RUB');

  useEffect(() => {
    if (company) {
      setCompanyName(company.name || '');
      setCurrencyBase(company.currencyBase || 'RUB');
    }
  }, [company]);

  const handleSave = async () => {
    if (!companyName.trim()) {
      showError('Введите название компании');
      return;
    }

    try {
      await updateCompany({
        name: companyName.trim(),
        currencyBase,
      }).unwrap();
      showSuccess('Настройки компании успешно обновлены');
    } catch (error) {
      const rawErrorMessage =
        error &&
        typeof error === 'object' &&
        'data' in error &&
        error.data &&
        typeof error.data === 'object' &&
        'message' in error.data &&
        typeof error.data.message === 'string'
          ? error.data.message
          : undefined;

      const errorMessage = rawErrorMessage
        ? rawErrorMessage
            .replace(/Операция\s+[\w-]+:\s*/gi, '')
            .replace(/^[^:]+:\s*/i, '')
            .trim()
        : 'Ошибка при обновлении настроек компании';

      showError(
        errorMessage &&
          errorMessage.length > 5 &&
          !errorMessage.match(/^[A-Z_]+$/)
          ? errorMessage
          : 'Ошибка при обновлении настроек компании'
      );
    }
  };

  if (!canRead('users')) {
    return (
      <AdminLayout>
        <Card className="p-8 text-center max-w-md mx-auto">
          <Building2 size={48} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">
            Доступ запрещён
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            У вас нет прав для просмотра настроек компании
          </p>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Настройки компании
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Управление основными параметрами компании
          </p>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">Загрузка...</div>
          </Card>
        ) : (
          <Card>
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Основная информация
                </h2>
                <div className="space-y-4">
                  <Input
                    label="Название компании"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    icon={<Building2 size={18} />}
                    placeholder="Введите название компании"
                  />

                  <div>
                    <label className="label flex items-center gap-2">
                      <DollarSign size={18} className="text-gray-400" />
                      Базовая валюта
                    </label>
                    <select
                      value={currencyBase}
                      onChange={(e) => setCurrencyBase(e.target.value)}
                      className="input w-full"
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency.value} value={currency.value}>
                          {currency.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Базовая валюта используется для отображения сумм в отчётах
                      и операциях
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (company) {
                      setCompanyName(company.name || '');
                      setCurrencyBase(company.currencyBase || 'RUB');
                    }
                  }}
                  disabled={isUpdating}
                  className="w-full sm:w-auto"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isUpdating || !companyName.trim()}
                  icon={<Save size={20} />}
                  className="w-full sm:w-auto"
                >
                  {isUpdating ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Информационная карточка */}
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
                Название компании отображается в интерфейсе и используется в
                отчётах. Базовая валюта определяет валюту по умолчанию для всех
                финансовых операций и отчётов.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};
