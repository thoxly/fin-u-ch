import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import plansController from './plans.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /api/plans:
 *   get:
 *     summary: Get all plan items
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of plan items
 */
router.get('/', plansController.getAll);

router.get('/:id', plansController.getById);
router.post('/', plansController.create);
router.patch('/:id', plansController.update);
router.delete('/:id', plansController.delete);

export default router;
