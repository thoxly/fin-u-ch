import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetMeQuery } from '../store/api/authApi';
import { useGetUserPermissionsQuery } from '../store/api/usersApi';
import { getFirstAvailablePage } from '../shared/lib/getFirstAvailablePage';
import { Layout } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import * as Icons from 'lucide-react';

/**
 * Компонент для автоматического редиректа на первую доступную страницу
 * Используется после успешного логина
 */
export const RedirectToFirstAvailable = () => {
  const navigate = useNavigate();
  const { data: user, isLoading: isLoadingUser } = useGetMeQuery();
  const { data: permissions, isLoading: isLoadingPermissions } =
    useGetUserPermissionsQuery(user?.id || '', { skip: !user?.id });

  const [showNoAccess, setShowNoAccess] = useState(false);

  useEffect(() => {
    // Ждем загрузки пользователя и прав
    if (isLoadingUser || isLoadingPermissions || !user) {
      return;
    }

    // Определяем первую доступную страницу
    const firstPage = getFirstAvailablePage(
      permissions,
      user.isSuperAdmin || false
    );

    if (firstPage) {
      navigate(firstPage, { replace: true });
    } else {
      // Если ничего не доступно, показываем информационную страницу
      console.warn(
        '[RedirectToFirstAvailable] Нет доступных страниц для пользователя'
      );
      setShowNoAccess(true);
    }
  }, [user, permissions, isLoadingUser, isLoadingPermissions, navigate]);

  // Пока загружаются данные, показываем загрузку
  if (isLoadingUser || isLoadingPermissions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
      </div>
    );
  }

  // Показываем страницу "Нет доступа", если у пользователя нет прав ни на одну страницу
  if (showNoAccess) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Card className="p-8 text-center max-w-md">
            <Icons.Lock size={48} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">
              Нет доступа к системе
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              У вас нет прав доступа ни к одному разделу системы.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Обратитесь к администратору для назначения необходимых прав.
            </p>
          </Card>
        </div>
      </Layout>
    );
  }

  return null;
};
