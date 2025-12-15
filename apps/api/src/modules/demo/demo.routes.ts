import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import demoController from './demo.controller';

const router: Router = Router();

// Публичный маршрут для получения учетных данных
router.get('/credentials', demoController.getCredentials);
router.post('/start-session', demoController.startSession);

// Защищенные маршруты
router.get('/info', authenticate, demoController.getInfo);
router.get('/exists', authenticate, demoController.checkExists);

router.delete('/delete', authenticate, demoController.delete);

export default router;
