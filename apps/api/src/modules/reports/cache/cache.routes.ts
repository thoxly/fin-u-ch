import { Router } from 'express';
import cacheController from './cache.controller';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import { requirePermission } from '../../../middlewares/permissions';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

// Очистка кэша отчетов для текущей компании - требует права на чтение отчетов
router.post(
  '/clear',
  requirePermission('reports', 'read'),
  cacheController.clearCache
);

export default router;
