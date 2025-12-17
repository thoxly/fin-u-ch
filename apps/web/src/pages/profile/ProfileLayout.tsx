import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../../shared/ui/Layout';
import { Card } from '../../shared/ui/Card';

interface Tab {
  id: string;
  label: string;
  path: string;
}

const tabs: Tab[] = [
  { id: 'profile', label: 'Профиль', path: '/profile' },
  { id: 'security', label: 'Безопасность', path: '/profile/security' },
  { id: 'settings', label: 'Личные настройки', path: '/profile/settings' },
];

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export const ProfileLayout = ({ children }: ProfileLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const currentPath = location.pathname;
    return currentPath === '/profile'
      ? 'profile'
      : currentPath === '/profile/security'
        ? 'security'
        : 'settings';
  });

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab.id);
    navigate(tab.path);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Профиль
          </h1>
        </div>

        {/* Tabs Navigation */}
        <Card>
          <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
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
