import { useEffect, useState } from 'react';
import { DollarSign, Save } from 'lucide-react';
import { CompanyLayout } from './CompanyLayout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { CurrencySelect } from '../../shared/ui/CurrencySelect';
import {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
} from '../../store/api/companiesApi';
import { useNotification } from '../../shared/hooks/useNotification';

export const CurrencyPage = () => {
  const { data: company, isLoading } = useGetCompanyQuery();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const { showSuccess, showError } = useNotification();

  const [currencyBase, setCurrencyBase] = useState('RUB');

  useEffect(() => {
    if (company) {
      setCurrencyBase(company.currencyBase || 'RUB');
    }
  }, [company]);

  const handleSave = async () => {
    try {
      await updateCompany({
        currencyBase,
      }).unwrap();
      showSuccess('Настройки валюты успешно обновлены');
    } catch (error) {
      console.error('Ошибка при обновлении валюты:', error);
      showError('Ошибка при обновлении валюты');
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
                Настройки валюты
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Базовая валюта
                  </label>
                  <CurrencySelect
                    value={currencyBase}
                    onChange={setCurrencyBase}
                    placeholder="Выберите базовую валюту"
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Базовая валюта используется для отображения сумм в отчётах и
                    операциях
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
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <DollarSign
              size={20}
              className="text-blue-600 dark:text-blue-400 mt-0.5"
            />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                О валюте
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Базовая валюта определяет валюту по умолчанию для всех
                финансовых операций и отчётов. Эта настройка влияет на все
                отчёты в системе.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </CompanyLayout>
  );
};
