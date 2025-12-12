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
    },
    $transaction: jest.fn((callback) =>
      callback({
        user: {
          update: jest.fn(),
        },
      })
    ),
  },
}));

jest.mock('../../services/mail/mail.service', () => ({
  sendPasswordResetEmail: jest.fn(),
  sendPasswordChangedEmail: jest.fn(),
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

import { PasswordResetService } from './password-reset.service';
import { AppError } from '../../middlewares/error';
import prisma from '../../config/db';
import tokenService from '../../services/mail/token.service';
import {
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from '../../services/mail/mail.service';
import * as hashUtils from '../../utils/hash';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedTokenService = tokenService as jest.Mocked<typeof tokenService>;

describe('PasswordResetService', () => {
  let passwordResetService: PasswordResetService;
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
  };

  beforeEach(() => {
    passwordResetService = new PasswordResetService();
    jest.clearAllMocks();
  });

  describe('requestPasswordReset', () => {
    it('should send password reset email successfully', async () => {
      const email = 'test@example.com';

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedTokenService.createToken as jest.Mock).mockResolvedValue(
        'reset-token-123'
      );
      (sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      await passwordResetService.requestPasswordReset(email);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockedTokenService.createToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        type: 'password_reset',
      });
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        email,
        'reset-token-123'
      );
    });

    it('should return silently if user not found (security)', async () => {
      const email = 'nonexistent@example.com';

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await passwordResetService.requestPasswordReset(email);

      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockedTokenService.createToken).not.toHaveBeenCalled();
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should throw error if user is inactive', async () => {
      const email = 'test@example.com';
      const inactiveUser = { ...mockUser, isActive: false };

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(
        inactiveUser
      );

      await expect(
        passwordResetService.requestPasswordReset(email)
      ).rejects.toThrow(AppError);
      await expect(
        passwordResetService.requestPasswordReset(email)
      ).rejects.toThrow('User account is inactive');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const token = 'reset-token-123';
      const newPassword = 'newPassword123';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        userId: 'user-1',
      });
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(hashUtils, 'verifyPassword').mockResolvedValue(false); // New password is different
      jest
        .spyOn(hashUtils, 'hashPassword')
        .mockResolvedValue('$2b$10$newHashedPassword');
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          const tx = {
            user: {
              update: jest.fn().mockResolvedValue({
                ...mockUser,
                passwordHash: '$2b$10$newHashedPassword',
              }),
            },
          };
          await callback(tx);
          return tx;
        }
      );
      (mockedTokenService.markTokenAsUsed as jest.Mock).mockResolvedValue(
        undefined
      );
      (sendPasswordChangedEmail as jest.Mock).mockResolvedValue(undefined);

      await passwordResetService.resetPassword(token, newPassword);

      expect(mockedTokenService.validateToken).toHaveBeenCalledWith(
        token,
        'password_reset'
      );
      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(hashUtils.verifyPassword).toHaveBeenCalledWith(
        newPassword,
        mockUser.passwordHash
      );
      expect(hashUtils.hashPassword).toHaveBeenCalledWith(newPassword);
      expect(mockedPrisma.$transaction).toHaveBeenCalled();
      expect(sendPasswordChangedEmail).toHaveBeenCalledWith(mockUser.email);
    });

    it('should throw error if token is invalid', async () => {
      const token = 'invalid-token';
      const newPassword = 'newPassword123';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      await expect(
        passwordResetService.resetPassword(token, newPassword)
      ).rejects.toThrow(AppError);

      try {
        await passwordResetService.resetPassword(token, newPassword);
      } catch (error: any) {
        expect(error.message).toBe('Invalid token');
      }
    });

    it('should throw error if new password is same as current', async () => {
      const token = 'reset-token-123';
      const newPassword = 'ValidNewPass123';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        userId: 'user-1',
      });
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(hashUtils, 'verifyPassword').mockResolvedValue(true); // Same password

      await expect(
        passwordResetService.resetPassword(token, newPassword)
      ).rejects.toThrow(AppError);
      await expect(
        passwordResetService.resetPassword(token, newPassword)
      ).rejects.toThrow(
        'New password must be different from the current password'
      );
    });

    it('should throw error if user not found', async () => {
      const token = 'reset-token-123';
      const newPassword = 'newPassword123';

      (mockedTokenService.validateToken as jest.Mock).mockResolvedValue({
        valid: true,
        userId: 'non-existent',
      });
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        passwordResetService.resetPassword(token, newPassword)
      ).rejects.toThrow(AppError);
      await expect(
        passwordResetService.resetPassword(token, newPassword)
      ).rejects.toThrow('User not found');
    });
  });
});
