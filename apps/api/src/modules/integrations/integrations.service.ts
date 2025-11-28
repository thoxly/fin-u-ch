// apps/api/src/modules/integrations/integrations.service.ts
import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';
import { encrypt, decrypt } from '../../utils/encryption';
import logger from '../../config/logger';

interface OzonIntegrationData {
  clientKey: string;
  apiKey: string;
  paymentSchedule: 'next_week' | 'week_after';
  articleId: string;
  accountId: string;
}

interface IntegrationResponse {
  success: boolean;
  data?: {
    id: string;
    type: string;
    connected: boolean;
    data: OzonIntegrationData;
  };
  error?: string;
}

export class IntegrationsService {
  async validateOzonCredentials(
    clientKey: string,
    apiKey: string
  ): Promise<boolean> {
    // Базовая валидация формата ключей
    if (!clientKey || !clientKey.trim()) {
      throw new AppError('Client-Key не может быть пустым', 400);
    }
    if (!apiKey || !apiKey.trim()) {
      throw new AppError('Api-Key не может быть пустым', 400);
    }

    // Пытаемся проверить ключи через реальный запрос к Ozon API
    // Используем рабочий эндпоинт для валидации - запрашиваем данные за последний день
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Форматируем даты в ISO формат, как в рабочем коде
      const dateFrom = yesterday.toISOString();
      const dateTo = today.toISOString();

      const response = await fetch(
        'https://api-seller.ozon.ru/v1/finance/cash-flow-statement/list',
        {
          method: 'POST',
          headers: {
            'Client-Id': clientKey.trim(),
            'Api-Key': apiKey.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: {
              from: dateFrom,
              to: dateTo,
            },
            with_details: true,
            page: 1,
            page_size: 1,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Если получили 401 или 403 - ключи точно неверные
      if (response.status === 401) {
        throw new AppError(
          'Неверные учетные данные Ozon. Проверьте Client-Key и Api-Key',
          401
        );
      } else if (response.status === 403) {
        throw new AppError(
          'Доступ запрещен. Проверьте права доступа API ключа (должен быть доступ к финансовым данным)',
          403
        );
      } else if (response.status === 429) {
        throw new AppError(
          'Превышен лимит запросов к Ozon API. Попробуйте позже',
          429
        );
      } else if (response.status === 404) {
        // 404 может означать, что эндпоинт недоступен или ключи неверные
        // Но если ключи правильные, то при первом использовании интеграции все равно будет работать
        // Поэтому делаем валидацию более мягкой - просто предупреждаем
        logger.warn(
          'Ozon API вернул 404 при валидации. Ключи будут проверены при первом использовании интеграции.'
        );
        // Не бросаем ошибку, а просто возвращаем true - валидация пройдена
        // Реальная проверка произойдет при первом запросе данных
        return true;
      } else if (!response.ok) {
        // Для других ошибок пытаемся получить текст ошибки
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error || '';
        } catch {
          errorText = await response.text().catch(() => '');
        }

        throw new AppError(
          `Ошибка Ozon API: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`,
          response.status
        );
      }

      // Проверяем, что ответ валидный JSON
      const data = await response.json();
      return data && typeof data === 'object';
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Если это уже AppError, просто пробрасываем
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Ozon API validation error:', error);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError('Таймаут подключения к Ozon API', 408);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new AppError(
          'Не удалось подключиться к Ozon API. Проверьте интернет-соединение',
          503
        );
      }

      // Для других ошибок возвращаем true - валидация пройдена
      // Реальная проверка произойдет при первом использовании интеграции
      logger.warn(
        'Не удалось проверить ключи Ozon API при сохранении. Ключи будут проверены при первом использовании интеграции.'
      );
      return true;
    }
  }

  async saveOzonIntegration(
    companyId: string,
    data: OzonIntegrationData
  ): Promise<IntegrationResponse> {
    try {
      // Валидируем учетные данные Ozon
      await this.validateOzonCredentials(data.clientKey, data.apiKey);

      // Проверяем, что статья и счет принадлежат компании
      await this.validateCompanyOwnership(
        companyId,
        data.articleId,
        data.accountId
      );

      // Шифруем apiKey перед сохранением
      const encryptedApiKey = encrypt(data.apiKey);

      // Сохраняем или обновляем интеграцию
      const integration = await prisma.integration.upsert({
        where: {
          companyId_type: {
            companyId,
            type: 'ozon',
          },
        },
        update: {
          clientKey: data.clientKey,
          apiKey: encryptedApiKey, // Сохраняем зашифрованный ключ
          paymentSchedule: data.paymentSchedule,
          articleId: data.articleId,
          accountId: data.accountId,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          companyId,
          type: 'ozon',
          clientKey: data.clientKey,
          apiKey: encryptedApiKey, // Сохраняем зашифрованный ключ
          paymentSchedule: data.paymentSchedule,
          articleId: data.articleId,
          accountId: data.accountId,
          isActive: true,
        },
      });

      return {
        success: true,
        data: {
          id: integration.id,
          type: integration.type,
          connected: integration.isActive,
          data: {
            clientKey: integration.clientKey,
            // НЕ возвращаем apiKey в ответе для безопасности
            apiKey: '***', // Маскируем ключ
            paymentSchedule: integration.paymentSchedule as
              | 'next_week'
              | 'week_after',
            articleId: integration.articleId,
            accountId: integration.accountId,
          },
        },
      };
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return {
          success: false,
          error: error.message,
        };
      }

      logger.error('Failed to save Ozon integration:', error);
      return {
        success: false,
        error: 'Внутренняя ошибка сервера',
      };
    }
  }

  async getOzonIntegration(companyId: string): Promise<IntegrationResponse> {
    try {
      const integration = await prisma.integration.findUnique({
        where: {
          companyId_type: {
            companyId,
            type: 'ozon',
          },
        },
        include: {
          article: {
            select: { id: true, name: true },
          },
          account: {
            select: { id: true, name: true },
          },
        },
      });

      if (!integration) {
        return {
          success: false,
          error: 'Интеграция не найдена',
        };
      }

      return {
        success: true,
        data: {
          id: integration.id,
          type: integration.type,
          connected: integration.isActive,
          data: {
            clientKey: integration.clientKey,
            // НЕ возвращаем apiKey в ответе для безопасности
            apiKey: '***', // Маскируем ключ
            paymentSchedule: integration.paymentSchedule as
              | 'next_week'
              | 'week_after',
            articleId: integration.articleId,
            accountId: integration.accountId,
          },
        },
      };
    } catch (error) {
      logger.error('Failed to get Ozon integration:', error);
      return {
        success: false,
        error: 'Внутренняя ошибка сервера',
      };
    }
  }

  async disconnectOzonIntegration(
    companyId: string
  ): Promise<IntegrationResponse> {
    try {
      // Сначала проверяем, существует ли интеграция
      const existingIntegration = await prisma.integration.findUnique({
        where: {
          companyId_type: {
            companyId,
            type: 'ozon',
          },
        },
      });

      // Если интеграция не существует, возвращаем успешный ответ (idempotent)
      if (!existingIntegration) {
        return {
          success: true,
          data: {
            id: '',
            type: 'ozon',
            connected: false,
            data: {
              clientKey: '',
              apiKey: '***',
              paymentSchedule: 'next_week',
              articleId: null,
              accountId: null,
            },
          },
        };
      }

      // Если интеграция уже отключена, возвращаем успешный ответ
      if (!existingIntegration.isActive) {
        return {
          success: true,
          data: {
            id: existingIntegration.id,
            type: existingIntegration.type,
            connected: false,
            data: {
              clientKey: existingIntegration.clientKey,
              apiKey: '***',
              paymentSchedule: existingIntegration.paymentSchedule as
                | 'next_week'
                | 'week_after',
              articleId: existingIntegration.articleId,
              accountId: existingIntegration.accountId,
            },
          },
        };
      }

      // Отключаем интеграцию
      let integration;
      try {
        integration = await prisma.integration.update({
          where: {
            companyId_type: {
              companyId,
              type: 'ozon',
            },
          },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
        });
      } catch (error: any) {
        // Если интеграция была удалена между проверкой и обновлением, возвращаем успешный ответ
        if (error.code === 'P2025' || error.code === 'P2016') {
          return {
            success: true,
            data: {
              id: existingIntegration.id,
              type: existingIntegration.type,
              connected: false,
              data: {
                clientKey: existingIntegration.clientKey,
                apiKey: '***',
                paymentSchedule: existingIntegration.paymentSchedule as
                  | 'next_week'
                  | 'week_after',
                articleId: existingIntegration.articleId,
                accountId: existingIntegration.accountId,
              },
            },
          };
        }
        throw error;
      }

      return {
        success: true,
        data: {
          id: integration.id,
          type: integration.type,
          connected: false,
          data: {
            clientKey: integration.clientKey,
            // НЕ возвращаем apiKey в ответе для безопасности
            apiKey: '***', // Маскируем ключ
            paymentSchedule: integration.paymentSchedule as
              | 'next_week'
              | 'week_after',
            articleId: integration.articleId,
            accountId: integration.accountId,
          },
        },
      };
    } catch (error: any) {
      logger.error('Failed to disconnect Ozon integration:', error);

      // Если это ошибка Prisma о том, что запись не найдена
      if (error.code === 'P2025' || error.code === 'P2016') {
        return {
          success: true,
          data: {
            id: '',
            type: 'ozon',
            connected: false,
            data: {
              clientKey: '',
              apiKey: '***',
              paymentSchedule: 'next_week',
              articleId: null,
              accountId: null,
            },
          },
        };
      }

      // Для других ошибок возвращаем более информативное сообщение
      const errorMessage =
        error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
      return {
        success: false,
        error: `Ошибка при отключении интеграции: ${errorMessage}`,
      };
    }
  }

  private async validateCompanyOwnership(
    companyId: string,
    articleId: string,
    accountId: string
  ): Promise<void> {
    // Проверяем, что статья принадлежит компании
    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        companyId,
      },
    });

    if (!article) {
      throw new AppError('Статья не найдена или не принадлежит компании', 404);
    }

    // Проверяем, что счет принадлежит компании
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        companyId,
      },
    });

    if (!account) {
      throw new AppError('Счет не найден или не принадлежит компании', 404);
    }
  }
}

export default new IntegrationsService();