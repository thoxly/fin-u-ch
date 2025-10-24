import { Router } from 'express';
import cacheController from './cache.controller';
import { authenticate } from '../../../middlewares/auth';

const router: Router = Router();

// Очистка кэша отчетов для текущей компании
router.post('/clear', authenticate, cacheController.clearCache);

export default router;
