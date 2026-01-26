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
   * Оптимизированное удаление компании через Raw SQL
   * Удаляет данные в правильном порядке для минимизации блокировок
   * @param companyId ID компании для удаления
   */
  private async deleteCompanyOptimized(companyId: string): Promise<void> {
    // Используем raw SQL для быстрого удаления в правильном порядке
    // Порядок важен: сначала удаляем дочерние таблицы с большим объемом данных

    // 1. Удаляем таблицы с большим объемом данных (используем индексы для скорости)
    await prisma.$executeRawUnsafe(
      `DELETE FROM imported_operations WHERE "companyId" = $1`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM operations WHERE "companyId" = $1`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM audit_logs WHERE "companyId" = $1`,
      companyId
    );

    // 2. Удаляем связанные таблицы среднего размера
    await prisma.$executeRawUnsafe(
      `DELETE FROM plan_items WHERE "companyId" = $1`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM import_sessions WHERE "companyId" = $1`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM mapping_rules WHERE "companyId" = $1`,
      companyId
    );

    // 3. Удаляем справочники
    await prisma.$executeRawUnsafe(
      `DELETE FROM accounts WHERE "companyId" = $1`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM articles WHERE "companyId" = $1`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM counterparties WHERE "companyId" = $1`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM budgets WHERE "companyId" = $1`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM deals WHERE "companyId" = $1`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM departments WHERE "companyId" = $1`,
      companyId
    );

    // 4. Удаляем роли и разрешения (сначала дочерние)
    await prisma.$executeRawUnsafe(
      `DELETE FROM role_permissions WHERE "roleId" IN (
        SELECT id FROM roles WHERE "companyId" = $1
      )`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM user_roles WHERE "roleId" IN (
        SELECT id FROM roles WHERE "companyId" = $1
      )`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM roles WHERE "companyId" = $1`,
      companyId
    );

    // 5. Удаляем подписки
    await prisma.$executeRawUnsafe(
      `DELETE FROM subscriptions WHERE "companyId" = $1`,
      companyId
    );

    // 6. Удаляем пользователей и связанные данные
    await prisma.$executeRawUnsafe(
      `DELETE FROM email_tokens WHERE "userId" IN (
        SELECT id FROM users WHERE "companyId" = $1
      )`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM user_roles WHERE "userId" IN (
        SELECT id FROM users WHERE "companyId" = $1
      )`,
      companyId
    );

    await prisma.$executeRawUnsafe(
      `DELETE FROM users WHERE "companyId" = $1`,
      companyId
    );

    // 7. Финально удаляем компанию
    await prisma.$executeRawUnsafe(
      `DELETE FROM companies WHERE id = $1`,
      companyId
    );
  }

  /**
   * Удаляет пользователя по ID (вместе с компанией)
   * ОПТИМИЗИРОВАННАЯ ВЕРСИЯ: использует Raw SQL вместо каскадного удаления
   * @param userId ID пользователя для удаления
   * @param maxRetries Максимальное количество попыток при ошибках
   */
  async deleteUser(userId: string, maxRetries: number = 3): Promise<void> {
    // Проверяем существование пользователя перед удалением
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, email: true },
    });

    if (!user) {
      logger.warn(
        `Demo user deletion: User ${userId} not found (already deleted?)`
      );
      return;
    }

    const companyId = user.companyId;

    // Retry логика с экспоненциальной задержкой
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const deleteStartTime = Date.now();

        // Используем оптимизированное удаление через Raw SQL
        await this.deleteCompanyOptimized(companyId);

        const deleteDuration = (Date.now() - deleteStartTime) / 1000;

        logger.info('Demo user deleted (optimized)', {
          userId: user.id,
          email: user.email,
          companyId,
          attempt: attempt + 1,
          duration: `${deleteDuration.toFixed(2)}s`,
        });
        return; // Успешно удалено
      } catch (error: any) {
        lastError = error;

        // Если пользователь уже удален (P2025 = Record not found)
        if (error.code === 'P2025') {
          logger.warn(
            `User ${userId} or company ${companyId} already deleted`,
            {
              userId,
              companyId,
            }
          );
          return;
        }

        // Если это последняя попытка, выбрасываем ошибку
        if (attempt === maxRetries - 1) {
          logger.error(
            `Failed to delete user ${userId} after ${maxRetries} attempts`,
            {
              error,
              userId,
              companyId,
              attempts: maxRetries,
            }
          );
          throw error;
        }

        // Экспоненциальная задержка: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt);
        logger.warn(
          `Error deleting user ${userId} (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms`,
          {
            error: error.message,
            errorCode: error.code,
            userId,
            companyId,
          }
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Не должно сюда дойти, но на всякий случай
    if (lastError) {
      throw lastError;
    }
  }

  /**
   * Очищает старых демо-пользователей
   * @param maxAgeHours Время жизни аккаунтов в часах
   * @param batchSize Размер батча для удаления (по умолчанию 10)
   * @param maxUsersPerRun Максимальное количество пользователей для удаления за один запуск (0 = без лимита)
   */
  async cleanupExpiredDemoUsers(
    maxAgeHours: number = 24,
    batchSize: number = 10,
    maxUsersPerRun: number = 0
  ): Promise<number> {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - maxAgeHours);

    const expiredUsers = await prisma.user.findMany({
      where: {
        email: { startsWith: 'demo_' },
        createdAt: { lt: threshold },
      },
      select: { id: true, email: true },
      take: maxUsersPerRun > 0 ? maxUsersPerRun : undefined,
    });

    if (expiredUsers.length === 0) {
      logger.info('No expired demo users found');
      return 0;
    }

    logger.info(`Found ${expiredUsers.length} expired demo users`, {
      total: expiredUsers.length,
      batchSize,
      maxUsersPerRun,
    });

    let deletedCount = 0;
    let errorCount = 0;

    // Батчинг: удаляем пользователей батчами для оптимизации
    for (let i = 0; i < expiredUsers.length; i += batchSize) {
      const batch = expiredUsers.slice(i, i + batchSize);
      logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}`, {
        batchSize: batch.length,
        totalBatches: Math.ceil(expiredUsers.length / batchSize),
      });

      // Удаляем пользователей в батче параллельно (но с ограничением)
      const batchResults = await Promise.allSettled(
        batch.map((user) => this.deleteUser(user.id))
      );

      // Подсчитываем результаты
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          deletedCount++;
        } else {
          errorCount++;
          logger.error(`Failed to delete expired demo user ${batch[j].id}`, {
            error: result.reason,
            userId: batch[j].id,
            email: batch[j].email,
          });
        }
      }

      // Небольшая задержка между батчами, чтобы не перегружать БД
      if (i + batchSize < expiredUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    logger.info('Cleanup completed', {
      deletedCount,
      errorCount,
      totalFound: expiredUsers.length,
    });

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
