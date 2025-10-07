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

export default router;

