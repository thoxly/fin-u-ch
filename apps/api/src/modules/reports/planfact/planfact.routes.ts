import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import planfactController from './planfact.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get('/', planfactController.getPlanFact);

export default router;
