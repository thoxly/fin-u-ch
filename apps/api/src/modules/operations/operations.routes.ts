import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import { requirePermission } from '../../middlewares/permissions';
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
router.get(
  '/',
  requirePermission('operations', 'read'),
  operationsController.getAll
);

router.get(
  '/:id',
  requirePermission('operations', 'read'),
  operationsController.getById
);
router.post(
  '/',
  requirePermission('operations', 'create'),
  operationsController.create
);
router.patch(
  '/:id/confirm',
  requirePermission('operations', 'confirm'),
  operationsController.confirm
);
router.patch(
  '/:id',
  requirePermission('operations', 'update'),
  operationsController.update
);
router.delete(
  '/:id',
  requirePermission('operations', 'delete'),
  operationsController.delete
);

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
router.post(
  '/bulk-delete',
  requirePermission('operations', 'delete'),
  operationsController.bulkDelete
);

export default router;
