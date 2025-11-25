import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import { requirePermission } from '../../../middlewares/permissions';
import counterpartiesController from './counterparties.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get(
  '/',
  requirePermission('counterparties', 'read'),
  counterpartiesController.getAll
);
router.get(
  '/:id',
  requirePermission('counterparties', 'read'),
  counterpartiesController.getById
);
router.post(
  '/',
  requirePermission('counterparties', 'create'),
  counterpartiesController.create
);
router.patch(
  '/:id',
  requirePermission('counterparties', 'update'),
  counterpartiesController.update
);
router.delete(
  '/:id',
  requirePermission('counterparties', 'delete'),
  counterpartiesController.delete
);

export default router;
