import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import { requirePermission } from '../../../middlewares/permissions';
import salariesController from './salaries.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get(
  '/',
  requirePermission('salaries', 'read'),
  salariesController.getAll
);
router.get(
  '/:id',
  requirePermission('salaries', 'read'),
  salariesController.getById
);
router.post(
  '/',
  requirePermission('salaries', 'create'),
  salariesController.create
);
router.patch(
  '/:id',
  requirePermission('salaries', 'update'),
  salariesController.update
);
router.delete(
  '/:id',
  requirePermission('salaries', 'delete'),
  salariesController.delete
);

export default router;
