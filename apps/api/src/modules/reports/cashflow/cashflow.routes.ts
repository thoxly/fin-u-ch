import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import cashflowController from './cashflow.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get('/', cashflowController.getCashflow);

export default router;

