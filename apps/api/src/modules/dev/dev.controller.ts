import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import devService from './dev.service';
import logger from '../../config/logger';
import { SubscriptionPlan } from '@prisma/client';

export class DevController {
  /**
   * POST /api/dev/set-subscription
   */
  async setSubscription(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      if (
        process.env.NODE_ENV !== 'development' &&
        process.env.ENABLE_DEV_TOOLS !== 'true'
      ) {
        logger.warn('Attempted to access dev tools in non-dev environment');
        res.status(403).json({ message: 'Dev tools are not available' });
        return;
      }

      logger.info('Dev tools: set subscription request', {
        companyId: req.companyId,
        body: req.body,
      });

      if (!req.companyId) {
        throw new Error('Company ID not found in request');
      }

      const { plan } = req.body;

      if (!plan || !Object.values(SubscriptionPlan).includes(plan)) {
        res.status(400).json({
          message: 'Invalid plan',
          allowed: Object.values(SubscriptionPlan),
        });
        return;
      }

      const result = await devService.setSubscription(
        req.companyId,
        plan as SubscriptionPlan
      );

      res.json(result);
    } catch (error) {
      logger.error('Failed to set subscription (dev)', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
}

export default new DevController();
