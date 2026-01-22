import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import { requirePermission } from '../../../middlewares/permissions';
import { reportsRateLimit } from '../../../middlewares/rate-limit.middleware';
import cashflowController from './cashflow.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get(
  '/',
  reportsRateLimit,
  requirePermission('reports', 'read'),
  cashflowController.getCashflow
);

export default router;
