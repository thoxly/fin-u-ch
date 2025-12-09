import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import subscriptionService from './subscription.service';
import logger from '../../config/logger';
import auditLogService from '../audit/audit.service';

export class SubscriptionController {
  /**
   * GET /api/subscription/current
   * Получает текущий план подписки и лимиты
   */
  async getCurrent(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get current subscription request', {
        companyId: req.companyId,
        userId: req.userId,
      });

      if (!req.companyId) {
        throw new Error('Company ID not found in request');
      }

      const result = await subscriptionService.getCurrentSubscription(
        req.companyId
      );

      logger.debug('Current subscription retrieved successfully', {
        companyId: req.companyId,
        plan: result.plan,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get current subscription', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  /**
   * POST /api/subscription/activate-promo
   * Активирует промокод для компании
   */
  async activatePromo(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Activate promo code request', {
        companyId: req.companyId,
        userId: req.userId,
        promoCode: req.body.promoCode,
      });

      if (!req.companyId) {
        throw new Error('Company ID not found in request');
      }

      const { promoCode } = req.body;

      if (!promoCode || typeof promoCode !== 'string') {
        throw new Error('Promo code is required');
      }

      const result = await subscriptionService.activatePromoCode(
        req.companyId,
        promoCode
      );

      logger.info('Promo code activated successfully', {
        companyId: req.companyId,
        promoCode,
        newPlan: result.subscription.plan,
      });

      // Audit log: promo activation / subscription update
      try {
        await auditLogService.logAction({
          userId: req.userId || 'system',
          companyId: req.companyId!,
          action: 'update',
          entity: 'subscription',
          entityId: result.subscription.id,
          changes: { new: result.subscription },
          metadata: { promoCode },
        });
      } catch (err) {
        logger.warn('Failed to write audit log for promo activation', {
          companyId: req.companyId,
          promoCode,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      res.status(200).json(result);
    } catch (error) {
      logger.error('Failed to activate promo code', {
        companyId: req.companyId,
        promoCode: req.body.promoCode,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
}

export default new SubscriptionController();
