import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import companiesController from './companies.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /api/companies/me:
 *   get:
 *     summary: Get current company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company data
 */
router.get('/me', companiesController.get);

/**
 * @swagger
 * /api/companies/me:
 *   patch:
 *     summary: Update current company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company updated
 */
router.patch('/me', companiesController.update);

/**
 * @swagger
 * /api/companies/ui-settings:
 *   get:
 *     summary: Get UI settings for current company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: UI settings
 */
router.get('/ui-settings', companiesController.getUiSettings);

/**
 * @swagger
 * /api/companies/ui-settings:
 *   put:
 *     summary: Update UI settings for current company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: UI settings updated
 */
router.put('/ui-settings', companiesController.updateUiSettings);

export default router;
