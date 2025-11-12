import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetMeQuery } from '../store/api/authApi';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { usePermissions } from '../shared/hooks/usePermissions';
import { RootState } from '../store/store';
import * as Icons from 'lucide-react';

export const AdminPage = () => {
  const navigate = useNavigate();
  const {
    data: user,
    isLoading,
    refetch,
  } = useGetMeQuery(undefined, {
    // Принудительно обновляем данные при монтировании компонента
    refetchOnMountOrArgChange: true,
  });
  const authUser = useSelector((state: RootState) => state.auth.user);
  const { canManageRoles, canRead } = usePermissions();

  // Используем данные из authSlice, если они более свежие, или из запроса
  const currentUser = user || authUser;

  // Принудительно обновляем данные при монтировании, если есть токен
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && !isLoading) {
      refetch();
    }
  }, [refetch, isLoading]);

  return (
    <Layout>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Загрузка...</div>
        </div>
      ) : !currentUser?.isSuperAdmin ? (
        <div className="flex items-center justify-center py-12">
          <Card className="p-8 text-center max-w-md">
            <Icons.Lock size={48} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">
              Доступ запрещён
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              У вас нет прав для доступа к разделу администрирования
            </p>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Администрирование
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Управление пользователями, ролями и правами доступа
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Управление пользователями */}
            <div
              className="cursor-pointer"
              onClick={() => {
                if (!canRead('users')) {
                  console.warn(
                    '[AdminPage] Попытка перехода на страницу "Пользователи" без необходимых прав доступа (users:read)'
                  );
                  return;
                }
                navigate('/admin/users');
              }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Icons.Users
                      size={24}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Пользователи
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Управление пользователями компании
                    </p>
                  </div>
                  <Icons.ChevronRight size={20} className="text-gray-400" />
                </div>
              </Card>
            </div>

            {/* Управление ролями */}
            {canManageRoles() && (
              <div
                className="cursor-pointer"
                onClick={() => navigate('/admin/roles')}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Icons.Shield
                        size={24}
                        className="text-purple-600 dark:text-purple-400"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Роли и права
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Создание и настройка ролей
                      </p>
                    </div>
                    <Icons.ChevronRight size={20} className="text-gray-400" />
                  </div>
                </Card>
              </div>
            )}

            {/* Журнал действий */}
            <div
              className="cursor-pointer"
              onClick={() => {
                if (!canRead('audit')) {
                  console.warn(
                    '[AdminPage] Попытка перехода на страницу "Журнал действий" без необходимых прав доступа (audit:read)'
                  );
                  return;
                }
                navigate('/admin/audit-logs');
              }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Icons.FileText
                      size={24}
                      className="text-orange-600 dark:text-orange-400"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Журнал действий
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      История всех действий пользователей
                    </p>
                  </div>
                  <Icons.ChevronRight size={20} className="text-gray-400" />
                </div>
              </Card>
            </div>

            {/* Настройки компании */}
            <div
              className="cursor-pointer"
              onClick={() => navigate('/admin/company-settings')}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Icons.Building2
                      size={24}
                      className="text-green-600 dark:text-green-400"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Настройки компании
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Параметры и конфигурация
                    </p>
                  </div>
                  <Icons.ChevronRight size={20} className="text-gray-400" />
                </div>
              </Card>
            </div>
          </div>

          {/* Информация о текущем пользователе */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Информация о текущем пользователе
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Icons.User size={18} className="text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Email:</strong> {currentUser?.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icons.Building2 size={18} className="text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Компания:</strong> {currentUser?.companyName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icons.ShieldCheck size={18} className="text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Статус:</strong> Супер-администратор
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
};
