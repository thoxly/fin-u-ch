import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import operationsController from './operations.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /api/operations:
 *   get:
 *     summary: Get all operations
 *     tags: [Operations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of operations
 */
router.get('/', operationsController.getAll);

router.get('/:id', operationsController.getById);
router.post('/', operationsController.create);
router.patch('/:id', operationsController.update);
router.delete('/:id', operationsController.delete);

export default router;

