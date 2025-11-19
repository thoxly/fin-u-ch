// apps/api/src/modules/integrations/integrations.service.ts
import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

    try {
      const response = await fetch('https://api-seller.ozon.ru/v1/roles', {
        method: 'POST',
        headers: {
          'Client-Id': clientKey,
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new AppError('Неверные учетные данные Ozon', 401);
      } else if (response.status === 403) {
        throw new AppError(
          'Доступ запрещен. Проверьте права доступа API ключа',
          403
        );
      } else if (response.status === 429) {
        throw new AppError('Превышен лимит запросов к Ozon API', 429);
      } else if (!response.ok) {
        throw new AppError(
          `Ошибка Ozon API: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      return response.status === 200;
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Ozon API validation error:', error);

      if (error.name === 'AbortError') {
        throw new AppError('Таймаут подключения к Ozon API', 408);
      } else if (error instanceof AppError) {
        throw error;
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new AppError('Не удалось подключиться к Ozon API', 503);
      }

      throw new AppError('Ошибка подключения к Ozon API', 500);
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
          apiKey: data.apiKey,
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
          apiKey: data.apiKey,
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
            apiKey: integration.apiKey,
            paymentSchedule: integration.paymentSchedule as
              | 'next_week'
              | 'week_after',
            articleId: integration.articleId,
            accountId: integration.accountId,
          },
        },
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        return {
          success: false,
          error: error.message,
        };
      }

      console.error('Failed to save Ozon integration:', error);
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
            apiKey: integration.apiKey,
            paymentSchedule: integration.paymentSchedule as
              | 'next_week'
              | 'week_after',
            articleId: integration.articleId,
            accountId: integration.accountId,
          },
        },
      };
    } catch (error) {
      console.error('Failed to get Ozon integration:', error);
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
      const integration = await prisma.integration.update({
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

      return {
        success: true,
        data: {
          id: integration.id,
          type: integration.type,
          connected: false,
          data: {
            clientKey: integration.clientKey,
            apiKey: integration.apiKey,
            paymentSchedule: integration.paymentSchedule as
              | 'next_week'
              | 'week_after',
            articleId: integration.articleId,
            accountId: integration.accountId,
          },
        },
      };
    } catch (error) {
      console.error('Failed to disconnect Ozon integration:', error);
      return {
        success: false,
        error: 'Внутренняя ошибка сервера',
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
