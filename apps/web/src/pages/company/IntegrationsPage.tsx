import { useState, useEffect } from 'react';
import { CompanyLayout } from './CompanyLayout';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { LinkIcon, Check, X, Loader2 } from 'lucide-react';
import { OzonIcon } from '../../features/integrations/OzonIcon';
import { OzonIntegration } from '../../features/integrations/ozon-integration-operation/OzonIntegration';
import {
  useGetOzonIntegrationQuery,
  useDisconnectOzonIntegrationMutation,
} from '../../store/api/integrationsApi';
import { useAppSelector } from '../../shared/hooks/useRedux';
import { useNotification } from '../../shared/hooks/useNotification';

interface Integration {
  id: string;
  name: string;
  icon: typeof OzonIcon;
  description: string;
  connected: boolean;
  data?: {
    clientKey?: string;
    apiKey?: string;
    paymentSchedule?: 'next_week' | 'week_after';
    articleId?: string;
    accountId?: string;
  };
}

export const IntegrationsPage = () => {
  const plan =
    useAppSelector((state) => state.subscription?.data?.plan) || 'START';
  const canUseIntegrations = plan === 'TEAM' || plan === 'BUSINESS';

  const { data: ozonIntegrationData, isLoading: isLoadingOzonIntegration } =
    useGetOzonIntegrationQuery(undefined, { skip: !canUseIntegrations });
  const [disconnectOzonIntegration] = useDisconnectOzonIntegrationMutation();
  const { showSuccess, showError } = useNotification();

  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'ozon',
      name: 'Ozon',
      icon: OzonIcon,
      description:
        'Автоматическая загрузка операций и выплат с вашего аккаунта Ozon',
      connected: false,
      data: undefined,
    },
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null
  );
  const [disconnectingIntegration, setDisconnectingIntegration] = useState<
    string | null
  >(null);

  // Обновляем состояние интеграций при загрузке данных
  useEffect(() => {
    if (!canUseIntegrations) {
      return;
    }

    if (ozonIntegrationData?.success && ozonIntegrationData?.data) {
      setIntegrations((prev) =>
        prev.map((integration) =>
          integration.id === 'ozon'
            ? {
                ...integration,
                connected: ozonIntegrationData.data?.connected || false,
                data: ozonIntegrationData.data?.data,
              }
            : integration
        )
      );
    }
  }, [canUseIntegrations, ozonIntegrationData]);

  const handleIntegrationUpdate = (
    integrationId: string,
    data: {
      clientKey: string;
      apiKey: string;
      paymentSchedule: 'next_week' | 'week_after';
      articleId: string;
      accountId: string;
    }
  ) => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === integrationId
          ? { ...integration, connected: true, data }
          : integration
      )
    );
    setSelectedIntegration(null);
  };

  const handleDisconnect = async (integrationId: string) => {
    setDisconnectingIntegration(integrationId);
    try {
      if (integrationId === 'ozon') {
        const result = await disconnectOzonIntegration().unwrap();
        if (result.success) {
          setIntegrations((prev) =>
            prev.map((integration) =>
              integration.id === integrationId
                ? { ...integration, connected: false, data: undefined }
                : integration
            )
          );
          showSuccess('Интеграция успешно отключена');
          setSelectedIntegration(null);
        } else {
          showError(result.error || 'Ошибка при отключении интеграции');
        }
      }
    } catch (error) {
      console.error('Failed to disconnect integration:', error);
      showError('Ошибка при отключении интеграции');
    } finally {
      setDisconnectingIntegration(null);
    }
  };

  const getIntegrationComponent = (integrationId: string) => {
    const integration = integrations.find((i) => i.id === integrationId);

    switch (integrationId) {
      case 'ozon':
        return (
          <OzonIntegration
            onSave={(data) => handleIntegrationUpdate(integrationId, data)}
            onCancel={() => setSelectedIntegration(null)}
            initialData={integration?.data}
            isConnected={integration?.connected || false}
            onDisconnect={() => handleDisconnect(integrationId)}
            isDisconnecting={disconnectingIntegration === integrationId}
          />
        );
      default:
        return null;
    }
  };

  // Если тариф не позволяет использовать интеграции
  if (!canUseIntegrations) {
    return (
      <CompanyLayout>
        <div className="space-y-6">
          <Card>
            <div className="text-center py-12">
              <LinkIcon size={48} className="mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Интеграции
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Подключение интеграций (Ozon и др.) доступно на тарифах TEAM и
                BUSINESS.
              </p>
              <Button
                onClick={() => (window.location.href = '/company/tarif')}
                size="sm"
              >
                Перейти к тарифам
              </Button>
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
  }

  // Если выбрана конкретная интеграция для настройки
  if (selectedIntegration) {
    return (
      <CompanyLayout>
        <div className="space-y-6">
          {getIntegrationComponent(selectedIntegration)}
        </div>
      </CompanyLayout>
    );
  }

  // Основной список интеграций
  return (
    <CompanyLayout>
      <div className="space-y-6">
        {/* Описание раздела */}
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

        {/* Список доступных интеграций */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Доступные интеграции
          </h2>

          {isLoadingOzonIntegration ? (
            <Card>
              <div className="flex items-center justify-center py-8">
                <Loader2
                  size={32}
                  className="text-primary-600 dark:text-primary-400 animate-spin"
                />
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => {
                const IconComponent = integration.icon;
                return (
                  <Card key={integration.id}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                        <IconComponent size={32} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {integration.name}
                          </h3>
                          {integration.connected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <Check size={12} />
                              Подключено
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                              <X size={12} />
                              Не подключено
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {integration.description}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        <Button
                          onClick={() => setSelectedIntegration(integration.id)}
                          size="sm"
                          variant={
                            integration.connected ? 'secondary' : 'primary'
                          }
                        >
                          {integration.connected ? 'Настроить' : 'Подключить'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Информация о будущих интеграциях */}
        <Card className="bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700">
          <div className="text-center py-8">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Больше интеграций скоро
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Мы работаем над добавлением интеграций с банками, бухгалтерскими
              системами и другими сервисами. Следите за обновлениями.
            </p>
          </div>
        </Card>
      </div>
    </CompanyLayout>
  );
};
