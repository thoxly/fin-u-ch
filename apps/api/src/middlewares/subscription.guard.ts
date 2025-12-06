import { Response, NextFunction } from 'express';
import { TenantRequest } from './tenant';
import { AppError } from './error';
import { SubscriptionPlan } from '@prisma/client';
import {
  getCompanyPlan,
  enforceFeatureAccess,
  isSubscriptionActive,
} from '../utils/subscription';
import logger from '../config/logger';

/**
 * Middleware для проверки доступа к фиче по тарифному плану
 * @param feature - Название фичи (например, 'planning', 'roles', 'integrations')
 * @param minPlan - Минимальный план для доступа (по умолчанию TEAM)
 * @returns Express middleware function
 */
export const requireFeature = (
  feature: string,
  minPlan: SubscriptionPlan = SubscriptionPlan.TEAM
) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      // Если это запрос от worker, пропускаем проверку подписки
      if (req.isWorker) {
        logger.debug('Worker request, skipping subscription check', {
          path: req.path,
          method: req.method,
        });
        return next();
      }

      if (!req.companyId) {
        throw new AppError('Company ID not found in request', 401);
      }

      logger.debug('Checking subscription feature access', {
        companyId: req.companyId,
        feature,
        minPlan,
        path: req.path,
        method: req.method,
      });

      // Проверяем, активна ли подписка
      const isActive = await isSubscriptionActive(req.companyId);
      if (!isActive) {
        logger.warn('Subscription is not active', {
          companyId: req.companyId,
          feature,
          path: req.path,
          method: req.method,
        });
        throw new AppError(
          'Your subscription is not active. Please renew your subscription to access this feature.',
          403
        );
      }

      // Получаем текущий план компании
      const currentPlan = await getCompanyPlan(req.companyId);

      logger.debug('Current subscription plan', {
        companyId: req.companyId,
        currentPlan,
        minPlan,
        feature,
      });

      // Проверяем минимальный требуемый план
      const planHierarchy: Record<SubscriptionPlan, number> = {
        START: 1,
        TEAM: 2,
        BUSINESS: 3,
      };

      if (planHierarchy[currentPlan] < planHierarchy[minPlan]) {
        logger.warn('Subscription plan insufficient', {
          companyId: req.companyId,
          currentPlan,
          requiredPlan: minPlan,
          feature,
          path: req.path,
          method: req.method,
        });
        throw new AppError(
          `This feature requires a ${minPlan} plan or higher. Your current plan is ${currentPlan}. Please upgrade your subscription.`,
          403
        );
      }

      // Проверяем доступ к конкретной фиче
      enforceFeatureAccess(currentPlan, feature);

      logger.debug('Subscription feature access granted', {
        companyId: req.companyId,
        currentPlan,
        feature,
      });

      next();
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn('Subscription feature access denied', {
          companyId: req.companyId,
          feature,
          error: error.message,
          statusCode: error.statusCode,
          path: req.path,
          method: req.method,
        });
      } else {
        logger.error('Subscription guard error', {
          companyId: req.companyId,
          feature,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          path: req.path,
          method: req.method,
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware для проверки конкретного плана (например, только BUSINESS)
 * @param requiredPlan - Требуемый план подписки
 * @returns Express middleware function
 */
export const requirePlan = (requiredPlan: SubscriptionPlan) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      // Если это запрос от worker, пропускаем проверку подписки
      if (req.isWorker) {
        logger.debug('Worker request, skipping subscription plan check', {
          path: req.path,
          method: req.method,
        });
        return next();
      }

      if (!req.companyId) {
        throw new AppError('Company ID not found in request', 401);
      }

      logger.debug('Checking subscription plan', {
        companyId: req.companyId,
        requiredPlan,
        path: req.path,
        method: req.method,
      });

      // Проверяем, активна ли подписка
      const isActive = await isSubscriptionActive(req.companyId);
      if (!isActive) {
        logger.warn('Subscription is not active', {
          companyId: req.companyId,
          requiredPlan,
          path: req.path,
          method: req.method,
        });
        throw new AppError(
          'Your subscription is not active. Please renew your subscription to access this feature.',
          403
        );
      }

      // Получаем текущий план компании
      const currentPlan = await getCompanyPlan(req.companyId);

      if (currentPlan !== requiredPlan) {
        logger.warn('Subscription plan mismatch', {
          companyId: req.companyId,
          currentPlan,
          requiredPlan,
          path: req.path,
          method: req.method,
        });
        throw new AppError(
          `This feature requires a ${requiredPlan} plan. Your current plan is ${currentPlan}. Please upgrade your subscription.`,
          403
        );
      }

      logger.debug('Subscription plan check passed', {
        companyId: req.companyId,
        currentPlan,
      });

      next();
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn('Subscription plan check failed', {
          companyId: req.companyId,
          requiredPlan,
          error: error.message,
          statusCode: error.statusCode,
          path: req.path,
          method: req.method,
        });
      } else {
        logger.error('Subscription plan guard error', {
          companyId: req.companyId,
          requiredPlan,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          path: req.path,
          method: req.method,
        });
      }
      next(error);
    }
  };
};
