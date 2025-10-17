import prisma from '../../config/db';
import bcrypt from 'bcryptjs';
import demoCatalogsService from './demo-catalogs.service';
import demoDataGeneratorService from './demo-data-generator.service';
import logger from '../../config/logger';

export interface DemoUserCredentials {
  email: string;
  password: string;
  companyName: string;
}

export interface DemoUserData {
  user: {
    id: string;
    email: string;
    isActive: boolean;
  };
  company: {
    id: string;
    name: string;
    currencyBase: string;
  };
  operationsCount: number;
  plansCount: number;
  accountsCount: number;
  articlesCount: number;
  counterpartiesCount: number;
}

/**
 * Сервис для управления демо-пользователем
 * Обеспечивает создание и управление демо-пользователем с моковыми данными
 */
export class DemoUserService {
  private static readonly DEMO_EMAIL = 'demo@example.com';
  private static readonly DEMO_PASSWORD = 'demo123';
  private static readonly DEMO_COMPANY_NAME = 'Демо Компания ООО';

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
      plansCount,
      accountsCount,
      articlesCount,
      counterpartiesCount,
    ] = await Promise.all([
      prisma.operation.count({ where: { companyId: user.companyId } }),
      prisma.planItem.count({ where: { companyId: user.companyId } }),
      prisma.account.count({ where: { companyId: user.companyId } }),
      prisma.article.count({ where: { companyId: user.companyId } }),
      prisma.counterparty.count({ where: { companyId: user.companyId } }),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
        currencyBase: user.company.currencyBase,
      },
      operationsCount,
      plansCount,
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
      logger.warn('Demo user not found for deletion');
      return;
    }

    // Удаляем все данные компании
    await prisma.$transaction([
      prisma.operation.deleteMany({
        where: { companyId: user.companyId },
      }),
      prisma.planItem.deleteMany({ where: { companyId: user.companyId } }),
      prisma.salary.deleteMany({ where: { companyId: user.companyId } }),
      prisma.deal.deleteMany({ where: { companyId: user.companyId } }),
      prisma.counterparty.deleteMany({
        where: { companyId: user.companyId },
      }),
      prisma.department.deleteMany({
        where: { companyId: user.companyId },
      }),
      prisma.article.deleteMany({ where: { companyId: user.companyId } }),
      prisma.account.deleteMany({ where: { companyId: user.companyId } }),
      prisma.user.deleteMany({ where: { companyId: user.companyId } }),
      prisma.company.delete({ where: { id: user.companyId } }),
    ]);

    logger.info('Demo user and all related data deleted');
  }
}

export default new DemoUserService();
