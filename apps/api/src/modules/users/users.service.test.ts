/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { UsersService } from './users.service';
import { AppError } from '../../middlewares/error';
import prisma from '../../config/db';
import { hashPassword } from '../../utils/hash';

// Mock dependencies
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
    },
    userRole: {
      createMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../utils/hash', () => ({
  hashPassword: jest.fn(),
}));

describe('UsersService', () => {
  let usersService: UsersService;
  const mockCompanyId = 'company-1';
  const mockUserId = 'user-1';
  const mockInvitedBy = 'admin-1';

  beforeEach(() => {
    usersService = new UsersService();
    jest.clearAllMocks();
  });

  describe('inviteUser', () => {
    const mockEmail = 'newuser@example.com';
    const mockRoleIds = ['role-1', 'role-2'];
    const mockTempPassword = 'temp_abc123';
    const mockPasswordHash = 'hashed_password';

    it('should successfully invite a new user', async () => {
      const mockNewUser = {
        id: 'new-user-id',
        email: mockEmail,
        firstName: null,
        lastName: null,
        companyId: mockCompanyId,
        isActive: true,
        isSuperAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.findMany as jest.Mock).mockResolvedValue([
        { id: 'role-1', name: 'Role 1' },
        { id: 'role-2', name: 'Role 2' },
      ]);
      (hashPassword as jest.Mock).mockResolvedValue(mockPasswordHash);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockNewUser);
      (prisma.userRole.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await usersService.inviteUser(
        mockCompanyId,
        mockEmail,
        mockRoleIds,
        mockInvitedBy
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockEmail },
        select: { id: true, companyId: true },
      });
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: mockRoleIds },
          companyId: mockCompanyId,
          isActive: true,
          deletedAt: null,
        },
      });
      expect(hashPassword).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.userRole.createMany).toHaveBeenCalledWith({
        data: mockRoleIds.map((roleId) => ({
          userId: mockNewUser.id,
          roleId,
          assignedBy: mockInvitedBy,
        })),
      });
      expect(result).toHaveProperty('tempPassword');
      expect(result.email).toBe(mockEmail);
    });

    it('should throw error if user already exists in the same company', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        companyId: mockCompanyId,
      });

      await expect(
        usersService.inviteUser(mockCompanyId, mockEmail, [], mockInvitedBy)
      ).rejects.toThrow(AppError);
      await expect(
        usersService.inviteUser(mockCompanyId, mockEmail, [], mockInvitedBy)
      ).rejects.toThrow('User with this email already exists in your company');
    });

    it('should throw error if user exists in another company', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        companyId: 'other-company',
      });

      await expect(
        usersService.inviteUser(mockCompanyId, mockEmail, [], mockInvitedBy)
      ).rejects.toThrow(AppError);
      await expect(
        usersService.inviteUser(mockCompanyId, mockEmail, [], mockInvitedBy)
      ).rejects.toThrow(
        'User with this email already exists in another company'
      );
    });

    it('should throw error if role not found or inactive', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.findMany as jest.Mock).mockResolvedValue([
        { id: 'role-1', name: 'Role 1' },
        // role-2 missing
      ]);

      await expect(
        usersService.inviteUser(
          mockCompanyId,
          mockEmail,
          mockRoleIds,
          mockInvitedBy
        )
      ).rejects.toThrow(AppError);
      await expect(
        usersService.inviteUser(
          mockCompanyId,
          mockEmail,
          mockRoleIds,
          mockInvitedBy
        )
      ).rejects.toThrow('One or more roles not found or inactive');
    });

    it('should create user without roles if roleIds is empty', async () => {
      const mockNewUser = {
        id: 'new-user-id',
        email: mockEmail,
        firstName: null,
        lastName: null,
        companyId: mockCompanyId,
        isActive: true,
        isSuperAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue(mockPasswordHash);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockNewUser);

      const result = await usersService.inviteUser(
        mockCompanyId,
        mockEmail,
        [],
        mockInvitedBy
      );

      expect(prisma.role.findMany).not.toHaveBeenCalled();
      expect(prisma.userRole.createMany).not.toHaveBeenCalled();
      expect(result).toHaveProperty('tempPassword');
    });
  });

  describe('updateUser', () => {
    const mockUser = {
      id: mockUserId,
      companyId: mockCompanyId,
      isSuperAdmin: false,
    };

    const mockUpdatedUser = {
      id: mockUserId,
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      companyId: mockCompanyId,
      isActive: true,
      isSuperAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully update user', async () => {
      const updateData = {
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = await usersService.updateUser(
        mockUserId,
        mockCompanyId,
        updateData
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: { id: true, companyId: true, isSuperAdmin: true },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: updateData,
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        usersService.updateUser(mockUserId, mockCompanyId, {
          firstName: 'John',
        })
      ).rejects.toThrow(AppError);
      await expect(
        usersService.updateUser(mockUserId, mockCompanyId, {
          firstName: 'John',
        })
      ).rejects.toThrow('User not found');
    });

    it('should throw error if user belongs to different company', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        companyId: 'other-company',
      });

      await expect(
        usersService.updateUser(mockUserId, mockCompanyId, {
          firstName: 'John',
        })
      ).rejects.toThrow(AppError);
      await expect(
        usersService.updateUser(mockUserId, mockCompanyId, {
          firstName: 'John',
        })
      ).rejects.toThrow('User does not belong to this company');
    });

    it('should throw error when trying to deactivate super admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        isSuperAdmin: true,
      });

      await expect(
        usersService.updateUser(mockUserId, mockCompanyId, { isActive: false })
      ).rejects.toThrow(AppError);
      await expect(
        usersService.updateUser(mockUserId, mockCompanyId, { isActive: false })
      ).rejects.toThrow('Cannot deactivate super administrator');
    });

    it('should allow partial updates', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUpdatedUser,
        firstName: 'Jane',
      });

      const result = await usersService.updateUser(mockUserId, mockCompanyId, {
        firstName: 'Jane',
      });

      expect(result.firstName).toBe('Jane');
    });
  });
});
