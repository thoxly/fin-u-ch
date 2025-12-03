import { EntityConfig } from '../types';

/**
 * Конфигурация всех сущностей системы.
 *
 * При добавлении новой сущности:
 * 1. Добавьте её в этот файл
 * 2. Обновите seed-initial-data.ts (он автоматически использует этот конфиг)
 * 3. TypeScript подскажет, если забудете что-то обновить
 *
 * Каждая сущность содержит:
 * - name: системное имя
 * - displayName: название для UI
 * - category: для группировки в интерфейсе
 * - actions: список доступных действий
 * - description: описание для документации
 * - requiresReadAccess: зависимости (какие сущности нужны для работы)
 */
export const ENTITIES_CONFIG: Record<string, EntityConfig> = {
  // ========== ОСНОВНЫЕ МОДУЛИ ==========
  dashboard: {
    name: 'dashboard',
    displayName: 'Дашборд',
    category: 'Основные',
    actions: ['read'],
    description: 'Главная страница с обзором финансовых показателей',
  },

  operations: {
    name: 'operations',
    displayName: 'Операции',
    category: 'Основные',
    actions: ['create', 'read', 'update', 'delete', 'confirm', 'cancel'],
    description: 'Финансовые операции (доходы, расходы, переводы)',
    // Для создания/редактирования операций нужен доступ к справочникам
    requiresReadAccess: [
      'articles',
      'accounts',
      'counterparties',
      'departments',
      'deals',
    ],
  },

  budgets: {
    name: 'budgets',
    displayName: 'Бюджеты',
    category: 'Основные',
    actions: ['create', 'read', 'update', 'delete'],
    description: 'Планирование и контроль бюджетов',
    // Для работы с бюджетами нужны статьи и подразделения
    requiresReadAccess: ['articles', 'departments'],
  },

  reports: {
    name: 'reports',
    displayName: 'Отчеты',
    category: 'Основные',
    actions: ['read', 'export'],
    description: 'Аналитические отчеты и отчет о движении денежных средств',
  },

  // ========== СПРАВОЧНИКИ ==========
  articles: {
    name: 'articles',
    displayName: 'Статьи',
    category: 'Справочники',
    actions: ['create', 'read', 'update', 'delete'],
    description: 'Статьи доходов и расходов',
    // Для создания/редактирования статей нужен доступ к контрагентам
    requiresReadAccess: ['counterparties'],
  },

  accounts: {
    name: 'accounts',
    displayName: 'Счета',
    category: 'Справочники',
    actions: ['create', 'read', 'update', 'delete'],
    description: 'Банковские счета и кассы',
  },

  departments: {
    name: 'departments',
    displayName: 'Подразделения',
    category: 'Справочники',
    actions: ['create', 'read', 'update', 'delete'],
    description: 'Организационные подразделения компании',
  },

  counterparties: {
    name: 'counterparties',
    displayName: 'Контрагенты',
    category: 'Справочники',
    actions: ['create', 'read', 'update', 'delete'],
    description: 'Клиенты, поставщики и партнеры',
  },

  deals: {
    name: 'deals',
    displayName: 'Сделки',
    category: 'Справочники',
    actions: ['create', 'read', 'update', 'delete'],
    description: 'Сделки с контрагентами',
    // Для работы со сделками нужны контрагенты и подразделения
    requiresReadAccess: ['counterparties', 'departments'],
  },

  salaries: {
    name: 'salaries',
    displayName: 'Зарплаты',
    category: 'Справочники',
    actions: ['create', 'read', 'update', 'delete'],
    description: 'Шаблоны зарплат сотрудников',
  },

  // ========== АДМИНИСТРИРОВАНИЕ ==========
  users: {
    name: 'users',
    displayName: 'Пользователи',
    category: 'Администрирование',
    actions: ['create', 'read', 'update', 'delete', 'manage_roles'],
    description: 'Управление пользователями и их ролями',
  },

  audit: {
    name: 'audit',
    displayName: 'Аудит',
    category: 'Администрирование',
    actions: ['read'],
    description: 'Журнал действий пользователей системы',
  },
} as const;

/**
 * Список всех имен сущностей (для использования в коде)
 */
export const ENTITY_NAMES = Object.keys(ENTITIES_CONFIG);

/**
 * Сущности, сгруппированные по категориям (для UI)
 */
export const ENTITIES_BY_CATEGORY = Object.values(ENTITIES_CONFIG).reduce(
  (acc, entity) => {
    if (!acc[entity.category]) {
      acc[entity.category] = [];
    }
    acc[entity.category].push(entity);
    return acc;
  },
  {} as Record<string, EntityConfig[]>
);

/**
 * Получить конфигурацию сущности по имени
 */
export function getEntityConfig(entityName: string): EntityConfig | undefined {
  return ENTITIES_CONFIG[entityName];
}

/**
 * Проверить, существует ли сущность
 */
export function isValidEntity(entityName: string): boolean {
  return entityName in ENTITIES_CONFIG;
}

/**
 * Проверить, является ли действие валидным для сущности
 */
export function isValidAction(entityName: string, action: string): boolean {
  const entity = ENTITIES_CONFIG[entityName];
  if (!entity) return false;
  return entity.actions.includes(action as any);
}
