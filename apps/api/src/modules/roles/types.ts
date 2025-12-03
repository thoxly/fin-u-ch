/**
 * Типы для системы прав доступа
 * Этот файл содержит все TypeScript типы, используемые в permission system
 */

/**
 * Все возможные действия в системе
 */
export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'confirm'
  | 'cancel'
  | 'export'
  | 'manage_roles';

/**
 * Конфигурация сущности
 */
export interface EntityConfig {
  /** Системное имя сущности (используется в коде) */
  name: string;
  /** Отображаемое название для UI */
  displayName: string;
  /** Категория для группировки в UI */
  category: string;
  /** Доступные действия для этой сущности */
  actions: Action[];
  /** Описание сущности */
  description: string;
  /**
   * Сущности, доступ на чтение которых требуется для работы с этой сущностью
   * Например, для создания операции нужно читать статьи, счета и т.д.
   */
  requiresReadAccess?: string[];
}

/**
 * Параметры для проверки права
 */
export interface PermissionCheck {
  entity: string;
  action: string;
  userId: string;
  companyId: string;
}

/**
 * Результат проверки права
 */
export interface PermissionCheckResult {
  /** Разрешено ли действие */
  allowed: boolean;
  /** Причина разрешения/запрета (для логирования и отладки) */
  reason?: string;
  /** Как было получено право */
  grantedBy?: 'direct' | 'hierarchy' | 'dependency';
}
