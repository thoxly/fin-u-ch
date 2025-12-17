import prisma from '../../config/db';
import logger from '../../config/logger';
import bcrypt from 'bcryptjs';
import demoCatalogsService from './demo-catalogs.service';
import demoDataGeneratorService from './demo-data-generator.service';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { TokensResponse } from '../auth/auth.service';
import crypto from 'crypto';

export interface DemoUserCredentials {
  email: string;
  password: string;
  companyName: string;
}

export interface DemoUserData {
  user: {
    id: string;
    email: string;
    companyId: string;
  };
  company: {
    id: string;
    name: string;
  };
  operationsCount: number;
  accountsCount: number;
  articlesCount: number;
  counterpartiesCount: number;
  plansCount: number;
}

/**
 * Сервис для управления демо-пользователем
 */
export class DemoUserService {
  public static readonly DEMO_EMAIL = 'demo@example.com';
  public static readonly DEMO_PASSWORD = 'demo123';
  public static readonly DEMO_COMPANY_NAME = 'Демо-компания';

  /**
   * Получает учетные данные демо-пользователя
   */
  getCredentials(): DemoUserCredentials {
    return {
      email: DemoUserService.DEMO_EMAIL,
      password: DemoUserService.DEMO_PASSWORD,
      companyName: DemoUserService.DEMO_COMPANY_NAME,
    };
  }

  /**
   * Проверяет, существует ли демо-пользователь
   */
  async exists(): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email: DemoUserService.DEMO_EMAIL },
    });
    return !!user;
  }

  /**
   * Получает информацию о демо-пользователе
   */
  async getInfo(): Promise<DemoUserData | null> {
    const user = await prisma.user.findUnique({
      where: { email: DemoUserService.DEMO_EMAIL },
      include: {
        company: true,
      },
    });

    if (!user) {
      return null;
    }

    const [
      operationsCount,
      accountsCount,
      articlesCount,
      counterpartiesCount,
      plansCount,
    ] = await Promise.all([
      prisma.operation.count({ where: { companyId: user.companyId } }),
      prisma.account.count({ where: { companyId: user.companyId } }),
      prisma.article.count({ where: { companyId: user.companyId } }),
      prisma.counterparty.count({ where: { companyId: user.companyId } }),
      prisma.planItem.count({ where: { companyId: user.companyId } }),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
      },
      operationsCount,
      accountsCount,
      articlesCount,
      counterpartiesCount,
      plansCount,
    };
  }

  /**
   * Создает основного демо-пользователя с полными данными
   */
  async create(): Promise<DemoUserData> {
    // Проверяем, существует ли уже демо-пользователь
    const existing = await this.exists();
    if (existing) {
      const info = await this.getInfo();
      if (info) {
        return info;
      }
    }

    // Создаем все в одной транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Создаем компанию
      const company = await tx.company.create({
        data: {
          name: DemoUserService.DEMO_COMPANY_NAME,
          currencyBase: 'RUB',
        },
      });

      // Создаем пользователя
      const passwordHash = await bcrypt.hash(DemoUserService.DEMO_PASSWORD, 10);
      const user = await tx.user.create({
        data: {
          email: DemoUserService.DEMO_EMAIL,
          passwordHash,
          companyId: company.id,
          isActive: true,
          isSuperAdmin: true,
          isEmailVerified: true,
        },
      });

      // Создаем роль администратора
      const adminRole = await tx.role.create({
        data: {
          companyId: company.id,
          name: 'Администратор',
          description: 'Полный доступ ко всем разделам системы',
          category: 'admin',
          isSystem: true,
          isActive: true,
        },
      });

      // Добавляем разрешения
      const permissions = [
        // Operations
        { entity: 'operations', action: 'create' },
        { entity: 'operations', action: 'read' },
        { entity: 'operations', action: 'update' },
        { entity: 'operations', action: 'delete' },
        { entity: 'operations', action: 'confirm' },
        // Articles
        { entity: 'articles', action: 'create' },
        { entity: 'articles', action: 'read' },
        { entity: 'articles', action: 'update' },
        { entity: 'articles', action: 'delete' },
        // Accounts
        { entity: 'accounts', action: 'create' },
        { entity: 'accounts', action: 'read' },
        { entity: 'accounts', action: 'update' },
        { entity: 'accounts', action: 'delete' },
        // Counterparties
        { entity: 'counterparties', action: 'create' },
        { entity: 'counterparties', action: 'read' },
        { entity: 'counterparties', action: 'update' },
        { entity: 'counterparties', action: 'delete' },
        // Budgets
        { entity: 'budgets', action: 'create' },
        { entity: 'budgets', action: 'read' },
        { entity: 'budgets', action: 'update' },
        { entity: 'budgets', action: 'delete' },
        // Deals
        { entity: 'deals', action: 'create' },
        { entity: 'deals', action: 'read' },
        { entity: 'deals', action: 'update' },
        { entity: 'deals', action: 'delete' },
        // Departments
        { entity: 'departments', action: 'create' },
        { entity: 'departments', action: 'read' },
        { entity: 'departments', action: 'update' },
        { entity: 'departments', action: 'delete' },
        // Roles
        { entity: 'roles', action: 'create' },
        { entity: 'roles', action: 'read' },
        { entity: 'roles', action: 'update' },
        { entity: 'roles', action: 'delete' },
        // Users
        { entity: 'users', action: 'create' },
        { entity: 'users', action: 'read' },
        { entity: 'users', action: 'update' },
        { entity: 'users', action: 'delete' },
        // Import
        { entity: 'import', action: 'create' },
        { entity: 'import', action: 'read' },
        { entity: 'import', action: 'confirm' },
        // Settings
        { entity: 'settings', action: 'read' },
        { entity: 'settings', action: 'update' },
      ];

      await tx.rolePermission.createMany({
        data: permissions.map((perm) => ({
          roleId: adminRole.id,
          entity: perm.entity,
          action: perm.action,
          allowed: true,
        })),
      });

      // Назначаем роль
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });

      // Создаем подписку TEAM
      await tx.subscription.create({
        data: {
          companyId: company.id,
          plan: 'TEAM',
          status: 'ACTIVE',
          startDate: new Date(),
        },
      });

      return { company, user };
    });

    logger.info('Demo user created', {
      companyId: result.company.id,
      userId: result.user.id,
      email: result.user.email,
    });

    // Создаем данные
    await demoCatalogsService.createInitialCatalogs(result.company.id);
    await demoDataGeneratorService.createSampleData(result.company.id);

    // Получаем финальную информацию
    const info = await this.getInfo();
    if (!info) {
      throw new Error('Failed to get demo user info after creation');
    }

    return info;
  }

  /**
   * Создает динамического демо-пользователя с изолированным окружением
   */
  async createDynamicUser(): Promise<TokensResponse> {
    const uuid = crypto.randomUUID();
    const email = `demo_${uuid}@example.com`;
    const password = `demo_${uuid}`; // Пароль не так важен для авто-входа, но нужен для записи

    // Создаем все в одной транзакции
    const result = await prisma.$transaction(async (tx) => {
      // Создаем компанию
      const company = await tx.company.create({
        data: {
          name: 'Демо-компания (Временная)',
          currencyBase: 'RUB',
        },
      });

      // Создаем пользователя
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          companyId: company.id,
          isActive: true,
          isSuperAdmin: true,
          isEmailVerified: true,
        },
      });

      // Создаем роль администратора
      const adminRole = await tx.role.create({
        data: {
          companyId: company.id,
          name: 'Администратор',
          description: 'Полный доступ ко всем разделам системы',
          category: 'admin',
          isSystem: true,
          isActive: true,
        },
      });

      // Добавляем разрешения (те же 46 штук)
      // ВАЖНО: Дублируем логику разрешений, так как она хардкодилась внутри метода create()
      // Лучше было бы вынести в private метод, но для минимизации изменений скопируем массив прав.
      const permissions = [
        // Operations
        { entity: 'operations', action: 'create' },
        { entity: 'operations', action: 'read' },
        { entity: 'operations', action: 'update' },
        { entity: 'operations', action: 'delete' },
        { entity: 'operations', action: 'confirm' },
        // Articles
        { entity: 'articles', action: 'create' },
        { entity: 'articles', action: 'read' },
        { entity: 'articles', action: 'update' },
        { entity: 'articles', action: 'delete' },
        // Accounts
        { entity: 'accounts', action: 'create' },
        { entity: 'accounts', action: 'read' },
        { entity: 'accounts', action: 'update' },
        { entity: 'accounts', action: 'delete' },
        // Counterparties
        { entity: 'counterparties', action: 'create' },
        { entity: 'counterparties', action: 'read' },
        { entity: 'counterparties', action: 'update' },
        { entity: 'counterparties', action: 'delete' },
        // Budgets
        { entity: 'budgets', action: 'create' },
        { entity: 'budgets', action: 'read' },
        { entity: 'budgets', action: 'update' },
        { entity: 'budgets', action: 'delete' },
        // Deals
        { entity: 'deals', action: 'create' },
        { entity: 'deals', action: 'read' },
        { entity: 'deals', action: 'update' },
        { entity: 'deals', action: 'delete' },
        // Departments
        { entity: 'departments', action: 'create' },
        { entity: 'departments', action: 'read' },
        { entity: 'departments', action: 'update' },
        { entity: 'departments', action: 'delete' },
        // Roles
        { entity: 'roles', action: 'create' },
        { entity: 'roles', action: 'read' },
        { entity: 'roles', action: 'update' },
        { entity: 'roles', action: 'delete' },
        // Users
        { entity: 'users', action: 'create' },
        { entity: 'users', action: 'read' },
        { entity: 'users', action: 'update' },
        { entity: 'users', action: 'delete' },
        // Import
        { entity: 'import', action: 'create' },
        { entity: 'import', action: 'read' },
        { entity: 'import', action: 'confirm' },
        // Settings
        { entity: 'settings', action: 'read' },
        { entity: 'settings', action: 'update' },
      ];

      await tx.rolePermission.createMany({
        data: permissions.map((perm) => ({
          roleId: adminRole.id,
          entity: perm.entity,
          action: perm.action,
          allowed: true,
        })),
      });

      // Назначаем роль
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });

      // Создаем подписку TEAM
      await tx.subscription.create({
        data: {
          companyId: company.id,
          plan: 'TEAM',
          status: 'ACTIVE',
          startDate: new Date(),
        },
      });

      return { company, user };
    });

    logger.info('Dynamic demo user created', {
      companyId: result.company.id,
      userId: result.user.id,
      email: result.user.email,
    });

    // Создаем данные
    await demoCatalogsService.createInitialCatalogs(result.company.id);
    await demoDataGeneratorService.createSampleData(result.company.id);

    // Генерируем токены
    const accessToken = generateAccessToken({
      userId: result.user.id,
      email: result.user.email,
    });

    const refreshToken = generateRefreshToken({
      userId: result.user.id,
      email: result.user.email,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        companyId: result.user.companyId,
      },
    };
  }

  /**
   * Удаляет пользователя по ID (вместе с компанией)
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, email: true },
    });

    if (!user) {
      logger.warn(`Demo user deletion: User ${userId} not found`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 0. Удаляем всех пользователей компании
      const companyUsers = await tx.user.findMany({
        where: { companyId: user.companyId },
        select: { id: true },
      });

      for (const companyUser of companyUsers) {
        // Логи аудита
        await tx.auditLog.deleteMany({ where: { userId: companyUser.id } });
        // Правила маппинга
        await tx.mappingRule.deleteMany({ where: { userId: companyUser.id } });
        // Сессии импорта
        const userSessions = await tx.importSession.findMany({
          where: { userId: companyUser.id },
          select: { id: true },
        });

        if (userSessions.length > 0) {
          const sessionIds = userSessions.map((s) => s.id);
          await tx.importedOperation.deleteMany({
            where: { importSessionId: { in: sessionIds } },
          });
          await tx.importSession.deleteMany({
            where: { userId: companyUser.id },
          });
        }

        // Пользователь
        await tx.user.delete({ where: { id: companyUser.id } });
      }

      // 1. Связанные данные компании
      const cid = user.companyId;
      await tx.operation.deleteMany({ where: { companyId: cid } });
      await tx.planItem.deleteMany({ where: { companyId: cid } });
      await tx.budget.deleteMany({ where: { companyId: cid } });
      await tx.account.deleteMany({ where: { companyId: cid } });
      await tx.article.deleteMany({ where: { companyId: cid } });
      await tx.counterparty.deleteMany({ where: { companyId: cid } });
      await tx.deal.deleteMany({ where: { companyId: cid } });
      await tx.department.deleteMany({ where: { companyId: cid } });

      // Роли и разрешения удалятся каскадно? Обычно да, но лучше проверить.
      // В create() мы создавали UserRole и RolePermission.
      // Role удаляется здесь?
      // В оригинальном коде delete() не удалял Role явно, но удалял Company. Если Role имеет FK on Company с Cascade Delete, то ок.
      // Но лучше добавить явное удаление, чтобы было чисто.
      await tx.role.deleteMany({ where: { companyId: cid } });

      // Подписка
      await tx.subscription.deleteMany({ where: { companyId: cid } });

      // 2. Компания
      await tx.company.delete({ where: { id: cid } });
    });

    logger.info('Demo user deleted', { userId: user.id, email: user.email });
  }

  /**
   * Очищает старых демо-пользователей
   * @param maxAgeHours Время жизни аккаунтов в часах
   */
  async cleanupExpiredDemoUsers(maxAgeHours: number = 24): Promise<number> {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - maxAgeHours);

    const expiredUsers = await prisma.user.findMany({
      where: {
        email: { startsWith: 'demo_' },
        createdAt: { lt: threshold },
      },
      select: { id: true, email: true },
    });

    logger.info(`Found ${expiredUsers.length} expired demo users`);

    let deletedCount = 0;
    for (const user of expiredUsers) {
      try {
        await this.deleteUser(user.id);
        deletedCount++;
      } catch (error) {
        logger.error(`Failed to delete expired demo user ${user.id}`, {
          error,
        });
      }
    }

    return deletedCount;
  }

  /**
   * Удаляет демо-пользователя и все связанные данные
   */
  /**
   * Удаляет демо-пользователя по умолчанию
   */
  async delete(): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: DemoUserService.DEMO_EMAIL },
      select: { id: true },
    });

    if (!user) {
      throw new Error('Demo user not found');
    }

    await this.deleteUser(user.id);
  }
}

export default new DemoUserService();
