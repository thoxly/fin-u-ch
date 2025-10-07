import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import counterpartiesController from './counterparties.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get('/', counterpartiesController.getAll);
router.get('/:id', counterpartiesController.getById);
router.post('/', counterpartiesController.create);
router.patch('/:id', counterpartiesController.update);
router.delete('/:id', counterpartiesController.delete);

export default router;

