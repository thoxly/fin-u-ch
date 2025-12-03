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
router.post('/ozon/:id/test', integrationsController.testOzonIntegration);
router.get('/ozon/:id/status', integrationsController.getOzonOperationStatus);
router.get(
  '/ozon/:id/operations',
  integrationsController.getOzonOperationsHistory
);
router.post(
  '/ozon/:id/test-manual',
  integrationsController.testOzonIntegrationManual
);
router.get('/ozon/operations', integrationsController.getOzonOperations);

router.post(
  '/ozon/generate-operations',
  integrationsController.generateOzonOperations
);
router.post(
  '/ozon/generate-operation',
  integrationsController.generateOzonOperationForIntegration
);
router.get(
  '/ozon/operations-status',
  integrationsController.getOzonOperationsStatus
);

export default router;
