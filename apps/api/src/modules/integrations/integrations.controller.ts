// apps/api/src/modules/integrations/integrations.controller.ts
import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import integrationsService from './integrations.service';
import ozonOperationService from './ozon/ozon-operation.service';
import prisma from '../../config/db';

export class IntegrationsController {
  async saveOzonIntegration(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await integrationsService.saveOzonIntegration(
        req.companyId!,
        req.body
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async testOzonIntegrationManual(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const integrationId = req.params.id;

      // Проверяем, что интеграция принадлежит компании
      const integration = await integrationsService.getOzonIntegration(
        req.companyId!
      );

      if (!integration.success || !integration.data) {
        return res.status(404).json({
          success: false,
          error: 'Интеграция не найдена',
        });
      }

      console.log('🧪 Начинаем ручное тестирование интеграции Ozon...');

      // Создаем тестовую операцию
      const result =
        await ozonOperationService.createTestOperation(integrationId);

      if (result) {
        console.log('✅ Тестовая операция успешно создана');

        // Получаем последнюю созданную операцию
        const lastOperation = await integrationsService.getLastOzonOperation(
          req.companyId!,
          integration.data.data.articleId,
          integration.data.data.accountId
        );

        res.json({
          success: true,
          operationCreated: true,
          operationDetails: lastOperation,
          message: 'Тестовая операция успешно создана',
        });
      } else {
        console.log(
          'ℹ️ Операция не создана (возможно, сумма 0 или операция уже существует)'
        );
        res.json({
          success: true,
          operationCreated: false,
          message:
            'Операция не создана (возможно, сумма 0 или операция уже существует)',
        });
      }
    } catch (error: any) {
      console.error('❌ Ошибка при ручном тестировании интеграции:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при тестировании интеграции',
      });
    }
  }

  async getOzonIntegration(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await integrationsService.getOzonIntegration(
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async disconnectOzonIntegration(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await integrationsService.disconnectOzonIntegration(
        req.companyId!
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async testOzonIntegration(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const integrationId = req.params.id;

      // Проверяем, что интеграция принадлежит компании
      const integration = await integrationsService.getOzonIntegration(
        req.companyId!
      );

      if (!integration.success || !integration.data) {
        return res.status(404).json({
          success: false,
          error: 'Интеграция не найдена',
        });
      }

      // Проверяем, что запрашиваемая интеграция совпадает с текущей
      if (integration.data.id !== integrationId) {
        return res.status(403).json({
          success: false,
          error: 'Доступ запрещен',
        });
      }

      const result =
        await ozonOperationService.createTestOperation(integrationId);

      res.json({
        success: true,
        operationCreated: result,
        message: result
          ? 'Тестовая операция успешно создана'
          : 'Операция не создана (возможно, сумма 0 или операция уже существует)',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при тестировании интеграции',
      });
    }
  }

  async getOzonOperations(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const integration = await integrationsService.getOzonIntegration(
        req.companyId!
      );

      if (!integration.success || !integration.data) {
        return res.status(404).json({
          success: false,
          error: 'Интеграция не найдена',
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const page = parseInt(req.query.page as string) || 1;
      const skip = (page - 1) * limit;

      const operations = await prisma.operation.findMany({
        where: {
          companyId: req.companyId!,
          articleId: integration.data.data.articleId,
          accountId: integration.data.data.accountId,
          description: {
            contains: 'Ozon выплата',
          },
        },
        orderBy: {
          operationDate: 'desc',
        },
        take: limit,
        skip,
        include: {
          article: {
            select: { name: true },
          },
          account: {
            select: { name: true },
          },
        },
      });

      const total = await prisma.operation.count({
        where: {
          companyId: req.companyId!,
          articleId: integration.data.data.articleId,
          accountId: integration.data.data.accountId,
          description: {
            contains: 'Ozon выплата',
          },
        },
      });

      res.json({
        success: true,
        data: {
          operations,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      console.error('Ошибка при получении операций Ozon:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при получении операций',
      });
    }
  }

  async getOzonOperationStatus(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const integrationId = req.params.id;

      // Проверяем, что интеграция принадлежит компании
      const integration = await integrationsService.getOzonIntegration(
        req.companyId!
      );

      if (!integration.success || !integration.data) {
        return res.status(404).json({
          success: false,
          error: 'Интеграция не найдена',
        });
      }

      // Проверяем, что запрашиваемая интеграция совпадает с текущей
      if (integration.data.id !== integrationId) {
        return res.status(403).json({
          success: false,
          error: 'Доступ запрещен',
        });
      }

      // Получаем информацию о последней операции
      const lastOperation = await integrationsService.getLastOzonOperation(
        req.companyId!,
        integration.data.data.articleId,
        integration.data.data.accountId
      );

      // Рассчитываем следующий период выплат
      const nextPeriod = ozonOperationService.getQueryPeriod(
        integration.data.data.paymentSchedule
      );

      const paymentDates = ozonOperationService.calculatePaymentDates(
        nextPeriod.to,
        integration.data.data.paymentSchedule
      );

      res.json({
        success: true,
        data: {
          integrationStatus: integration.data.connected ? 'active' : 'inactive',
          lastOperation: lastOperation
            ? {
                date: lastOperation.operationDate,
                amount: lastOperation.amount,
                currency: lastOperation.currency,
              }
            : null,
          nextScheduledRun: 'Понедельник и среда в 09:00',
          nextPaymentDate: paymentDates.paymentDate,
          paymentSchedule: integration.data.data.paymentSchedule,
          currentPeriod: {
            from: nextPeriod.from,
            to: nextPeriod.to,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при получении статуса интеграции',
      });
    }
  }

  async getOzonOperationsHistory(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const integration = await integrationsService.getOzonIntegration(
        req.companyId!
      );

      if (!integration.success || !integration.data) {
        return res.status(404).json({
          success: false,
          error: 'Интеграция не найдена',
        });
      }

      const operations = await integrationsService.getOzonOperationsHistory(
        req.companyId!,
        integration.data.data.articleId,
        integration.data.data.accountId,
        parseInt(req.query.limit as string) || 10
      );

      res.json({
        success: true,
        data: operations,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Ошибка при получении истории операций',
      });
    }
  }

  /**
   * Генерация операций Ozon для всех интеграций (для worker)
   */
  async generateOzonOperations(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log('🔄 API: Generating Ozon operations for all integrations');

      const result =
        await ozonOperationService.createOperationsForAllIntegrations();

      res.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Генерация операции Ozon для конкретной интеграции
   */
  async generateOzonOperationForIntegration(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { integrationId } = req.body;

      if (!integrationId) {
        return res.status(400).json({
          success: false,
          error: 'integrationId is required',
        });
      }

      console.log(
        `🔄 API: Generating Ozon operation for integration ${integrationId}`
      );

      // Проверяем что интеграция принадлежит компании
      const integration = await integrationsService.getOzonIntegration(
        req.companyId!
      );
      if (
        !integration.success ||
        !integration.data ||
        integration.data.id !== integrationId
      ) {
        return res.status(404).json({
          success: false,
          error: 'Integration not found',
        });
      }

      const created =
        await ozonOperationService.createTestOperation(integrationId);

      res.json({
        success: true,
        created,
        integrationId,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получение статуса генерации операций
   */
  async getOzonOperationsStatus(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const integrations = await ozonOperationService.getActiveIntegrations();
      console.log('Защёл');

      res.json({
        success: true,
        data: {
          totalIntegrations: integrations.length,
          lastRun: new Date().toISOString(),
          nextScheduledRun: this.getNextScheduledRun(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  private getNextScheduledRun(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString();
  }
}

export default new IntegrationsController();
