import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import { requirePermission } from '../../../middlewares/permissions';
import departmentsController from './departments.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get(
  '/',
  requirePermission('departments', 'read'),
  departmentsController.getAll
);
router.get(
  '/:id',
  requirePermission('departments', 'read'),
  departmentsController.getById
);
router.post(
  '/',
  requirePermission('departments', 'create'),
  departmentsController.create
);
router.patch(
  '/:id',
  requirePermission('departments', 'update'),
  departmentsController.update
);
router.delete(
  '/:id',
  requirePermission('departments', 'delete'),
  departmentsController.delete
);

export default router;
