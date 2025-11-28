import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import integrationsController from './integrations.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.post('/ozon', integrationsController.saveOzonIntegration);
router.get('/ozon', integrationsController.getOzonIntegration);
router.delete('/ozon', integrationsController.disconnectOzonIntegration);

// Endpoints для worker
router.post(
  '/ozon/generate-operations',
  integrationsController.generateOzonOperations
);

export default router;
