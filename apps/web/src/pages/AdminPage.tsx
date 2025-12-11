import { useState } from 'react';
import { Users, Shield, FileText, Code } from 'lucide-react';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { FeatureBlocker } from '../shared/ui/FeatureBlocker';
import { usePermissions } from '../shared/hooks/usePermissions';
import { useAppSelector } from '../shared/hooks/useRedux';
import { RootState } from '../store/store';
import { UsersTab } from './admin/UsersTab';
import { RolesTab } from './admin/RolesTab';
import { AuditLogsTab } from './admin/AuditLogsTab';

type TabType = 'users' | 'roles' | 'audit' | 'api';

interface AdminTab {
  id: TabType;
  label: string;
  icon: typeof Users;
  requiredPermission?: { entity: string; action: string };
  requiresPlan?: 'START' | 'TEAM' | 'BUSINESS';
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
    id: 'api',
    label: 'API',
    icon: Code,
    requiresPlan: 'BUSINESS',
  },
];

export const AdminPage = () => {
  const { hasPermission } = usePermissions();
  const subscriptionData = useAppSelector(
    (state: RootState) => state.subscription?.data ?? null
  );

  // Фильтруем табы по правам доступа и плану
  const availableTabs = adminTabs.filter((tab) => {
    // Check permissions
    if (tab.requiredPermission) {
      if (
        !hasPermission(
          tab.requiredPermission.entity,
          tab.requiredPermission.action
        )
      ) {
        return false;
      }
    }

    // Check plan requirements
    if (tab.requiresPlan) {
      const planHierarchy = { START: 0, TEAM: 1, BUSINESS: 2 };
      const requiredLevel = planHierarchy[tab.requiresPlan];
      const currentLevel =
        planHierarchy[subscriptionData?.plan || 'START'] || 0;
      if (currentLevel < requiredLevel) {
        return false;
      }
    }

    return true;
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

        <Card>
          <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Tab Content */}
        <div>
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'roles' && <RolesTabWithFeatureCheck />}
          {activeTab === 'audit' && <AuditLogsTab />}
          {activeTab === 'api' && <ApiTab />}
        </div>
      </div>
    </Layout>
  );
};

/**
 * Компонент для вкладки API
 */
function ApiTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          API Документация
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Получайте доступ к мощному REST API для интеграции внешних сервисов с
          системой финансового учета.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authentication Card */}
        <Card className="p-6 border-l-4 border-l-blue-500">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            🔐 Аутентификация
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>Используйте JWT токены для аутентификации всех запросов API.</p>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs font-mono">
              Authorization: Bearer {'<your-token>'}
            </div>
            <p>
              <strong>Статус:</strong>{' '}
              <span className="text-green-600 dark:text-green-400">
                ✓ Готово
              </span>
            </p>
          </div>
        </Card>

        {/* Operations Card */}
        <Card className="p-6 border-l-4 border-l-purple-500">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            📊 Операции
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>Получение, создание и управление операциями через API.</p>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs font-mono">
              GET /api/operations
            </div>
            <p>
              <strong>Статус:</strong>{' '}
              <span className="text-green-600 dark:text-green-400">
                ✓ Готово
              </span>
            </p>
          </div>
        </Card>

        {/* Integrations Card */}
        <Card className="p-6 border-l-4 border-l-orange-500">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            🔗 Интеграции
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>Встроенные интеграции с популярными сервисами и платформами.</p>
            <div className="space-y-1">
              <div>• Ozon</div>
              <div>• 1C</div>
              <div>• Telegram</div>
            </div>
            <p>
              <strong>Статус:</strong>{' '}
              <span className="text-yellow-600 dark:text-yellow-400">
                ⚙ В разработке
              </span>
            </p>
          </div>
        </Card>

        {/* Reports Card */}
        <Card className="p-6 border-l-4 border-l-green-500">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            📈 Отчеты
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p>
              Автоматическое создание и экспорт отчетов в различных форматах.
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs font-mono">
              GET /api/reports
            </div>
            <p>
              <strong>Статус:</strong>{' '}
              <span className="text-green-600 dark:text-green-400">
                ✓ Готово
              </span>
            </p>
          </div>
        </Card>
      </div>

      {/* API Keys Section */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          🔑 API Ключи
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Управляйте своими API ключами для безопасного доступа к API.
        </p>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <div>
              <div className="text-sm font-mono">sk_live_*****</div>
              <div className="text-xs text-gray-500">Создан 3 месяца назад</div>
            </div>
            <button className="text-red-600 hover:text-red-700 text-sm">
              Удалить
            </button>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/10">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          💡 Документация
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Подробная документация доступна по адресу:{' '}
          <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs">
            https://api.fin-u-ch.local/docs
          </code>
        </p>
      </Card>
    </div>
  );
}

/**
 * Обёртка для RolesTab с проверкой доступа к фиче "roles" (требует TEAM+)
 */
function RolesTabWithFeatureCheck() {
  const subscriptionData = useAppSelector(
    (state: RootState) => state.subscription?.data ?? null
  );
  const planHierarchy = { START: 0, TEAM: 1, BUSINESS: 2 };
  const requiredLevel = planHierarchy['TEAM'];
  const currentLevel = planHierarchy[subscriptionData?.plan || 'START'] || 0;

  if (currentLevel < requiredLevel) {
    return <FeatureBlocker feature="roles" requiredPlan="TEAM" />;
  }

  return <RolesTab />;
}
