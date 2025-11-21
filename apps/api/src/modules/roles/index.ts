/**
 * Permission System - Централизованный экспорт
 *
 * Этот модуль предоставляет гранулярную систему прав доступа с автоматическим
 * резолвингом иерархии и зависимостей между сущностями.
 */

// Основной сервис для проверки прав
export { default as permissionsService } from './permissions.service';

// Конфигурация сущностей
export {
  ENTITIES_CONFIG,
  ENTITY_NAMES,
  ENTITIES_BY_CATEGORY,
  getEntityConfig,
  isValidEntity,
  isValidAction,
} from './config/entities.config';

// Иерархия действий
export {
  ACTION_HIERARCHY,
  includesAction,
  getImpliedActions,
  minimizeActions,
} from './config/action-hierarchy';

// Policy для проверки прав
export { PermissionPolicy } from './policy/permission-policy';

// TypeScript типы
export type {
  Action,
  EntityConfig,
  PermissionCheck,
  PermissionCheckResult,
} from './types';
