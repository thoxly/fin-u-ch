import type { PermissionsByEntity } from '../../store/api/usersApi';

/**
 * Определяет первую доступную страницу на основе прав пользователя
 * Приоритетный порядок: Dashboard → Operations → Reports → Catalogs → Admin
 *
 * @param permissions - Объект с правами пользователя
 * @param isSuperAdmin - Флаг супер-администратора
 * @returns Путь к первой доступной странице или null, если ничего не доступно
 */
export const getFirstAvailablePage = (
  permissions: PermissionsByEntity | null | undefined,
  isSuperAdmin: boolean
): string | null => {
  // Если пользователь супер-администратор, возвращаем dashboard
  if (isSuperAdmin) {
    return '/dashboard';
  }

  // Если права не загружены, возвращаем null
  if (!permissions) {
    return null;
  }

  // Приоритетный список страниц для проверки
  const pageRoutes = [
    { path: '/dashboard', entity: 'dashboard', action: 'read' },
    { path: '/operations', entity: 'operations', action: 'read' },
    { path: '/reports', entity: 'reports', action: 'read' },
    { path: '/budgets', entity: 'budgets', action: 'read' },
    { path: '/catalogs/articles', entity: 'articles', action: 'read' },
    { path: '/catalogs/accounts', entity: 'accounts', action: 'read' },
    { path: '/catalogs/departments', entity: 'departments', action: 'read' },
    {
      path: '/catalogs/counterparties',
      entity: 'counterparties',
      action: 'read',
    },
    { path: '/catalogs/deals', entity: 'deals', action: 'read' },
    { path: '/admin', entity: 'users', action: 'read' },
  ];

  // Проверяем каждую страницу по порядку приоритета
  for (const route of pageRoutes) {
    const entityPermissions = permissions[route.entity];
    if (entityPermissions && entityPermissions.includes(route.action)) {
      return route.path;
    }
  }

  // Если ничего не доступно, возвращаем null
  return null;
};
