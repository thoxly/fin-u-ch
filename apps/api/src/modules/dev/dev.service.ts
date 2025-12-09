import prisma from '../../config/db';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import logger from '../../config/logger';

export class DevService {
  /**
   * Sets the subscription plan for a company (Dev only)
   */
  async setSubscription(
    companyId: string,
    plan: SubscriptionPlan
  ): Promise<{
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    startDate: Date;
    endDate: Date | null;
  }> {
    logger.info('[DEV] Force setting subscription plan', {
      companyId,
      plan,
    });

    // Upsert subscription
    const subscription = await prisma.subscription.upsert({
      where: { companyId },
      create: {
        companyId,
        plan,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: null, // Perpetual for dev
      },
      update: {
        plan,
        status: SubscriptionStatus.ACTIVE,
        // Reset dates to look "fresh"
        startDate: new Date(),
        endDate: null,
      },
    });

    return subscription;
  }
}

export default new DevService();
