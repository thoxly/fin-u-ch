/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// Mock env.ts before importing anything that uses it
jest.mock('../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:3000',
    SMTP_HOST: '',
    SMTP_PORT: 465,
    SMTP_USER: '',
    SMTP_PASS: '',
  },
}));

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
    },
    userRole: {
      createMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    emailToken: {
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) =>
      callback({
        user: {
          findUnique: jest.fn(),
          findUniqueOrThrow: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
        emailToken: {
          update: jest.fn().mockResolvedValue(undefined),
        },
      })
    ),
  },
}));

jest.mock('../../services/mail/mail.service', () => ({
  sendPasswordChangedEmail: jest.fn(),
  sendEmailChangeOldVerificationEmail: jest.fn(),
  sendEmailChangeVerificationEmail: jest.fn(),
}));

jest.mock('../../services/mail/token.service', () => ({
  __esModule: true,
  default: {
    createToken: jest.fn(),
    validateToken: jest.fn(),
    markTokenAsUsed: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../utils/hash', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

import { UsersService } from './users.service';
import { AppError } from '../../middlewares/error';
import prisma from '../../config/db';
import tokenService from '../../services/mail/token.service';
import {
  sendPasswordChangedEmail,
  sendEmailChangeOldVerificationEmail,
  sendEmailChangeVerificationEmail,
} from '../../services/mail/mail.service';
import * as hashUtils from '../../utils/hash';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedTokenService = tokenService as jest.Mocked<typeof tokenService>;

describe('UsersService', () => {
  let usersService: UsersService;
  const mockCompanyId = 'company-1';
  const mockUserId = 'user-1';
  const mockInvitedBy = 'admin-1';
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    companyId: 'company-1',
    isActive: true,
    isEmailVerified: true,
    isSuperAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    company: {
      id: 'company-1',
      name: 'Test Company',
      currencyBase: 'RUB',
    },
  };

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

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.role.findMany as jest.Mock).mockResolvedValue([
        { id: 'role-1', name: 'Role 1' },
        { id: 'role-2', name: 'Role 2' },
      ]);
      (hashUtils.hashPassword as jest.Mock).mockResolvedValue(mockPasswordHash);
      (mockedPrisma.user.create as jest.Mock).mockResolvedValue(mockNewUser);
      (mockedPrisma.userRole.createMany as jest.Mock).mockResolvedValue({
        count: 2,
      });

      const result = await usersService.inviteUser(
        mockCompanyId,
        mockEmail,
        mockRoleIds,
        mockInvitedBy
      );

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockEmail },
        select: { id: true, companyId: true },
      });
      expect(mockedPrisma.role.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: mockRoleIds },
          companyId: mockCompanyId,
          isActive: true,
          deletedAt: null,
        },
      });
      expect(hashUtils.hashPassword).toHaveBeenCalled();
      expect(mockedPrisma.user.create).toHaveBeenCalled();
      expect(mockedPrisma.userRole.createMany).toHaveBeenCalledWith({
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
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
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
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
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
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.role.findMany as jest.Mock).mockResolvedValue([
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

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (hashUtils.hashPassword as jest.Mock).mockResolvedValue(mockPasswordHash);
      (mockedPrisma.user.create as jest.Mock).mockResolvedValue(mockNewUser);

      const result = await usersService.inviteUser(
        mockCompanyId,
        mockEmail,
        [],
        mockInvitedBy
      );

      expect(mockedPrisma.role.findMany).not.toHaveBeenCalled();
      expect(mockedPrisma.userRole.createMany).not.toHaveBeenCalled();
      expect(result).toHaveProperty('tempPassword');
    });
  });

  describe('updateUser', () => {
    const mockUserForUpdate = {
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

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        mockUserForUpdate
      );
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(
        mockUpdatedUser
      );

      const result = await usersService.updateUser(
        mockUserId,
        mockCompanyId,
        updateData
      );

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: { id: true, companyId: true, isSuperAdmin: true },
      });
      expect(mockedPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: updateData,
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw error if user not found', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

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
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserForUpdate,
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
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserForUpdate,
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
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        mockUserForUpdate
      );
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUpdatedUser,
        firstName: 'Jane',
      });

      const result = await usersService.updateUser(mockUserId, mockCompanyId, {
        firstName: 'Jane',
      });

      expect(result.firstName).toBe('Jane');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 'user-1';
      const companyId = 'company-1';
      const currentPassword = 'oldPassword123';
      const newPassword = 'newPassword123';

      (mockedPrisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(hashUtils, 'verifyPassword').mockResolvedValue(true);
      jest
        .spyOn(hashUtils, 'hashPassword')
        .mockResolvedValue('$2b$10$newHashedPassword');

      // Mock the transaction with updateMany
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const tx = {
            user: {
              findFirst: jest.fn().mockResolvedValue({ id: userId }),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          return await callback(tx);
        }
      );
      (sendPasswordChangedEmail as jest.Mock).mockResolvedValue(undefined);

      await usersService.changePassword(
        userId,
        companyId,
        currentPassword,
        newPassword
      );

      expect(mockedPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: userId, companyId: companyId },
      });
      expect(hashUtils.verifyPassword).toHaveBeenCalledWith(
        currentPassword,
        mockUser.passwordHash
      );
      expect(hashUtils.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(mockedPrisma.$transaction).toHaveBeenCalled();
      expect(sendPasswordChangedEmail).toHaveBeenCalledWith(mockUser.email);
    });

    it('should throw error if user not found', async () => {
      const userId = 'non-existent';
      const companyId = 'company-1';
      const currentPassword = 'oldPassword123';
      const newPassword = 'newPassword123';

      (mockedPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        usersService.changePassword(
          userId,
          companyId,
          currentPassword,
          newPassword
        )
      ).rejects.toThrow(AppError);
      await expect(
        usersService.changePassword(
          userId,
          companyId,
          currentPassword,
          newPassword
        )
      ).rejects.toThrow('User not found or access denied');
    });

    it('should throw error if current password is incorrect', async () => {
      const userId = 'user-1';
      const companyId = 'company-1';
      const currentPassword = 'wrongPassword';
      const newPassword = 'newPassword123';

      (mockedPrisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(hashUtils, 'verifyPassword').mockResolvedValue(false);

      await expect(
        usersService.changePassword(
          userId,
          companyId,
          currentPassword,
          newPassword
        )
      ).rejects.toThrow(AppError);
      await expect(
        usersService.changePassword(
          userId,
          companyId,
          currentPassword,
          newPassword
        )
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('requestEmailChange', () => {
    it('should request email change successfully', async () => {
      const userId = 'user-1';
      const companyId = 'company-1';
      const newEmail = 'newemail@example.com';

      (mockedPrisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          companyId: mockUser.companyId,
        })
        .mockResolvedValueOnce(null);
      (mockedTokenService.createToken as jest.Mock).mockResolvedValue(
        'token-123'
      );
      (sendEmailChangeOldVerificationEmail as jest.Mock).mockResolvedValue(
        undefined
      );

      await usersService.requestEmailChange(userId, companyId, newEmail);

      expect(mockedPrisma.user.findFirst).toHaveBeenCalled();
      expect(mockedTokenService.createToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        type: 'email_change_old',
        metadata: { newEmail },
      });
      expect(sendEmailChangeOldVerificationEmail).toHaveBeenCalledWith(
        mockUser.email,
        newEmail,
        'token-123'
      );
    });

    it('should throw error if new email is same as current', async () => {
      const userId = 'user-1';
      const companyId = 'company-1';
      const newEmail = 'test@example.com';

      (mockedPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        companyId: mockUser.companyId,
      });

      await expect(
        usersService.requestEmailChange(userId, companyId, newEmail)
      ).rejects.toThrow(AppError);
      await expect(
        usersService.requestEmailChange(userId, companyId, newEmail)
      ).rejects.toThrow('New email is the same as current email');
    });

    it('should throw error if new email is already in use', async () => {
      const userId = 'user-1';
      const companyId = 'company-1';
      const newEmail = 'existing@example.com';
      const existingUser = {
        id: 'user-2',
        companyId: companyId,
        email: newEmail,
      };

      (mockedPrisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          companyId: mockUser.companyId,
        })
        .mockResolvedValueOnce(existingUser);

      await expect(
        usersService.requestEmailChange(userId, companyId, newEmail)
      ).rejects.toThrow(AppError);

      // Reset mocks for second assertion
      (mockedPrisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          companyId: mockUser.companyId,
        })
        .mockResolvedValueOnce(existingUser);

      await expect(
        usersService.requestEmailChange(userId, companyId, newEmail)
      ).rejects.toThrow('Email already in use');
    });
  });

  describe('confirmOldEmailForChange', () => {
    it('should confirm old email and send verification to new email', async () => {
      const token = 'token-123';
      const companyId = 'company-1';
      const newEmail = 'newemail@example.com';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        userId: 'user-1',
        metadata: { newEmail },
      });
      // Мокаем пользователя для получения companyId (первый вызов findFirst)
      (mockedPrisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'user-1',
          companyId: 'company-1',
        })
        // Второй вызов - проверка существования пользователя в validateEmailChange
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'oldemail@example.com',
          companyId: 'company-1',
        })
        // Третий вызов - проверка, что новый email не занят
        .mockResolvedValueOnce(null);
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const tx = {
            emailToken: {
              update: jest.fn().mockResolvedValue(undefined),
            },
          };
          return await callback(tx);
        }
      );
      (mockedTokenService.markTokenAsUsed as jest.Mock).mockResolvedValue(
        undefined
      );
      (mockedTokenService.createToken as jest.Mock).mockResolvedValue(
        'new-token-123'
      );
      (sendEmailChangeVerificationEmail as jest.Mock).mockResolvedValue(
        undefined
      );

      await usersService.confirmOldEmailForChange(token, companyId);

      expect(mockedTokenService.validateToken).toHaveBeenCalledWith(
        token,
        'email_change_old'
      );
      expect(mockedPrisma.$transaction).toHaveBeenCalled();
      expect(mockedTokenService.createToken).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'email_change_new',
        metadata: { newEmail },
      });
      expect(sendEmailChangeVerificationEmail).toHaveBeenCalledWith(
        newEmail,
        'new-token-123'
      );
    });

    it('should throw error if token is invalid', async () => {
      const token = 'invalid-token';
      const companyId = 'company-1';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      await expect(
        usersService.confirmOldEmailForChange(token, companyId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('confirmEmailChangeWithEmail', () => {
    it('should confirm email change successfully', async () => {
      const token = 'token-123';
      const companyId = 'company-1';
      const newEmail = 'newemail@example.com';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        userId: 'user-1',
        metadata: { newEmail },
      });
      (mockedPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user-1',
        companyId: companyId,
      });
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const tx = {
            user: {
              findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          await callback(tx);
          return tx;
        }
      );
      (mockedTokenService.markTokenAsUsed as jest.Mock).mockResolvedValue(
        undefined
      );

      await usersService.confirmEmailChangeWithEmail(token, companyId);

      expect(mockedTokenService.validateToken).toHaveBeenCalledWith(
        token,
        'email_change_new'
      );
      expect(mockedPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if token is invalid', async () => {
      const token = 'invalid-token';
      const companyId = 'company-1';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      await expect(
        usersService.confirmEmailChangeWithEmail(token, companyId)
      ).rejects.toThrow(AppError);
    });

    it('should throw error if new email is already in use by another user', async () => {
      const token = 'token-123';
      const companyId = 'company-1';
      const newEmail = 'existing@example.com';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        userId: 'user-1',
        metadata: { newEmail },
      });
      // Мокируем findFirst для проверки до транзакции
      (mockedPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user-1',
        companyId: companyId,
      });

      // Мокируем ошибку нарушения уникального ограничения от Prisma
      const prismaError = {
        code: 'P2002',
        meta: {
          target: ['email'],
        },
      };

      // Мокируем транзакцию так, чтобы она выполняла callback, но updateMany выбрасывал ошибку
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const tx = {
            user: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'user-1',
              }),
              updateMany: jest.fn().mockRejectedValue(prismaError),
            },
            emailToken: {
              update: jest.fn().mockResolvedValue(undefined),
            },
          };
          return callback(tx);
        }
      );

      await expect(
        usersService.confirmEmailChangeWithEmail(token, companyId)
      ).rejects.toThrow('Email already in use');
    });
  });
});
