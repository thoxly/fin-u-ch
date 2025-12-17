import axios from 'axios';
import logger from '../../config/logger';

interface SupportTelegramPayload {
  user_id: number;
  company_id: number | null;
  company_name: string;
}

class SupportService {
  private botToken = process.env.TELEGRAM_BOT_TOKEN;
  private groupId = process.env.TELEGRAM_GROUP_ID;
  private telegramApiUrl = 'https://api.telegram.org';

  async sendToTelegramGroup(
    payload: SupportTelegramPayload,
    userEmail?: string
  ): Promise<void> {
    if (!this.botToken || !this.groupId) {
      logger.warn('Telegram bot token or group ID not configured');
      return;
    }

    try {
      const message = this.formatMessage(payload, userEmail);

      await axios.post(
        `${this.telegramApiUrl}/bot${this.botToken}/sendMessage`,
        {
          chat_id: this.groupId,
          text: message,
          parse_mode: 'HTML',
        },
        {
          timeout: 5000,
        }
      );

      logger.info(
        `Support message sent to Telegram group. User: ${payload.user_id}, Company: ${payload.company_id}`
      );
    } catch (error) {
      logger.error(
        `Failed to send message to Telegram: ${error instanceof Error ? error.message : String(error)}`
      );
      // Не бросаем ошибку — поддержка должна быть асинхронной
    }
  }

  private formatMessage(
    payload: SupportTelegramPayload,
    userEmail?: string
  ): string {
    return (
      `<b>🆘 Запрос в поддержку</b>\n\n` +
      `<b>User ID:</b> <code>${payload.user_id}</code>\n` +
      `<b>Email:</b> <code>${userEmail || 'N/A'}</code>\n` +
      `<b>Company ID:</b> <code>${payload.company_id || 'N/A'}</code>\n` +
      `<b>Company:</b> <code>${payload.company_name || 'Не указано'}</code>\n\n` +
      `<i>Пользователь открыл чат с ботом поддержки</i>`
    );
  }
}

export const supportService = new SupportService();
