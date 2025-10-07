import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import dealsController from './deals.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

router.get('/', dealsController.getAll);
router.get('/:id', dealsController.getById);
router.post('/', dealsController.create);
router.patch('/:id', dealsController.update);
router.delete('/:id', dealsController.delete);

export default router;

