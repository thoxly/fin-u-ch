import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import prisma from '../config/db';
import { getPlanLimits, hasFeature, PlanLimits } from '../config/plan-limits';
import { AppError } from '../middlewares/error';

/**
 * Получает лимиты для указанного плана
 */
export function getPlanLimitsUtil(plan: SubscriptionPlan): PlanLimits {
  return getPlanLimits(plan);
}

/**
 * Проверяет, доступна ли фича для указанного плана
 */
export function hasFeatureUtil(
  plan: SubscriptionPlan,
  feature: string
): boolean {
  return hasFeature(plan, feature);
}

/**
 * Проверяет лимит пользователей для компании
 * @param companyId ID компании
 * @param plan Текущий план подписки
 * @returns true если лимит не превышен, false если превышен
 */
export async function checkUserLimit(
  companyId: string,
  plan: SubscriptionPlan
): Promise<boolean> {
  const limits = getPlanLimits(plan);

  // Если лимит Infinity, проверка не нужна
  if (limits.maxUsers === Infinity) {
    return true;
  }

  // Подсчитываем активных пользователей компании
  const userCount = await prisma.user.count({
    where: {
      companyId,
      isActive: true,
    },
  });

  return userCount < limits.maxUsers;
}

/**
 * Проверяет лимит пользователей и выбрасывает ошибку, если лимит превышен
 * @param companyId ID компании
 * @param plan Текущий план подписки
 * @throws AppError если лимит пользователей превышен
 */
export async function enforceUserLimit(
  companyId: string,
  plan: SubscriptionPlan
): Promise<void> {
  const limits = getPlanLimits(plan);

  // Если лимит Infinity, проверка не нужна
  if (limits.maxUsers === Infinity) {
    return;
  }

  const userCount = await prisma.user.count({
    where: {
      companyId,
      isActive: true,
    },
  });

  if (userCount >= limits.maxUsers) {
    throw new AppError(
      `User limit reached for current plan. Maximum ${limits.maxUsers} user(s) allowed. Please upgrade your plan to add more users.`,
      403
    );
  }
}

/**
 * Получает текущее количество пользователей компании
 */
export async function getCurrentUserCount(companyId: string): Promise<number> {
  return await prisma.user.count({
    where: {
      companyId,
      isActive: true,
    },
  });
}

/**
 * Получает информацию о лимитах пользователей для компании
 */
export async function getUserLimitInfo(
  companyId: string,
  plan: SubscriptionPlan
): Promise<{
  current: number;
  max: number;
  remaining: number;
  isUnlimited: boolean;
}> {
  const limits = getPlanLimits(plan);
  const current = await getCurrentUserCount(companyId);

  return {
    current,
    max: limits.maxUsers,
    remaining:
      limits.maxUsers === Infinity ? Infinity : limits.maxUsers - current,
    isUnlimited: limits.maxUsers === Infinity,
  };
}

/**
 * Проверяет доступ к фиче и выбрасывает ошибку, если доступ запрещен
 * @param plan Текущий план подписки
 * @param feature Название фичи
 * @throws AppError если фича недоступна для плана
 */
export function enforceFeatureAccess(
  plan: SubscriptionPlan,
  feature: string
): void {
  if (!hasFeature(plan, feature)) {
    const planName = plan.toLowerCase();
    throw new AppError(
      `Feature "${feature}" is not available on the ${planName} plan. Please upgrade your subscription to access this feature.`,
      403
    );
  }
}

/**
 * Получает план подписки компании
 */
export async function getCompanyPlan(
  companyId: string
): Promise<SubscriptionPlan> {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    select: { plan: true },
  });

  // Если подписка не найдена, возвращаем START (бесплатный план по умолчанию)
  return subscription?.plan || SubscriptionPlan.START;
}

/**
 * Проверяет, активна ли подписка компании
 */
export async function isSubscriptionActive(
  companyId: string
): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    select: { status: true, endDate: true },
  });

  if (!subscription) {
    // Если подписки нет, считаем что она активна (бесплатный план)
    return true;
  }

  // Проверяем статус
  if (subscription.status === SubscriptionStatus.CANCELED) {
    return false;
  }

  // Проверяем дату окончания
  if (subscription.endDate && subscription.endDate < new Date()) {
    return false;
  }

  return true;
}
