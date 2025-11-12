import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { usePermissions } from '../shared/hooks/usePermissions';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { getFirstAvailablePage } from '../shared/lib/getFirstAvailablePage';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Сущность для проверки прав (например, 'operations', 'articles', 'users')
   */
  entity?: string;
  /**
   * Действие для проверки прав (например, 'read', 'create', 'update')
   * По умолчанию 'read'
   */
  action?: string;
  /**
   * Если true, перенаправляет на /dashboard при отсутствии прав
   * Если false, показывает сообщение об отсутствии прав
   */
  redirect?: boolean;
}

/**
 * Компонент для защиты маршрутов на основе прав доступа
 *
 * @example
 * <ProtectedRoute entity="operations" action="read">
 *   <OperationsPage />
 * </ProtectedRoute>
 */
export const ProtectedRoute = ({
  children,
  entity,
  action = 'read',
  redirect = false,
}: ProtectedRouteProps) => {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  const location = useLocation();
  const { hasPermission, isLoading, permissions, isSuperAdmin } =
    usePermissions();

  // Проверка аутентификации
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Если права не указаны, просто проверяем аутентификацию
  if (!entity) {
    return <>{children}</>;
  }

  // Пока загружаются права, показываем загрузку
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  // Проверка прав доступа
  if (!hasPermission(entity, action)) {
    // Выводим предупреждение в консоль для страниц администрирования
    if (entity === 'users' || entity === 'audit') {
      console.warn(
        `[ProtectedRoute] Доступ запрещён: отсутствует право "${entity}:${action}"`,
        {
          entity,
          action,
          path: location.pathname,
        }
      );
    }

    // Определяем первую доступную страницу и редиректим туда
    const firstAvailablePage = getFirstAvailablePage(permissions, isSuperAdmin);

    if (redirect || firstAvailablePage) {
      // Редиректим на первую доступную страницу или на /redirect для определения
      return <Navigate to={firstAvailablePage || '/redirect'} replace />;
    }

    // Если нет доступных страниц, показываем сообщение об ошибке
    return (
      <Layout>
        <div className="space-y-6">
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Доступ запрещён
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                У вас нет прав для доступа к этой странице.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Обратитесь к администратору для получения доступа.
              </p>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
};
