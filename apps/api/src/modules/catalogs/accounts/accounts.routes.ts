import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import { requirePermission } from '../../../middlewares/permissions';
import accountsController from './accounts.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get(
  '/',
  requirePermission('accounts', 'read'),
  accountsController.getAll
);
router.get(
  '/:id',
  requirePermission('accounts', 'read'),
  accountsController.getById
);
router.post(
  '/',
  requirePermission('accounts', 'create'),
  accountsController.create
);
router.patch(
  '/:id',
  requirePermission('accounts', 'update'),
  accountsController.update
);
router.delete(
  '/:id',
  requirePermission('accounts', 'delete'),
  accountsController.delete
);

export default router;
