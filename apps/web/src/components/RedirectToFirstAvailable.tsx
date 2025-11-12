import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetMeQuery } from '../store/api/authApi';
import { useGetUserPermissionsQuery } from '../store/api/usersApi';
import { getFirstAvailablePage } from '../shared/lib/getFirstAvailablePage';

/**
 * Компонент для автоматического редиректа на первую доступную страницу
 * Используется после успешного логина
 */
export const RedirectToFirstAvailable = () => {
  const navigate = useNavigate();
  const { data: user, isLoading: isLoadingUser } = useGetMeQuery();
  const { data: permissions, isLoading: isLoadingPermissions } =
    useGetUserPermissionsQuery(user?.id || '', { skip: !user?.id });

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
      // Можно редиректить на специальную страницу или оставить на текущей
      console.warn(
        '[RedirectToFirstAvailable] Нет доступных страниц для пользователя'
      );
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

  return null;
};
