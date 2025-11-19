// Mock env.ts before importing anything that uses it
jest.mock('../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
  },
}));

import { RolesService } from './roles.service';
import { AppError } from '../../middlewares/error';
import prisma from '../../config/db';

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    role: {
      findMany: jest.fn() as jest.Mock,
      findFirst: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
    },
    rolePermission: {
      create: jest.fn() as jest.Mock,
      deleteMany: jest.fn() as jest.Mock,
    },
  },
}));

jest.mock('../../utils/validation', () => ({
  validateRequired: jest.fn(),
}));

// Mock console.log to avoid noise in tests
jest.spyOn(console, 'log').mockImplementation(() => {});

const mockedPrisma = prisma as any;

describe('RolesService', () => {
  let rolesService: RolesService;

  beforeEach(() => {
    rolesService = new RolesService();
    jest.clearAllMocks();
  });

  describe('getAllRoles', () => {
    it('should return all active roles for a company', async () => {
      const companyId = 'company-1';
      const mockRoles = [
        {
          id: 'role-1',
          name: 'Role 1',
          companyId,
          isActive: true,
          _count: { userRoles: 2 },
          permissions: [],
        },
      ];

      mockedPrisma.role.findMany.mockResolvedValue(mockRoles as any);

      const result = await rolesService.getAllRoles(companyId);

      expect(result).toEqual(mockRoles);
      expect(mockedPrisma.role.findMany).toHaveBeenCalledWith({
        where: {
          companyId,
          isActive: true,
          deletedAt: null,
        },
        include: expect.any(Object),
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('getRoleById', () => {
    it('should return role by id', async () => {
      const roleId = 'role-1';
      const companyId = 'company-1';
      const mockRole = {
        id: roleId,
        name: 'Role 1',
        companyId,
        permissions: [],
        _count: { userRoles: 0 },
      };

      mockedPrisma.role.findFirst.mockResolvedValue(mockRole as any);

      const result = await rolesService.getRoleById(roleId, companyId);

      expect(result).toEqual(mockRole);
      expect(mockedPrisma.role.findFirst).toHaveBeenCalledWith({
        where: {
          id: roleId,
          companyId,
          deletedAt: null,
        },
        include: expect.any(Object),
      });
    });

    it('should throw AppError if role not found', async () => {
      const roleId = 'role-1';
      const companyId = 'company-1';

      mockedPrisma.role.findFirst.mockResolvedValue(null);

      await expect(rolesService.getRoleById(roleId, companyId)).rejects.toThrow(
        AppError
      );
      await expect(rolesService.getRoleById(roleId, companyId)).rejects.toThrow(
        'Role not found'
      );
    });
  });
});
