import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import demoController from './demo.controller';

const router: Router = Router();

// Публичный маршрут для получения учетных данных
router.get('/credentials', demoController.getCredentials);

// Защищенные маршруты
router.get('/info', authenticate, demoController.getInfo);
router.get('/exists', authenticate, demoController.checkExists);
router.post('/create', authenticate, demoController.create);
router.delete('/delete', authenticate, demoController.delete);

export default router;
