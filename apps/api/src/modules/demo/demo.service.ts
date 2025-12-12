import prisma from '../../config/db';
import logger from '../../config/logger';
import bcrypt from 'bcryptjs';
import demoCatalogsService from './demo-catalogs.service';
import demoDataGeneratorService from './demo-data-generator.service';

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
      // 0. Удаляем всех пользователей компании (включая неактивных/приглашённых)
      const companyUsers = await tx.user.findMany({
        where: { companyId: user.companyId },
        select: { id: true },
      });

      for (const companyUser of companyUsers) {
        // Удаляем логи аудита каждого пользователя
        await tx.auditLog.deleteMany({
          where: { userId: companyUser.id },
        });

        // Удаляем правила маппинга каждого пользователя
        await tx.mappingRule.deleteMany({
          where: { userId: companyUser.id },
        });

        // Удаляем сессии импорта
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

        // Удаляем самого пользователя (UserRole и EmailToken удалятся автоматически)
        await tx.user.delete({
          where: { id: companyUser.id },
        });
      }

      // 1. Удаляем все связанные данные компании
      await tx.operation.deleteMany({ where: { companyId: user.companyId } });
      await tx.salary.deleteMany({ where: { companyId: user.companyId } });
      await tx.account.deleteMany({ where: { companyId: user.companyId } });
      await tx.article.deleteMany({ where: { companyId: user.companyId } });
      await tx.counterparty.deleteMany({
        where: { companyId: user.companyId },
      });
      await tx.deal.deleteMany({ where: { companyId: user.companyId } });
      await tx.department.deleteMany({ where: { companyId: user.companyId } });

      // 2. Удаляем саму компанию
      await tx.company.delete({ where: { id: user.companyId } });
    });

    logger.info('Demo user and all related data deleted', {
      userId: user.id,
      companyId: user.companyId,
    });
  }
}

export default new DemoUserService();
