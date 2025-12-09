import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { SubscriptionPlan, SubscriptionStatus, Prisma } from '@prisma/client';
import {
  getPlanLimitsUtil,
  getUserLimitInfo,
  getCompanyPlan,
} from '../../utils/subscription';
import logger from '../../config/logger';

export interface CurrentSubscriptionResponse {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  trialEndsAt: Date | null;
  promoCode: string | null;
  limits: {
    maxUsers: number;
    features: string[];
  };
  userLimit: {
    current: number;
    max: number;
    remaining: number;
    isUnlimited: boolean;
  };
}

export interface PromoCodeActivationResult {
  subscription: {
    id: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    startDate: Date;
    endDate: Date | null;
    trialEndsAt: Date | null;
    promoCode: string | null;
  };
  promoCode: {
    code: string;
    plan: SubscriptionPlan;
    usedCount: number;
  };
}

export class SubscriptionService {
  /**
   * Получает текущую подписку компании с лимитами
   */
  async getCurrentSubscription(
    companyId: string
  ): Promise<CurrentSubscriptionResponse> {
    logger.debug('Getting current subscription', { companyId });

    // Получаем подписку или создаем дефолтную START
    let subscription = await prisma.subscription.findUnique({
      where: { companyId },
    });

    // Если подписки нет, создаем дефолтную START
    if (!subscription) {
      logger.info(
        'No subscription found, creating default START subscription',
        {
          companyId,
        }
      );
      subscription = await this.createSubscription(
        companyId,
        SubscriptionPlan.START
      );
    }

    const plan = subscription.plan;
    const limits = getPlanLimitsUtil(plan);
    const userLimit = await getUserLimitInfo(companyId, plan);

    return {
      plan: subscription.plan,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      trialEndsAt: subscription.trialEndsAt,
      promoCode: subscription.promoCode,
      limits: {
        maxUsers: limits.maxUsers,
        features: limits.features,
      },
      userLimit,
    };
  }

  /**
   * Активирует промокод для компании
   */
  async activatePromoCode(
    companyId: string,
    promoCode: string
  ): Promise<PromoCodeActivationResult> {
    logger.info('Activating promo code', { companyId, promoCode });

    // Находим промокод
    const promo = await prisma.promoCode.findUnique({
      where: { code: promoCode.toUpperCase() },
    });

    if (!promo) {
      throw new AppError('Promo code not found', 404);
    }

    if (!promo.isActive) {
      throw new AppError('Promo code is not active', 400);
    }

    // Проверяем срок действия
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new AppError('Promo code has expired', 400);
    }

    // Проверяем лимит использования
    if (promo.maxUsages !== null && promo.usedCount >= promo.maxUsages) {
      throw new AppError('Promo code usage limit reached', 400);
    }

    // Вычисляем дату окончания подписки
    let endDate: Date | null = null;
    if (promo.durationDays) {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + promo.durationDays);
    }

    // Обновляем или создаем подписку в транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Обновляем счетчик использования промокода
      const updatedPromo = await tx.promoCode.update({
        where: { id: promo.id },
        data: {
          usedCount: { increment: 1 },
        },
      });

      // Обновляем или создаем подписку
      const subscription = await tx.subscription.upsert({
        where: { companyId },
        create: {
          companyId,
          plan: promo.plan,
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(),
          endDate,
          promoCode: promo.code,
        },
        update: {
          plan: promo.plan,
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(),
          endDate,
          promoCode: promo.code,
        },
      });

      return { subscription, promoCode: updatedPromo };
    });

    logger.info('Promo code activated successfully', {
      companyId,
      promoCode,
      plan: result.subscription.plan,
    });

    return {
      subscription: {
        id: result.subscription.id,
        plan: result.subscription.plan,
        status: result.subscription.status,
        startDate: result.subscription.startDate,
        endDate: result.subscription.endDate,
        trialEndsAt: result.subscription.trialEndsAt,
        promoCode: result.subscription.promoCode,
      },
      promoCode: {
        code: result.promoCode.code,
        plan: result.promoCode.plan,
        usedCount: result.promoCode.usedCount,
      },
    };
  }

  /**
   * Создает подписку для компании
   */
  async createSubscription(
    companyId: string,
    plan: SubscriptionPlan,
    promoCode?: string
  ): Promise<Prisma.SubscriptionGetPayload<Record<string, never>>> {
    logger.debug('Creating subscription', { companyId, plan, promoCode });

    // Проверяем, существует ли уже подписка
    const existing = await prisma.subscription.findUnique({
      where: { companyId },
    });

    if (existing) {
      logger.warn('Subscription already exists, updating', {
        companyId,
        existingPlan: existing.plan,
        newPlan: plan,
      });
      return await prisma.subscription.update({
        where: { companyId },
        data: {
          plan,
          status: SubscriptionStatus.ACTIVE,
          promoCode: promoCode || existing.promoCode,
        },
      });
    }

    return await prisma.subscription.create({
      data: {
        companyId,
        plan,
        status: SubscriptionStatus.ACTIVE,
        promoCode: promoCode || null,
      },
    });
  }

  /**
   * Проверяет и применяет лимиты для компании
   * Используется для валидации текущего состояния подписки
   */
  async checkAndEnforceLimits(companyId: string): Promise<void> {
    logger.debug('Checking and enforcing limits', { companyId });

    const plan = await getCompanyPlan(companyId);
    // const limits = getPlanLimitsUtil(plan);
    const userLimit = await getUserLimitInfo(companyId, plan);

    // Проверяем лимит пользователей
    if (!userLimit.isUnlimited && userLimit.current > userLimit.max) {
      logger.warn('User limit exceeded', {
        companyId,
        plan,
        current: userLimit.current,
        max: userLimit.max,
      });
      throw new AppError(
        `User limit exceeded. Current: ${userLimit.current}, Maximum: ${userLimit.max}. Please upgrade your plan or remove some users.`,
        403
      );
    }

    logger.debug('Limits check passed', {
      companyId,
      plan,
      userLimit,
    });
  }
}

export default new SubscriptionService();
