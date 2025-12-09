import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import devController from './dev.controller';

const router: Router = Router();

// Protect all dev routes
router.use(authenticate);
router.use(extractTenant);

router.post('/set-subscription', devController.setSubscription);

export default router;
