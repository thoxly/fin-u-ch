import { Router } from 'express';
import { supportController } from './support.controller';
import { authenticate as authMiddleware } from '../../middlewares/auth';

const router: Router = Router();

/**
 * POST /api/support/telegram
 * Отправить данные поддержки в Telegram группу
 */
router.post('/telegram', authMiddleware, supportController.sendTelegramSupport);

export default router;
