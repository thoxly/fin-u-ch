import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import ddsController from './dds.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /reports/dds:
 *   get:
 *     summary: Get detailed cash flow statement (DDS)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: periodFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date of the period
 *       - in: query
 *         name: periodTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date of the period
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         description: Filter by specific account (optional)
 *     responses:
 *       200:
 *         description: Detailed cash flow statement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       accountId:
 *                         type: string
 *                       accountName:
 *                         type: string
 *                       openingBalance:
 *                         type: number
 *                       closingBalance:
 *                         type: number
 *                 inflows:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       articleId:
 *                         type: string
 *                       articleName:
 *                         type: string
 *                       type:
 *                         type: string
 *                       months:
 *                         type: object
 *                       total:
 *                         type: number
 *                 outflows:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       articleId:
 *                         type: string
 *                       articleName:
 *                         type: string
 *                       type:
 *                         type: string
 *                       months:
 *                         type: object
 *                       total:
 *                         type: number
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalInflow:
 *                       type: number
 *                     totalOutflow:
 *                       type: number
 *                     netCashflow:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', ddsController.getDDS);

export default router;
