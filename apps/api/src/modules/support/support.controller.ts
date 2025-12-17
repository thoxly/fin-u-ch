import { Request, Response } from 'express';
import { supportService } from './support.service';
import logger from '../../config/logger';

class SupportController {
  async sendTelegramSupport(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, company_id, company_name } = req.body;

      // Валидация
      if (typeof user_id !== 'number') {
        res.status(400).json({ error: 'Invalid user_id' });
        return;
      }

      const userEmail = (req as any).user?.email;

      // Отправляем в Telegram асинхронно (не ждём результата)
      supportService.sendToTelegramGroup(
        {
          user_id,
          company_id: company_id || null,
          company_name: company_name || '',
        },
        userEmail
      );

      // Сразу возвращаем успех
      res.json({ success: true, message: 'Support request received' });

      logger.info(`Support request from user ${user_id}`);
    } catch (error) {
      logger.error(
        `Error in sendTelegramSupport: ${error instanceof Error ? error.message : String(error)}`
      );
      res.status(500).json({ error: 'Failed to process support request' });
    }
  }
}

export const supportController = new SupportController();
