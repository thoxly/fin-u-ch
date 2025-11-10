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
      update: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) =>
      callback({
        user: {
          findUnique: jest.fn(),
          update: jest.fn(),
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
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    companyId: 'company-1',
    isActive: true,
    isEmailVerified: true,
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

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 'user-1';
      const currentPassword = 'oldPassword123';
      const newPassword = 'newPassword123';

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(hashUtils, 'verifyPassword').mockResolvedValue(true);
      jest
        .spyOn(hashUtils, 'hashPassword')
        .mockResolvedValue('$2b$10$newHashedPassword');
      (mockedPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (sendPasswordChangedEmail as jest.Mock).mockResolvedValue(undefined);

      await usersService.changePassword(userId, currentPassword, newPassword);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(hashUtils.verifyPassword).toHaveBeenCalledWith(
        currentPassword,
        mockUser.passwordHash
      );
      expect(hashUtils.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(mockedPrisma.user.update).toHaveBeenCalled();
      expect(sendPasswordChangedEmail).toHaveBeenCalledWith(mockUser.email);
    });

    it('should throw error if user not found', async () => {
      const userId = 'non-existent';
      const currentPassword = 'oldPassword123';
      const newPassword = 'newPassword123';

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        usersService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow(AppError);
      await expect(
        usersService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow('User not found');
    });

    it('should throw error if current password is incorrect', async () => {
      const userId = 'user-1';
      const currentPassword = 'wrongPassword';
      const newPassword = 'newPassword123';

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(hashUtils, 'verifyPassword').mockResolvedValue(false);

      await expect(
        usersService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow(AppError);
      await expect(
        usersService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('requestEmailChange', () => {
    it('should request email change successfully', async () => {
      const userId = 'user-1';
      const newEmail = 'newemail@example.com';

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      (mockedTokenService.createToken as jest.Mock).mockResolvedValue(
        'token-123'
      );
      (sendEmailChangeOldVerificationEmail as jest.Mock).mockResolvedValue(
        undefined
      );

      await usersService.requestEmailChange(userId, newEmail);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalled();
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
      const newEmail = 'test@example.com';

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        usersService.requestEmailChange(userId, newEmail)
      ).rejects.toThrow(AppError);
      await expect(
        usersService.requestEmailChange(userId, newEmail)
      ).rejects.toThrow('New email is the same as current email');
    });

    it('should throw error if new email is already in use', async () => {
      const userId = 'user-1';
      const newEmail = 'existing@example.com';
      const existingUser = { ...mockUser, email: newEmail };

      (mockedPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(existingUser);

      await expect(
        usersService.requestEmailChange(userId, newEmail)
      ).rejects.toThrow(AppError);
      await expect(
        usersService.requestEmailChange(userId, newEmail)
      ).rejects.toThrow('Email already in use');
    });
  });

  describe('confirmOldEmailForChange', () => {
    it('should confirm old email and send verification to new email', async () => {
      const token = 'token-123';
      const newEmail = 'newemail@example.com';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        userId: 'user-1',
        metadata: { newEmail },
      });
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedTokenService.markTokenAsUsed as jest.Mock).mockResolvedValue(
        undefined
      );
      (mockedTokenService.createToken as jest.Mock).mockResolvedValue(
        'new-token-123'
      );
      (sendEmailChangeVerificationEmail as jest.Mock).mockResolvedValue(
        undefined
      );

      await usersService.confirmOldEmailForChange(token);

      expect(mockedTokenService.validateToken).toHaveBeenCalledWith(
        token,
        'email_change_old'
      );
      expect(mockedTokenService.markTokenAsUsed).toHaveBeenCalledWith(token);
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

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      await expect(
        usersService.confirmOldEmailForChange(token)
      ).rejects.toThrow(AppError);
    });
  });

  describe('confirmEmailChangeWithEmail', () => {
    it('should confirm email change successfully', async () => {
      const token = 'token-123';
      const newEmail = 'newemail@example.com';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        userId: 'user-1',
        metadata: { newEmail },
      });
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const tx = {
            user: {
              update: jest
                .fn()
                .mockResolvedValue({ ...mockUser, email: newEmail }),
            },
          };
          await callback(tx);
          return tx;
        }
      );
      (mockedTokenService.markTokenAsUsed as jest.Mock).mockResolvedValue(
        undefined
      );

      await usersService.confirmEmailChangeWithEmail(token);

      expect(mockedTokenService.validateToken).toHaveBeenCalledWith(
        token,
        'email_change_new'
      );
      expect(mockedPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if token is invalid', async () => {
      const token = 'invalid-token';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      await expect(
        usersService.confirmEmailChangeWithEmail(token)
      ).rejects.toThrow(AppError);
    });

    it('should throw error if new email is already in use', async () => {
      const token = 'token-123';
      const newEmail = 'existing@example.com';
      const existingUser = { ...mockUser, email: newEmail };

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        userId: 'user-1',
        metadata: { newEmail },
      });
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        existingUser
      );

      await expect(
        usersService.confirmEmailChangeWithEmail(token)
      ).rejects.toThrow(AppError);
      await expect(
        usersService.confirmEmailChangeWithEmail(token)
      ).rejects.toThrow('Email already in use');
    });
  });
});
