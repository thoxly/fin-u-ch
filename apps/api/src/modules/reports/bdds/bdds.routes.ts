import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import { requirePermission } from '../../../middlewares/permissions';
import bddsController from './bdds.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get('/', requirePermission('reports', 'read'), bddsController.getBDDS);

export default router;
