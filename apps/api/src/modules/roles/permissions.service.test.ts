import { PermissionsService } from './permissions.service';
import prisma from '../../config/db';

// Mock Prisma client
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    },
    rolePermission: {
      findMany: jest.fn(),
    },
  },
}));

describe('PermissionsService', () => {
  let permissionsService: PermissionsService;
  const userId = 'test-user-id';
  const companyId = 'test-company-id';

  beforeEach(() => {
    permissionsService = new PermissionsService();
    jest.clearAllMocks();
  });

  describe('checkPermission', () => {
    it('should return true for super admin', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: true,
        isActive: true,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await permissionsService.checkPermission(
        userId,
        companyId,
        'operations',
        'create'
      );

      expect(result).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          companyId: true,
          isSuperAdmin: true,
          isActive: true,
        },
      });
    });

    it('should return false if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await permissionsService.checkPermission(
        userId,
        companyId,
        'operations',
        'create'
      );

      expect(result).toBe(false);
    });

    it('should return false if user belongs to different company', async () => {
      const mockUser = {
        id: userId,
        companyId: 'other-company-id',
        isSuperAdmin: false,
        isActive: true,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await permissionsService.checkPermission(
        userId,
        companyId,
        'operations',
        'create'
      );

      expect(result).toBe(false);
    });

    it('should return false if user is inactive', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: false,
        isActive: false,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await permissionsService.checkPermission(
        userId,
        companyId,
        'operations',
        'create'
      );

      expect(result).toBe(false);
    });

    it('should return false if user has no roles', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: false,
        isActive: true,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([]);

      const result = await permissionsService.checkPermission(
        userId,
        companyId,
        'operations',
        'create'
      );

      expect(result).toBe(false);
      expect(prisma.userRole.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          role: {
            isActive: true,
            deletedAt: null,
            companyId,
          },
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      });
    });

    it('should return true if user has role with permission', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: false,
        isActive: true,
      };
      const mockUserRoles = [
        {
          roleId: 'role-1',
          role: {
            id: 'role-1',
            name: 'Test Role',
            isActive: true,
          },
        },
      ];
      const mockPermissions = [
        {
          roleId: 'role-1',
          entity: 'operations',
          action: 'create',
          allowed: true,
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);
      (prisma.rolePermission.findMany as jest.Mock).mockResolvedValue(
        mockPermissions
      );

      const result = await permissionsService.checkPermission(
        userId,
        companyId,
        'operations',
        'create'
      );

      expect(result).toBe(true);
      expect(prisma.rolePermission.findMany).toHaveBeenCalledWith({
        where: {
          roleId: { in: ['role-1'] },
          entity: 'operations',
          action: 'create',
          allowed: true,
        },
      });
    });

    it('should return false if user has role without permission', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: false,
        isActive: true,
      };
      const mockUserRoles = [
        {
          roleId: 'role-1',
          role: {
            id: 'role-1',
            name: 'Test Role',
            isActive: true,
          },
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);
      (prisma.rolePermission.findMany as jest.Mock).mockResolvedValue([]);

      const result = await permissionsService.checkPermission(
        userId,
        companyId,
        'operations',
        'create'
      );

      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for super admin', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: true,
        isActive: true,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await permissionsService.getUserPermissions(
        userId,
        companyId
      );

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
      // Проверяем, что все сущности имеют все действия
      Object.values(result).forEach((actions) => {
        expect(Array.isArray(actions)).toBe(true);
        expect(actions.length).toBeGreaterThan(0);
      });
    });

    it('should return empty object if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await permissionsService.getUserPermissions(
        userId,
        companyId
      );

      expect(result).toEqual({});
    });

    it('should return permissions from user roles', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: false,
        isActive: true,
      };
      const mockUserRoles = [
        {
          roleId: 'role-1',
          role: {
            id: 'role-1',
            name: 'Test Role',
          },
        },
      ];
      const mockPermissions = [
        {
          roleId: 'role-1',
          entity: 'operations',
          action: 'create',
          allowed: true,
        },
        {
          roleId: 'role-1',
          entity: 'operations',
          action: 'read',
          allowed: true,
        },
        {
          roleId: 'role-1',
          entity: 'articles',
          action: 'read',
          allowed: true,
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);
      (prisma.rolePermission.findMany as jest.Mock).mockResolvedValue(
        mockPermissions
      );

      const result = await permissionsService.getUserPermissions(
        userId,
        companyId
      );

      expect(result).toEqual({
        operations: ['create', 'read'],
        articles: ['read'],
      });
    });

    it('should return empty object if user has no roles', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: false,
        isActive: true,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue([]);

      const result = await permissionsService.getUserPermissions(
        userId,
        companyId
      );

      expect(result).toEqual({});
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one permission', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: false,
        isActive: true,
      };
      const mockUserRoles = [
        {
          roleId: 'role-1',
          role: {
            id: 'role-1',
            name: 'Test Role',
            isActive: true,
          },
        },
      ];
      const mockPermissions = [
        {
          roleId: 'role-1',
          entity: 'operations',
          action: 'read',
          allowed: true,
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);
      (prisma.rolePermission.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // для 'create'
        .mockResolvedValueOnce(mockPermissions); // для 'read'

      const result = await permissionsService.hasAnyPermission(
        userId,
        companyId,
        'operations',
        ['create', 'read']
      );

      expect(result).toBe(true);
    });

    it('should return false if user has no permissions', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: false,
        isActive: true,
      };
      const mockUserRoles = [
        {
          roleId: 'role-1',
          role: {
            id: 'role-1',
            name: 'Test Role',
            isActive: true,
          },
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);
      (prisma.rolePermission.findMany as jest.Mock).mockResolvedValue([]);

      const result = await permissionsService.hasAnyPermission(
        userId,
        companyId,
        'operations',
        ['create', 'update']
      );

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: false,
        isActive: true,
      };
      const mockUserRoles = [
        {
          roleId: 'role-1',
          role: {
            id: 'role-1',
            name: 'Test Role',
            isActive: true,
          },
        },
      ];
      const mockPermissions = [
        {
          roleId: 'role-1',
          entity: 'operations',
          action: 'create',
          allowed: true,
        },
        {
          roleId: 'role-1',
          entity: 'operations',
          action: 'read',
          allowed: true,
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);
      (prisma.rolePermission.findMany as jest.Mock).mockResolvedValue(
        mockPermissions
      );

      const result = await permissionsService.hasAllPermissions(
        userId,
        companyId,
        'operations',
        ['create', 'read']
      );

      expect(result).toBe(true);
    });

    it('should return false if user missing any permission', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: false,
        isActive: true,
      };
      const mockUserRoles = [
        {
          roleId: 'role-1',
          role: {
            id: 'role-1',
            name: 'Test Role',
            isActive: true,
          },
        },
      ];
      const mockPermissions = [
        {
          roleId: 'role-1',
          entity: 'operations',
          action: 'create',
          allowed: true,
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);
      (prisma.rolePermission.findMany as jest.Mock)
        .mockResolvedValueOnce(mockPermissions) // для 'create'
        .mockResolvedValueOnce([]); // для 'read'

      const result = await permissionsService.hasAllPermissions(
        userId,
        companyId,
        'operations',
        ['create', 'read']
      );

      expect(result).toBe(false);
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      const mockUser = {
        id: userId,
        companyId,
        isSuperAdmin: false,
        isActive: true,
      };
      const mockUserRoles = [
        {
          id: 'user-role-1',
          roleId: 'role-1',
          assignedAt: new Date(),
          assignedBy: 'admin-id',
          role: {
            id: 'role-1',
            name: 'Test Role',
            description: 'Test Description',
            category: 'Test Category',
            isSystem: false,
            permissions: [
              { entity: 'operations', action: 'create', allowed: true },
            ],
            _count: { userRoles: 2 },
          },
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);

      const result = await permissionsService.getUserRoles(userId, companyId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'user-role-1',
        roleId: 'role-1',
        role: expect.objectContaining({
          id: 'role-1',
          name: 'Test Role',
        }),
      });
    });

    it('should return empty array if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await permissionsService.getUserRoles(userId, companyId);

      expect(result).toEqual([]);
    });
  });
});
