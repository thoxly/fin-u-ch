import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import subscriptionController from './subscription.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /api/subscription/current:
 *   get:
 *     summary: Get current subscription plan and limits
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plan:
 *                   type: string
 *                   enum: [START, TEAM, BUSINESS]
 *                 status:
 *                   type: string
 *                   enum: [ACTIVE, PAST_DUE, CANCELED, TRIAL]
 *                 startDate:
 *                   type: string
 *                   format: date-time
 *                 endDate:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 trialEndsAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 promoCode:
 *                   type: string
 *                   nullable: true
 *                 limits:
 *                   type: object
 *                   properties:
 *                     maxUsers:
 *                       type: number
 *                     features:
 *                       type: array
 *                       items:
 *                         type: string
 *                 userLimit:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: number
 *                     max:
 *                       type: number
 *                     remaining:
 *                       type: number
 *                     isUnlimited:
 *                       type: boolean
 */
router.get('/current', subscriptionController.getCurrent);

/**
 * @swagger
 * /api/subscription/activate-promo:
 *   post:
 *     summary: Activate promo code
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - promoCode
 *             properties:
 *               promoCode:
 *                 type: string
 *                 description: Promo code to activate
 *     responses:
 *       200:
 *         description: Promo code activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscription:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     plan:
 *                       type: string
 *                       enum: [START, TEAM, BUSINESS]
 *                     status:
 *                       type: string
 *                       enum: [ACTIVE, PAST_DUE, CANCELED, TRIAL]
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     trialEndsAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     promoCode:
 *                       type: string
 *                       nullable: true
 *                 promoCode:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                     plan:
 *                       type: string
 *                       enum: [START, TEAM, BUSINESS]
 *                     usedCount:
 *                       type: number
 *       400:
 *         description: Invalid promo code or expired
 *       404:
 *         description: Promo code not found
 */
router.post('/activate-promo', subscriptionController.activatePromo);

export default router;
