import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import demoController from './demo.controller';

const router: Router = Router();

// Публичный маршрут для получения учетных данных
router.get('/credentials', demoController.getCredentials);

// Защищенные маршруты
router.get('/info', authenticateToken, demoController.getInfo);
router.get('/exists', authenticateToken, demoController.checkExists);
router.post('/create', authenticateToken, demoController.create);
router.delete('/delete', authenticateToken, demoController.delete);

export default router;
