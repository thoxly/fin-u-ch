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

    const [operationsCount, accountsCount, articlesCount, counterpartiesCount] =
      await Promise.all([
        prisma.operation.count({ where: { companyId: user.companyId } }),
        prisma.account.count({ where: { companyId: user.companyId } }),
        prisma.article.count({ where: { companyId: user.companyId } }),
        prisma.counterparty.count({ where: { companyId: user.companyId } }),
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
    };
  }

  /**
   * Создает демо-пользователя с полными моковыми данными
   */
  async create(): Promise<DemoUserData> {
    const existingUser = await this.exists();
    if (existingUser) {
      throw new Error('Demo user already exists');
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
          isSuperAdmin: true, // Демо-пользователь также является супер-администратором
        },
      });

      return { company, user };
    });

    logger.info('Demo company and user created', {
      companyId: result.company.id,
      userId: result.user.id,
    });

    // Создаем начальные справочники
    await demoCatalogsService.createInitialCatalogs(result.company.id);
    logger.info('Initial catalogs created');

    // Создаем моковые данные
    await demoDataGeneratorService.createSampleData(result.company.id);
    logger.info('Sample data created');

    const info = await this.getInfo();
    if (!info) {
      throw new Error('Failed to create demo user');
    }
    return info;
  }

  /**
   * Удаляет демо-пользователя и все связанные данные
   */
  async delete(): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: DemoUserService.DEMO_EMAIL },
    });

    if (!user) {
      throw new Error('Demo user not found');
    }

    await prisma.$transaction(async (tx) => {
      // Удаляем все связанные данные
      await tx.operation.deleteMany({ where: { companyId: user.companyId } });
      // Salary model removed - skip deletion
      await tx.account.deleteMany({ where: { companyId: user.companyId } });
      await tx.article.deleteMany({ where: { companyId: user.companyId } });
      await tx.counterparty.deleteMany({
        where: { companyId: user.companyId },
      });
      await tx.deal.deleteMany({ where: { companyId: user.companyId } });
      await tx.department.deleteMany({ where: { companyId: user.companyId } });

      // Удаляем пользователя и компанию
      await tx.user.delete({ where: { id: user.id } });
      await tx.company.delete({ where: { id: user.companyId } });
    });

    logger.info('Demo user and all related data deleted', {
      userId: user.id,
      companyId: user.companyId,
    });
  }

  /**
   * Создает динамического демо-пользователя с уникальным email
   * Возвращает токены для автоматического входа
   */
  async createDynamicUser(): Promise<TokensResponse> {
    const uuid = crypto.randomUUID();
    const email = `demo_${uuid}@example.com`;
    const password = `demo_${uuid}`;

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

      // Добавляем разрешения
      const permissions = [
        { entity: 'operations', action: 'create' },
        { entity: 'operations', action: 'read' },
        { entity: 'operations', action: 'update' },
        { entity: 'operations', action: 'delete' },
        { entity: 'operations', action: 'confirm' },
        { entity: 'articles', action: 'create' },
        { entity: 'articles', action: 'read' },
        { entity: 'articles', action: 'update' },
        { entity: 'articles', action: 'delete' },
        { entity: 'accounts', action: 'create' },
        { entity: 'accounts', action: 'read' },
        { entity: 'accounts', action: 'update' },
        { entity: 'accounts', action: 'delete' },
        { entity: 'counterparties', action: 'create' },
        { entity: 'counterparties', action: 'read' },
        { entity: 'counterparties', action: 'update' },
        { entity: 'counterparties', action: 'delete' },
        { entity: 'budgets', action: 'create' },
        { entity: 'budgets', action: 'read' },
        { entity: 'budgets', action: 'update' },
        { entity: 'budgets', action: 'delete' },
        { entity: 'deals', action: 'create' },
        { entity: 'deals', action: 'read' },
        { entity: 'deals', action: 'update' },
        { entity: 'deals', action: 'delete' },
        { entity: 'departments', action: 'create' },
        { entity: 'departments', action: 'read' },
        { entity: 'departments', action: 'update' },
        { entity: 'departments', action: 'delete' },
        { entity: 'roles', action: 'create' },
        { entity: 'roles', action: 'read' },
        { entity: 'roles', action: 'update' },
        { entity: 'roles', action: 'delete' },
        { entity: 'users', action: 'create' },
        { entity: 'users', action: 'read' },
        { entity: 'users', action: 'update' },
        { entity: 'users', action: 'delete' },
        { entity: 'import', action: 'create' },
        { entity: 'import', action: 'read' },
        { entity: 'import', action: 'confirm' },
        { entity: 'settings', action: 'read' },
        { entity: 'settings', action: 'update' },
        { entity: 'reports', action: 'read' },
        { entity: 'dashboard', action: 'read' },
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
      user: {
        id: result.user.id,
        email: result.user.email,
        companyId: result.company.id,
      },
      accessToken,
      refreshToken,
    };
  }
}

export default new DemoUserService();
