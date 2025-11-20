// apps/api/src/modules/integrations/integrations.routes.ts
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

/**
 * @swagger
 * /api/integrations/ozon/{id}/test:
 *   post:
 *     summary: Test Ozon integration and create test operation
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 operationCreated:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/ozon/:id/test', integrationsController.testOzonIntegration);

/**
 * @swagger
 * /api/integrations/ozon/{id}/status:
 *   get:
 *     summary: Get Ozon integration status and next payment information
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Integration status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     integrationStatus:
 *                       type: string
 *                       enum: [active, inactive]
 *                     lastOperation:
 *                       type: object
 *                       properties:
 *                         date:
 *                           type: string
 *                         amount:
 *                           type: number
 *                         currency:
 *                           type: string
 *                     nextScheduledRun:
 *                       type: string
 *                     nextPaymentDate:
 *                       type: string
 *                     paymentSchedule:
 *                       type: string
 *                       enum: [next_week, week_after]
 *                     currentPeriod:
 *                       type: object
 *                       properties:
 *                         from:
 *                           type: string
 *                         to:
 *                           type: string
 */
router.get('/ozon/:id/status', integrationsController.getOzonOperationStatus);

/**
 * @swagger
 * /api/integrations/ozon/{id}/operations:
 *   get:
 *     summary: Get Ozon integration operations history
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: Operations history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       operationDate:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       description:
 *                         type: string
 */
router.get(
  '/ozon/:id/operations',
  integrationsController.getOzonOperationsHistory
);
router.post(
  '/ozon/:id/test-manual',
  integrationsController.testOzonIntegrationManual
);
router.get('/ozon/operations', integrationsController.getOzonOperations);

export default router;
