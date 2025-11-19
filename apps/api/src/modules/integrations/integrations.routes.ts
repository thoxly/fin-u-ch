import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import integrationsController from './integrations.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /api/integrations/ozon:
 *   post:
 *     summary: Save Ozon integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientKey
 *               - apiKey
 *               - paymentSchedule
 *               - articleId
 *               - accountId
 *             properties:
 *               clientKey:
 *                 type: string
 *               apiKey:
 *                 type: string
 *               paymentSchedule:
 *                 type: string
 *                 enum: [next_week, week_after]
 *               articleId:
 *                 type: string
 *               accountId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Integration saved successfully
 */
router.post('/ozon', integrationsController.saveOzonIntegration);

/**
 * @swagger
 * /api/integrations/ozon:
 *   get:
 *     summary: Get Ozon integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration data
 */
router.get('/ozon', integrationsController.getOzonIntegration);

/**
 * @swagger
 * /api/integrations/ozon:
 *   delete:
 *     summary: Disconnect Ozon integration
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration disconnected
 */
router.delete('/ozon', integrationsController.disconnectOzonIntegration);

export default router;
