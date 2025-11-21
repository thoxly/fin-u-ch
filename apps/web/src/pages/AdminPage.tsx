import { useState } from 'react';
import { Users, Shield, FileText, Building2 } from 'lucide-react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { usePermissions } from '../shared/hooks/usePermissions';
import { UsersTab } from './admin/UsersTab';
import { RolesTab } from './admin/RolesTab';
import { AuditLogsTab } from './admin/AuditLogsTab';
import { CompanySettingsTab } from './admin/CompanySettingsTab';

type TabType = 'users' | 'roles' | 'audit' | 'company';

interface AdminTab {
  id: TabType;
  label: string;
  icon: typeof Users;
  requiredPermission?: { entity: string; action: string };
}

const adminTabs: AdminTab[] = [
  {
    id: 'users',
    label: 'Пользователи',
    icon: Users,
    requiredPermission: { entity: 'users', action: 'read' },
  },
  {
    id: 'roles',
    label: 'Роли и права',
    icon: Shield,
    requiredPermission: { entity: 'users', action: 'manage_roles' },
  },
  {
    id: 'audit',
    label: 'Журнал действий',
    icon: FileText,
    requiredPermission: { entity: 'audit', action: 'read' },
  },
  {
    id: 'company',
    label: 'Настройки компании',
    icon: Building2,
    requiredPermission: { entity: 'users', action: 'read' },
  },
];

export const AdminPage = () => {
  const { hasPermission } = usePermissions();

  // Фильтруем табы по правам доступа
  const availableTabs = adminTabs.filter((tab) => {
    if (!tab.requiredPermission) return true;
    return hasPermission(
      tab.requiredPermission.entity,
      tab.requiredPermission.action
    );
  });

  // Устанавливаем активный таб - первый доступный
  const [activeTab, setActiveTab] = useState<TabType>(
    availableTabs.length > 0 ? availableTabs[0].id : 'users'
  );

  // Если нет доступных табов, показываем сообщение
  if (availableTabs.length === 0) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Администрирование
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Управление пользователями, ролями и настройками системы
            </p>
          </div>
          <Card>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Shield size={48} className="mx-auto mb-4 text-gray-400" />
              <p>У вас нет прав для доступа к разделу администрирования</p>
            </div>
          </Card>
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
            Администрирование
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Управление пользователями, ролями и настройками системы
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {availableTabs.map((tab) => {
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
        <div>
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'roles' && <RolesTab />}
          {activeTab === 'audit' && <AuditLogsTab />}
          {activeTab === 'company' && <CompanySettingsTab />}
        </div>
      </div>
    </Layout>
  );
};
