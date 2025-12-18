import logger from '../../config/logger';
import https from 'https';
import { URL } from 'url';

interface SupportTelegramPayload {
  user_id: number;
  company_id: number | null;
  company_name: string;
}

class SupportService {
  private botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  private groupId = process.env.TELEGRAM_GROUP_ID || '';
  private telegramApiBase = 'https://api.telegram.org';

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
      const url = new URL(
        `${this.telegramApiBase}/bot${this.botToken}/sendMessage`
      );
      const body = JSON.stringify({
        chat_id: this.groupId,
        text: message,
        parse_mode: 'HTML',
      });

      await this.postJson(url, body);

      logger.info(
        `Support message sent to Telegram group. User: ${payload.user_id}, Company: ${payload.company_id}`
      );
    } catch (err) {
      logger.error(
        `Failed to send message to Telegram: ${err instanceof Error ? err.message : String(err)}`
      );
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

  private postJson(url: URL, body: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          res.on('end', () => {
            const resBody = Buffer.concat(chunks).toString('utf8');
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              resolve();
            } else {
              reject(
                new Error(
                  `Telegram API responded with status ${res.statusCode}: ${resBody}`
                )
              );
            }
          });
        }
      );

      req.on('error', (e) => reject(e));
      req.write(body);
      req.end();
    });
  }
}

export const supportService = new SupportService();
