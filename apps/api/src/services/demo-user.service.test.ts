import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DemoUserService } from './demo-user.service';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

// Mock seedInitialData
jest.mock('../../../scripts/seed-initial-data', () => ({
  seedInitialData: jest.fn(),
}));

// Mock logger
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
}));

describe('DemoUserService', () => {
  let demoUserService: DemoUserService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockBcrypt: jest.Mocked<typeof bcrypt>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Prisma mocks
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      company: {
        create: jest.fn(),
        delete: jest.fn(),
      },
      operation: {
        count: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      planItem: {
        count: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      account: {
        count: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      article: {
        count: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      counterparty: {
        count: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      department: {
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
      },
      salary: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      deal: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    } as jest.Mocked<PrismaClient>;

    mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
    mockBcrypt.hash.mockResolvedValue('hashed-password');

    demoUserService = new DemoUserService(mockPrisma);
  });

  describe('getCredentials', () => {
    it('should return demo user credentials', () => {
      const credentials = demoUserService.getCredentials();

      expect(credentials).toEqual({
        email: 'demo@example.com',
        password: 'demo123',
        companyName: 'Демо Компания ООО',
      });
    });
  });

  describe('exists', () => {
    it('should return true when demo user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'demo@example.com',
        companyId: 'company-id',
        passwordHash: 'hashed-password',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const exists = await demoUserService.exists();

      expect(exists).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'demo@example.com' },
      });
    });

    it('should return false when demo user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const exists = await demoUserService.exists();

      expect(exists).toBe(false);
    });
  });

  describe('getInfo', () => {
    it('should return demo user info when user exists', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'demo@example.com',
        companyId: 'company-id',
        passwordHash: 'hashed-password',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        company: {
          id: 'company-id',
          name: 'Демо Компания ООО',
          currencyBase: 'RUB',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.operation.count.mockResolvedValue(10);
      mockPrisma.planItem.count.mockResolvedValue(5);
      mockPrisma.account.count.mockResolvedValue(3);
      mockPrisma.article.count.mockResolvedValue(15);
      mockPrisma.counterparty.count.mockResolvedValue(8);

      const info = await demoUserService.getInfo();

      expect(info).toEqual({
        user: {
          id: 'user-id',
          email: 'demo@example.com',
          isActive: true,
        },
        company: {
          id: 'company-id',
          name: 'Демо Компания ООО',
          currencyBase: 'RUB',
        },
        operationsCount: 10,
        plansCount: 5,
        accountsCount: 3,
        articlesCount: 15,
        counterpartiesCount: 8,
      });
    });

    it('should return null when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const info = await demoUserService.getInfo();

      expect(info).toBeNull();
    });
  });

  describe('create', () => {
    it('should create demo user when it does not exist', async () => {
      const mockCompany = {
        id: 'company-id',
        name: 'Демо Компания ООО',
        currencyBase: 'RUB',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const mockUser = {
        id: 'user-id',
        email: 'demo@example.com',
        companyId: 'company-id',
        passwordHash: 'hashed-password',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        company: mockCompany,
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.company.create.mockResolvedValue(mockCompany);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.operation.count.mockResolvedValue(10);
      mockPrisma.planItem.count.mockResolvedValue(5);
      mockPrisma.account.count.mockResolvedValue(3);
      mockPrisma.article.count.mockResolvedValue(15);
      mockPrisma.counterparty.count.mockResolvedValue(8);

      // Mock seedInitialData
      const seedInitialData = jest.requireMock(
        '../../../scripts/seed-initial-data'
      ).seedInitialData;
      seedInitialData.mockResolvedValue(undefined);

      // Mock createSampleData dependencies
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'account-1', name: 'Расчетный счет в банке' },
        { id: 'account-2', name: 'Касса' },
      ]);
      mockPrisma.article.findMany.mockResolvedValue([
        { id: 'article-1', name: 'Выручка от продаж' },
        { id: 'article-2', name: 'Зарплата' },
      ]);
      mockPrisma.counterparty.findMany.mockResolvedValue([
        { id: 'cp-1', name: 'ООО "Клиент-1"' },
        { id: 'cp-2', name: 'ООО "Поставщик-1"' },
      ]);
      mockPrisma.deal.findMany.mockResolvedValue([
        { id: 'deal-1', name: 'Проект А' },
      ]);
      mockPrisma.department.findFirst.mockResolvedValue({
        id: 'dept-1',
        name: 'Отдел продаж',
      });

      const result = await demoUserService.create();

      expect(mockPrisma.company.create).toHaveBeenCalledWith({
        data: {
          name: 'Демо Компания ООО',
          currencyBase: 'RUB',
        },
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith('demo123', 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          companyId: 'company-id',
          email: 'demo@example.com',
          passwordHash: 'hashed-password',
          isActive: true,
        },
      });
      expect(seedInitialData).toHaveBeenCalledWith(mockPrisma, 'company-id');
      expect(result).toBeDefined();
    });

    it('should return existing user info when demo user already exists', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'demo@example.com',
        companyId: 'company-id',
        passwordHash: 'hashed-password',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        company: {
          id: 'company-id',
          name: 'Демо Компания ООО',
          currencyBase: 'RUB',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.operation.count.mockResolvedValue(10);
      mockPrisma.planItem.count.mockResolvedValue(5);
      mockPrisma.account.count.mockResolvedValue(3);
      mockPrisma.article.count.mockResolvedValue(15);
      mockPrisma.counterparty.count.mockResolvedValue(8);

      const result = await demoUserService.create();

      expect(mockPrisma.company.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete demo user and all related data', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'demo@example.com',
        companyId: 'company-id',
        passwordHash: 'hashed-password',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        company: {
          id: 'company-id',
          name: 'Демо Компания ООО',
          currencyBase: 'RUB',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockResolvedValue([]);

      await demoUserService.delete();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'demo@example.com' },
        include: { company: true },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle case when demo user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await demoUserService.delete();

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
