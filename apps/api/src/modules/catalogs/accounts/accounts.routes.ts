import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import accountsController from './accounts.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get('/', accountsController.getAll);
router.get('/:id', accountsController.getById);
router.post('/', accountsController.create);
router.patch('/:id', accountsController.update);
router.delete('/:id', accountsController.delete);

export default router;

