import { useMemo } from 'react';
import { useGetMeQuery } from '../../store/api/authApi';
import { useGetUserPermissionsQuery } from '../../store/api/usersApi';
import type { PermissionsByEntity } from '../../store/api/usersApi';

/**
 * Хук для проверки прав пользователя
 *
 * @example
 * const { hasPermission, canCreate, canEdit, canDelete } = usePermissions();
 *
 * if (canCreate('operations')) {
 *   // Показать кнопку создания операции
 * }
 */
export const usePermissions = () => {
  const { data: user } = useGetMeQuery();
  const { data: permissions, isLoading } = useGetUserPermissionsQuery(
    user?.id || '',
    { skip: !user?.id }
  );

  // Если пользователь супер-администратор, возвращаем все права
  const isSuperAdmin = user?.isSuperAdmin || false;

  // Мемоизируем права для оптимизации
  const permissionsMap = useMemo<PermissionsByEntity>(() => {
    if (isSuperAdmin) {
      // Для супер-админа возвращаем все возможные права
      // Синхронизировано с ENTITIES_CONFIG на бэкенде
      const allEntities = [
        'dashboard', // Добавлено: сущность дашборда
        'articles',
        'accounts',
        'departments',
        'counterparties',
        'deals',
        'operations',
        'budgets',
        'reports',
        'users',
        'audit',
      ];
      const allActions = [
        'create',
        'read',
        'update',
        'delete',
        'confirm',
        'cancel',
        'export',
        'manage_roles',
      ];

      const superAdminPermissions: PermissionsByEntity = {};
      for (const entity of allEntities) {
        superAdminPermissions[entity] = allActions;
      }
      return superAdminPermissions;
    }

    return permissions || {};
  }, [isSuperAdmin, permissions]);

  /**
   * Проверка наличия права на конкретное действие
   * @param entity - Сущность (например, 'operations', 'articles')
   * @param action - Действие (например, 'create', 'read', 'update', 'delete')
   * @returns true, если право есть, false - если нет
   */
  const hasPermission = (entity: string, action: string): boolean => {
    // Если пользователь еще не загружен, возвращаем false
    // (ProtectedRoute будет показывать загрузку)
    if (!user) {
      return false;
    }

    // Если загружаются права, но пользователь уже есть, проверяем isSuperAdmin
    if (isLoading) {
      // Если пользователь супер-админ, возвращаем true сразу
      if (isSuperAdmin) {
        return true;
      }
      // Иначе ждем загрузки прав
      return false;
    }

    // Если пользователь супер-администратор, возвращаем все права
    if (isSuperAdmin) {
      return true;
    }

    const entityPermissions = permissionsMap[entity];
    if (!entityPermissions) {
      return false;
    }

    return entityPermissions.includes(action);
  };

  // Вспомогательные методы для типичных действий
  const canCreate = (entity: string) => hasPermission(entity, 'create');
  const canRead = (entity: string) => hasPermission(entity, 'read');
  const canUpdate = (entity: string) => hasPermission(entity, 'update');
  const canDelete = (entity: string) => hasPermission(entity, 'delete');
  const canConfirm = (entity: string) => hasPermission(entity, 'confirm');
  const canCancel = (entity: string) => hasPermission(entity, 'cancel');
  const canExport = (entity: string) => hasPermission(entity, 'export');
  const canManageRoles = () => hasPermission('users', 'manage_roles');

  return {
    // Основной метод проверки
    hasPermission,
    // Вспомогательные методы
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canConfirm,
    canCancel,
    canExport,
    canManageRoles,
    // Состояние
    isLoading,
    isSuperAdmin,
    // Полные права (для отладки)
    permissions: permissionsMap,
  };
};
