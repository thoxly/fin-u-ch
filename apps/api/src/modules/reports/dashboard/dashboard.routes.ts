import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import { requirePermission } from '../../../middlewares/permissions';
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
router.get(
  '/',
  requirePermission('dashboard', 'read'),
  dashboardController.getDashboard
);

/**
 * @swagger
 * /api/reports/dashboard/cumulative-cash-flow:
 *   get:
 *     summary: Get cumulative cash flow data for income/expense chart
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
 *       - in: query
 *         name: periodFormat
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter, year]
 *     responses:
 *       200:
 *         description: Cumulative cash flow data
 */
router.get(
  '/cumulative-cash-flow',
  requirePermission('dashboard', 'read'),
  dashboardController.getCumulativeCashFlow
);

export default router;
