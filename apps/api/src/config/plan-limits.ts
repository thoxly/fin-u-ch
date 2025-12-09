import { SubscriptionPlan } from '@prisma/client';

/**
 * Конфигурация лимитов и доступных фич для каждого тарифного плана
 */
export interface PlanLimits {
  maxUsers: number;
  features: string[];
}

/**
 * Лимиты и фичи для каждого тарифного плана
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  START: {
    maxUsers: 1,
    features: [
      'operations', // Базовые операции
      'dictionaries', // Справочники (статьи, счета, контрагенты, сделки, отделы)
      'dashboard', // Дашборд
      'export', // Экспорт данных
      // НЕТ: planning, roles, reports_odds, recurring, mapping_rules, integrations
    ],
  },
  TEAM: {
    maxUsers: 5,
    features: [
      'operations', // Базовые операции
      'dictionaries', // Справочники
      'dashboard', // Дашборд
      'export', // Экспорт данных
      'planning', // Планирование (БДДС, план-факт)
      'roles', // Роли (предустановленные + кастомные)
      'reports_odds', // Отчеты ОДДС
      'recurring', // Повторяющиеся операции
      'mapping_rules', // Правила маппинга для импорта
      // НЕТ: integrations, api_access
    ],
  },
  BUSINESS: {
    maxUsers: Infinity,
    features: [
      'all', // Все базовые фичи
      'api_access', // Доступ к API
      'integrations', // Интеграции (Ozon и другие)
      // Включает все фичи из TEAM + дополнительные
    ],
  },
};

/**
 * Проверяет, доступна ли фича для указанного плана
 */
export function hasFeature(plan: SubscriptionPlan, feature: string): boolean {
  const limits = PLAN_LIMITS[plan];

  // BUSINESS план имеет доступ ко всем фичам
  if (limits.features.includes('all')) {
    return true;
  }

  return limits.features.includes(feature);
}

/**
 * Получает лимиты для указанного плана
 */
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * Проверяет, является ли план платным (не бесплатным)
 */
export function isPaidPlan(plan: SubscriptionPlan): boolean {
  return plan !== SubscriptionPlan.START;
}

/**
 * Проверяет, доступно ли планирование для плана
 */
export function hasPlanningAccess(plan: SubscriptionPlan): boolean {
  return hasFeature(plan, 'planning');
}

/**
 * Проверяет, доступны ли роли для плана
 */
export function hasRolesAccess(plan: SubscriptionPlan): boolean {
  return hasFeature(plan, 'roles');
}

/**
 * Проверяет, доступны ли повторяющиеся операции для плана
 */
export function hasRecurringAccess(plan: SubscriptionPlan): boolean {
  return hasFeature(plan, 'recurring');
}

/**
 * Проверяет, доступны ли правила маппинга для плана
 */
export function hasMappingRulesAccess(plan: SubscriptionPlan): boolean {
  return hasFeature(plan, 'mapping_rules');
}

/**
 * Проверяет, доступны ли интеграции для плана
 */
export function hasIntegrationsAccess(plan: SubscriptionPlan): boolean {
  return hasFeature(plan, 'integrations');
}

/**
 * Проверяет, доступен ли API для плана
 */
export function hasApiAccess(plan: SubscriptionPlan): boolean {
  return hasFeature(plan, 'api_access');
}
