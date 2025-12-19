import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';
import { useGetSubscriptionQuery } from '../../store/api/subscriptionApi';

interface Tab {
  id: string;
  label: string;
  path: string;
  requiresPlan?: 'TEAM' | 'BUSINESS';
}

const allTabs: Tab[] = [
  { id: 'settings', label: 'Основные настройки', path: '/company' },
  { id: 'currency', label: 'Валюта', path: '/company/currency' },
  { id: 'tariff', label: 'Тариф', path: '/company/tariff' },
  {
    id: 'integrations',
    label: 'Интеграции',
    path: '/company/integrations',
    requiresPlan: 'TEAM',
  },
];

interface CompanyLayoutProps {
  children: React.ReactNode;
}

export const CompanyLayout = ({ children }: CompanyLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Загружаем данные подписки через RTK Query
  const { data: subscription } = useGetSubscriptionQuery();
  const plan = (subscription?.plan as 'START' | 'TEAM' | 'BUSINESS') || 'START';

  // Фильтруем вкладки в зависимости от тарифа
  const tabs = useMemo(() => {
    return allTabs.filter((tab) => {
      if (!tab.requiresPlan) return true;
      if (tab.requiresPlan === 'TEAM') {
        return plan === 'TEAM' || plan === 'BUSINESS';
      }
      if (tab.requiresPlan === 'BUSINESS') {
        return plan === 'BUSINESS';
      }
      return true;
    });
  }, [plan]);

  const [activeTab, setActiveTab] = useState(() => {
    const currentPath = location.pathname;
    if (currentPath === '/company' || currentPath === '/company/')
      return 'settings';
    if (currentPath === '/company/currency') return 'currency';
    if (currentPath === '/company/tariff') return 'tariff';
    if (currentPath === '/company/integrations') return 'integrations';
    return 'settings';
  });

  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath === '/company' || currentPath === '/company/') {
      setActiveTab('settings');
    } else if (currentPath === '/company/currency') {
      setActiveTab('currency');
    } else if (currentPath === '/company/tariff') {
      setActiveTab('tariff');
    } else if (currentPath === '/company/integrations') {
      // Проверяем, есть ли доступ к интеграциям
      if (plan === 'TEAM' || plan === 'BUSINESS') {
        setActiveTab('integrations');
      } else {
        // Если нет доступа, перенаправляем на тариф
        navigate('/company/tariff');
        setActiveTab('tariff');
      }
    }
  }, [location.pathname, plan, navigate]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Компания
          </h1>
        </div>

        {/* Tabs Navigation */}
        <Card>
          <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Tab Content */}
        {children}
      </div>
    </Layout>
  );
};
