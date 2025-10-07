import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import salariesController from './salaries.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get('/', salariesController.getAll);
router.get('/:id', salariesController.getById);
router.post('/', salariesController.create);
router.patch('/:id', salariesController.update);
router.delete('/:id', salariesController.delete);

export default router;

