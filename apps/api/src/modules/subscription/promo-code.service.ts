import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import logger from '../../config/logger';

export interface PromoCodeValidationResult {
  isValid: boolean;
  promoCode?: {
    id: string;
    code: string;
    plan: SubscriptionPlan;
    durationDays: number | null;
    maxUsages: number | null;
    usedCount: number;
    isActive: boolean;
    expiresAt: Date | null;
  };
  error?: string;
}

export class PromoCodeService {
  /**
   * Валидирует промокод
   */
  async validatePromoCode(code: string): Promise<PromoCodeValidationResult> {
    logger.debug('Validating promo code', { code });

    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promoCode) {
      return {
        isValid: false,
        error: 'Promo code not found',
      };
    }

    if (!promoCode.isActive) {
      return {
        isValid: false,
        error: 'Promo code is not active',
      };
    }

    // Проверяем срок действия
    if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
      return {
        isValid: false,
        error: 'Promo code has expired',
      };
    }

    // Проверяем лимит использования
    if (
      promoCode.maxUsages !== null &&
      promoCode.usedCount >= promoCode.maxUsages
    ) {
      return {
        isValid: false,
        error: 'Promo code usage limit reached',
      };
    }

    return {
      isValid: true,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        plan: promoCode.plan,
        durationDays: promoCode.durationDays,
        maxUsages: promoCode.maxUsages,
        usedCount: promoCode.usedCount,
        isActive: promoCode.isActive,
        expiresAt: promoCode.expiresAt,
      },
    };
  }

  /**
   * Применяет промокод к компании
   * Используется при регистрации или активации промокода
   */
  async applyPromoCode(
    companyId: string,
    code: string
  ): Promise<{
    subscription: {
      id: string;
      plan: SubscriptionPlan;
      status: string;
      promoCode: string | null;
    };
    promoCode: {
      code: string;
      plan: SubscriptionPlan;
    };
  }> {
    logger.info('Applying promo code', { companyId, code });

    // Валидируем промокод
    const validation = await this.validatePromoCode(code);
    if (!validation.isValid || !validation.promoCode) {
      throw new AppError(
        validation.error || 'Invalid promo code',
        validation.error === 'Promo code not found' ? 404 : 400
      );
    }

    const promo = validation.promoCode;

    // Вычисляем дату окончания подписки
    let endDate: Date | null = null;
    if (promo.durationDays) {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + promo.durationDays);
    }

    // Применяем промокод в транзакции
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

    logger.info('Promo code applied successfully', {
      companyId,
      code,
      plan: result.subscription.plan,
    });

    return {
      subscription: {
        id: result.subscription.id,
        plan: result.subscription.plan,
        status: result.subscription.status,
        promoCode: result.subscription.promoCode,
      },
      promoCode: {
        code: result.promoCode.code,
        plan: result.promoCode.plan,
      },
    };
  }

  /**
   * Генерирует промокод для Beta-доступа
   * @param plan - План подписки для промокода (обычно TEAM или BUSINESS)
   * @param durationDays - Длительность подписки в днях (null = вечно)
   * @param maxUsages - Максимальное количество использований (null = безлимит)
   * @returns Сгенерированный промокод
   */
  async generateBetaPromoCode(
    plan: SubscriptionPlan = SubscriptionPlan.TEAM,
    durationDays: number | null = null,
    maxUsages: number | null = null
  ): Promise<{
    code: string;
    plan: SubscriptionPlan;
    durationDays: number | null;
    maxUsages: number | null;
  }> {
    logger.info('Generating Beta promo code', {
      plan,
      durationDays,
      maxUsages,
    });

    // Генерируем уникальный код
    const year = new Date().getFullYear();
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const code = `BETA-${year}-${randomSuffix}`;

    // Проверяем уникальность (на случай коллизии)
    const existing = await prisma.promoCode.findUnique({
      where: { code },
    });

    if (existing) {
      // Если код уже существует, генерируем новый
      return this.generateBetaPromoCode(plan, durationDays, maxUsages);
    }

    // Создаем промокод
    const promoCode = await prisma.promoCode.create({
      data: {
        code,
        plan,
        durationDays,
        maxUsages,
        isActive: true,
      },
    });

    logger.info('Beta promo code generated successfully', {
      code: promoCode.code,
      plan: promoCode.plan,
    });

    return {
      code: promoCode.code,
      plan: promoCode.plan,
      durationDays: promoCode.durationDays,
      maxUsages: promoCode.maxUsages,
    };
  }

  /**
   * Создает промокод вручную (для администрирования)
   */
  async createPromoCode(data: {
    code: string;
    plan: SubscriptionPlan;
    durationDays?: number | null;
    maxUsages?: number | null;
    expiresAt?: Date | null;
  }): Promise<{
    id: string;
    code: string;
    plan: SubscriptionPlan;
    durationDays: number | null;
    maxUsages: number | null;
    usedCount: number;
    isActive: boolean;
    expiresAt: Date | null;
  }> {
    logger.info('Creating promo code', { code: data.code, plan: data.plan });

    // Проверяем уникальность кода
    const existing = await prisma.promoCode.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existing) {
      throw new AppError('Promo code already exists', 409);
    }

    const promoCode = await prisma.promoCode.create({
      data: {
        code: data.code.toUpperCase(),
        plan: data.plan,
        durationDays: data.durationDays ?? null,
        maxUsages: data.maxUsages ?? null,
        isActive: true,
        expiresAt: data.expiresAt ?? null,
      },
    });

    logger.info('Promo code created successfully', {
      id: promoCode.id,
      code: promoCode.code,
    });

    return {
      id: promoCode.id,
      code: promoCode.code,
      plan: promoCode.plan,
      durationDays: promoCode.durationDays,
      maxUsages: promoCode.maxUsages,
      usedCount: promoCode.usedCount,
      isActive: promoCode.isActive,
      expiresAt: promoCode.expiresAt,
    };
  }

  /**
   * Генерирует персональный промокод для новозарегистрированного пользователя
   * Формат: USER-{UUID первые 8 символов}-{текущая дата в формате YYYYMMDD}
   * По умолчанию: дает доступ к TEAM на 14 дней, одноразовый
   */
  async generatePersonalPromoCode(userId: string): Promise<string> {
    logger.info('Generating personal promo code', { userId });

    // Генерируем уникальный код
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = userId.slice(0, 8).toUpperCase();
    const code = `USER-${randomPart}-${timestamp}`;

    try {
      // Проверяем, не существует ли уже такой код
      const existing = await prisma.promoCode.findUnique({
        where: { code },
      });

      if (existing) {
        // Если код существует, добавляем случайный суффикс
        const randomSuffix = Math.random()
          .toString(36)
          .substring(7)
          .toUpperCase();
        return await this.generatePersonalPromoCode(userId + randomSuffix);
      }

      // Создаем промокод (доступ к TEAM на 14 дней, одноразовый)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Промокод действует 30 дней

      const promoCode = await prisma.promoCode.create({
        data: {
          code,
          plan: SubscriptionPlan.TEAM,
          durationDays: 14, // Пробный период 14 дней на TEAM
          maxUsages: 1, // Одноразовый
          isActive: true,
          expiresAt,
        },
      });

      logger.info('Personal promo code generated successfully', {
        userId,
        code: promoCode.code,
        expiresAt,
      });

      return code;
    } catch (error) {
      logger.error('Failed to generate personal promo code', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError('Failed to generate promo code', 500);
    }
  }
}

export default new PromoCodeService();
