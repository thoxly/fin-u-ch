/* eslint-disable @typescript-eslint/no-explicit-any */
// features/integrations/IntegrationsDropdown.tsx
import { useState, useRef, useEffect } from 'react';
import { X, Settings, Puzzle } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { OzonIntegration } from './ozon-integration-operation/OzonIntegration';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { OzonIcon } from './OzonIcon';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

interface Integration {
  id: string;
  name: string;
  icon: string | ((OzonIcon) => JSX.Element);
  connected: boolean;
  data?: {
    clientKey?: string;
    apiKey?: string;
    paymentSchedule?: 'next_week' | 'week_after';
  };
}

interface IntegrationsDropdownProps {
  integrations: Integration[];
  onIntegrationUpdate: (integrationId: string, data: any) => void;
}

export const IntegrationsDropdown = ({
  integrations,
  onIntegrationUpdate,
}: IntegrationsDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Закрытие при клике вне (только для десктопной версии)
  useEffect(() => {
    if (isMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIntegration(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  const handleIntegrationClick = (integrationId: string) => {
    setSelectedIntegration(integrationId);
  };

  const handleSaveIntegration = (integrationId: string, data: any) => {
    onIntegrationUpdate(integrationId, data);
    setSelectedIntegration(null);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setSelectedIntegration(null);
  };

  const getIntegrationComponent = (integrationId: string) => {
    const integration = integrations.find((i) => i.id === integrationId);

    switch (integrationId) {
      case 'ozon':
        return (
          <OzonIntegration
            onSave={(data) => handleSaveIntegration(integrationId, data)}
            onCancel={handleCancel}
            initialData={integration?.data}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-500 dark:hover:border-primary-400 transition-colors flex items-center justify-center"
        title="Интеграции"
      >
        <Puzzle size={18} className="text-primary-600 dark:text-primary-400" />

        {integrations.some((i) => i.connected) && (
          <span className="absolute -top-1.5 -right-1.5 bg-green-600 dark:bg-green-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {integrations.filter((i) => i.connected).length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {isMobile ? (
            // Мобильная версия - полноэкранное модальное окно
            <div
              className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 flex items-end sm:items-center justify-center"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsOpen(false);
                  setSelectedIntegration(null);
                }
              }}
            >
              <div
                className="w-full max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Заголовок с кнопкой закрытия */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedIntegration
                      ? 'Настройка интеграции'
                      : 'Интеграции'}
                  </h3>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setSelectedIntegration(null);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Закрыть"
                  >
                    <X size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                {/* Контент */}
                <div className="flex-1 overflow-y-auto p-4">
                  {!selectedIntegration ? (
                    <div className="space-y-3">
                      {integrations.length === 0 ? (
                        <div className="p-6 text-center">
                          <Settings
                            size={48}
                            className="mx-auto mb-4 text-gray-400 dark:text-gray-500"
                          />
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Нет доступных интеграций
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Интеграции позволяют автоматизировать работу с
                            внешними сервисами.
                          </p>
                        </div>
                      ) : (
                        integrations.map((integration: any) => (
                          <button
                            key={integration.id}
                            onClick={() =>
                              handleIntegrationClick(integration.id)
                            }
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {typeof integration.icon === 'function' ? (
                                  <integration.icon size={30} />
                                ) : (
                                  <span className="text-sm font-bold">
                                    {integration.icon}
                                  </span>
                                )}
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white text-left">
                                    {integration.name}
                                  </div>
                                  <div
                                    className={`text-xs ${
                                      integration.connected
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                  >
                                    {integration.connected
                                      ? 'Подключено'
                                      : 'Не подключено'}
                                  </div>
                                </div>
                              </div>
                              <div
                                className={`px-2 py-1 rounded-full text-xs ${
                                  integration.connected
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {integration.connected
                                  ? 'Активно'
                                  : 'Не активно'}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <X size={16} />
                        Назад к списку
                      </button>
                      {getIntegrationComponent(selectedIntegration)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Десктопная версия - выпадающее меню
            <div className="absolute z-50 right-0 mt-2 w-[600px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[500px] overflow-y-auto">
              <div className="p-4">
                {!selectedIntegration ? (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Интеграции
                    </h3>
                    {integrations.length === 0 ? (
                      <div className="p-4 text-center">
                        <Settings
                          size={32}
                          className="mx-auto mb-3 text-gray-400 dark:text-gray-500"
                        />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          Нет доступных интеграций
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Интеграции позволяют автоматизировать работу с
                          внешними сервисами.
                        </p>
                      </div>
                    ) : (
                      integrations.map((integration: any) => (
                        <button
                          key={integration.id}
                          onClick={() => handleIntegrationClick(integration.id)}
                          className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {typeof integration.icon === 'function' ? (
                                <integration.icon size={40} />
                              ) : (
                                <span className="text-sm font-bold">
                                  {integration.icon}
                                </span>
                              )}
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white text-left">
                                  {integration.name}
                                </div>
                                <div
                                  className={`text-xs ${
                                    integration.connected
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}
                                >
                                  {integration.connected
                                    ? 'Подключено'
                                    : 'Не подключено'}
                                </div>
                              </div>
                            </div>
                            <div
                              className={`px-2 py-1 rounded-full text-xs ${
                                integration.connected
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {integration.connected ? 'Активно' : 'Не активно'}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X size={16} />
                      Назад к списку
                    </button>
                    {getIntegrationComponent(selectedIntegration)}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
