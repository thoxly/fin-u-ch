import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import departmentsController from './departments.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get('/', departmentsController.getAll);
router.get('/:id', departmentsController.getById);
router.post('/', departmentsController.create);
router.patch('/:id', departmentsController.update);
router.delete('/:id', departmentsController.delete);

export default router;
