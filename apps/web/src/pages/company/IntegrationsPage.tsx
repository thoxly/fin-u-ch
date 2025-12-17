import { CompanyLayout } from './CompanyLayout';
import { Card } from '../../shared/ui/Card';
import { LinkIcon } from 'lucide-react';

export const IntegrationsPage = () => {
  return (
    <CompanyLayout>
      <div className="space-y-6">
        <Card>
          <div className="text-center py-12">
            <LinkIcon size={48} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Интеграции в разработке
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Функция интеграций с банками, бухгалтерскими системами и другими
              сервисами находится в разработке. Следите за обновлениями.
            </p>
          </div>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <LinkIcon
              size={20}
              className="text-blue-600 dark:text-blue-400 mt-0.5"
            />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                О интеграциях
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Интеграции помогут вам подключить данные из других систем и
                автоматизировать рабочие процессы в вашей компании.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </CompanyLayout>
  );
};
