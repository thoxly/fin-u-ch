import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import { requirePermission } from '../../middlewares/permissions';
import plansController from './plans.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /api/plans:
 *   get:
 *     summary: Get all plan items
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of plan items
 */
// Plans относятся к operations, используем те же права
router.get(
  '/',
  requirePermission('operations', 'read'),
  plansController.getAll
);

router.get(
  '/:id',
  requirePermission('operations', 'read'),
  plansController.getById
);
router.post(
  '/',
  requirePermission('operations', 'create'),
  plansController.create
);
router.patch(
  '/:id',
  requirePermission('operations', 'update'),
  plansController.update
);
router.delete(
  '/:id',
  requirePermission('operations', 'delete'),
  plansController.delete
);

export default router;
