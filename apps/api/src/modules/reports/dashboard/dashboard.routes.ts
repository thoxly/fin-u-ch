import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import dashboardController from './dashboard.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Get dashboard report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: periodTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [plan, fact, both]
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/', dashboardController.getDashboard);

export default router;

