import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface ProtectedActionProps {
  /**
   * Сущность для проверки прав (например, 'operations', 'articles', 'users')
   */
  entity: string;
  /**
   * Действие для проверки прав (например, 'create', 'read', 'update', 'delete')
   */
  action: string;
  /**
   * Содержимое, которое отображается, если есть право
   */
  children: React.ReactNode;
  /**
   * Альтернативное содержимое, которое отображается, если права нет
   * Если не указано, ничего не отображается
   */
  fallback?: React.ReactNode;
  /**
   * Если true, показывает disabled версию children вместо fallback
   */
  showDisabled?: boolean;
}

/**
 * Компонент для условного рендеринга на основе прав пользователя
 *
 * @example
 * // Скрыть кнопку, если нет прав
 * <ProtectedAction entity="operations" action="create">
 *   <Button onClick={handleCreate}>Создать операцию</Button>
 * </ProtectedAction>
 *
 * @example
 * // Показать disabled кнопку, если нет прав
 * <ProtectedAction entity="operations" action="edit" showDisabled>
 *   <Button onClick={handleEdit}>Редактировать</Button>
 * </ProtectedAction>
 *
 * @example
 * // Показать fallback, если нет прав
 * <ProtectedAction
 *   entity="operations"
 *   action="delete"
 *   fallback={<Button disabled>Удалить</Button>}
 * >
 *   <Button onClick={handleDelete}>Удалить</Button>
 * </ProtectedAction>
 */
export const ProtectedAction: React.FC<ProtectedActionProps> = ({
  entity,
  action,
  children,
  fallback = null,
  showDisabled = false,
}) => {
  const { hasPermission, isLoading } = usePermissions();

  // Пока загружаются права, ничего не показываем (или можно показать fallback)
  if (isLoading) {
    return <>{fallback}</>;
  }

  const hasAccess = hasPermission(entity, action);

  if (!hasAccess) {
    if (showDisabled && React.isValidElement(children)) {
      // Клонируем children и добавляем disabled
      return React.cloneElement(children as React.ReactElement, {
        disabled: true,
      });
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
