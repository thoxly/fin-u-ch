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
router.patch('/:id/confirm', operationsController.confirm);
router.patch('/:id', operationsController.update);
router.delete('/:id', operationsController.delete);

/**
 * @swagger
 * /api/operations/bulk-delete:
 *   post:
 *     summary: Bulk delete operations
 *     tags: [Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: DeleteMany result
 */
router.post('/bulk-delete', operationsController.bulkDelete);

export default router;
