import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import { requirePermission } from '../../../middlewares/permissions';
import dealsController from './deals.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get('/', requirePermission('deals', 'read'), dealsController.getAll);
router.get('/:id', requirePermission('deals', 'read'), dealsController.getById);
router.post('/', requirePermission('deals', 'create'), dealsController.create);
router.patch(
  '/:id',
  requirePermission('deals', 'update'),
  dealsController.update
);
router.delete(
  '/:id',
  requirePermission('deals', 'delete'),
  dealsController.delete
);

export default router;
