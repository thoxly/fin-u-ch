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

// Mock logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock Prisma
const mockPrisma = {
  emailToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import tokenService from './token.service';
import { CreateTokenOptions, TokenType } from './token.service';

describe('TokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createToken', () => {
    it('should create token with default expiry for email_verification', async () => {
      const options: CreateTokenOptions = {
        userId: 'user-1',
        type: 'email_verification',
      };

      mockPrisma.emailToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.emailToken.create.mockResolvedValue({
        id: 'token-1',
        userId: options.userId,
        token: 'test-token',
        type: options.type,
        expiresAt: new Date(),
        used: false,
      });

      const token = await tokenService.createToken(options);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(mockPrisma.emailToken.create).toHaveBeenCalled();
    });

    it('should invalidate previous unused tokens of same type', async () => {
      const options: CreateTokenOptions = {
        userId: 'user-1',
        type: 'password_reset',
      };

      mockPrisma.emailToken.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.emailToken.create.mockResolvedValue({
        id: 'token-1',
        userId: options.userId,
        token: 'test-token',
        type: options.type,
        expiresAt: new Date(),
        used: false,
      });

      await tokenService.createToken(options);

      expect(mockPrisma.emailToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: options.userId,
          type: options.type,
          used: false,
        },
        data: {
          used: true,
        },
      });
    });

    it('should use custom expiry when provided', async () => {
      const options: CreateTokenOptions = {
        userId: 'user-1',
        type: 'email_verification',
        expiresInMinutes: 60,
      };

      mockPrisma.emailToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.emailToken.create.mockResolvedValue({
        id: 'token-1',
        userId: options.userId,
        token: 'test-token',
        type: options.type,
        expiresAt: new Date(),
        used: false,
      });

      await tokenService.createToken(options);

      const createCall = mockPrisma.emailToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;
      const now = Date.now();
      const expectedExpiry = now + 60 * 60 * 1000; // 60 minutes

      expect(expiresAt.getTime()).toBeCloseTo(expectedExpiry, -3);
    });

    it('should save metadata when provided', async () => {
      const options: CreateTokenOptions = {
        userId: 'user-1',
        type: 'email_change_new',
        metadata: { newEmail: 'new@example.com' },
      };

      mockPrisma.emailToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.emailToken.create.mockResolvedValue({
        id: 'token-1',
        userId: options.userId,
        token: 'test-token',
        type: options.type,
        expiresAt: new Date(),
        used: false,
        metadata: options.metadata,
      });

      await tokenService.createToken(options);

      expect(mockPrisma.emailToken.create).toHaveBeenCalledWith({
        data: {
          userId: options.userId,
          token: expect.any(String),
          type: options.type,
          expiresAt: expect.any(Date),
          metadata: options.metadata,
        },
      });
    });
  });

  describe('validateToken', () => {
    it('should return valid=true for valid token', async () => {
      const token = 'valid-token';
      const type: TokenType = 'email_verification';
      const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

      mockPrisma.emailToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        token,
        type,
        expiresAt: futureDate,
        used: false,
        user: {
          id: 'user-1',
          isActive: true,
        },
        metadata: null,
      });

      const result = await tokenService.validateToken(token, type);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-1');
      expect(result.error).toBeUndefined();
    });

    it('should return valid=false when token not found', async () => {
      const token = 'non-existent-token';
      const type: TokenType = 'email_verification';

      mockPrisma.emailToken.findUnique.mockResolvedValue(null);

      const result = await tokenService.validateToken(token, type);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token not found');
      expect(result.userId).toBeUndefined();
    });

    it('should return valid=false when token type mismatch', async () => {
      const token = 'valid-token';
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);

      mockPrisma.emailToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        token,
        type: 'password_reset',
        expiresAt: futureDate,
        used: false,
        user: {
          id: 'user-1',
          isActive: true,
        },
        metadata: null,
      });

      const result = await tokenService.validateToken(
        token,
        'email_verification'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token type');
    });

    it('should return valid=false when token already used', async () => {
      const token = 'used-token';
      const type: TokenType = 'email_verification';
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);

      mockPrisma.emailToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        token,
        type,
        expiresAt: futureDate,
        used: true,
        user: {
          id: 'user-1',
          isActive: true,
        },
        metadata: null,
      });

      const result = await tokenService.validateToken(token, type);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token already used');
    });

    it('should return valid=false when token expired', async () => {
      const token = 'expired-token';
      const type: TokenType = 'email_verification';
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago

      mockPrisma.emailToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        token,
        type,
        expiresAt: pastDate,
        used: false,
        user: {
          id: 'user-1',
          isActive: true,
        },
        metadata: null,
      });

      const result = await tokenService.validateToken(token, type);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });

    it('should return valid=false when user is inactive', async () => {
      const token = 'valid-token';
      const type: TokenType = 'email_verification';
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);

      mockPrisma.emailToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        token,
        type,
        expiresAt: futureDate,
        used: false,
        user: {
          id: 'user-1',
          isActive: false,
        },
        metadata: null,
      });

      const result = await tokenService.validateToken(token, type);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('User account is inactive');
    });

    it('should return metadata when token is valid and has metadata', async () => {
      const token = 'valid-token';
      const type: TokenType = 'email_change_new';
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      const metadata = { newEmail: 'new@example.com' };

      mockPrisma.emailToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        token,
        type,
        expiresAt: futureDate,
        used: false,
        user: {
          id: 'user-1',
          isActive: true,
        },
        metadata,
      });

      const result = await tokenService.validateToken(token, type);

      expect(result.valid).toBe(true);
      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('markTokenAsUsed', () => {
    it('should mark token as used', async () => {
      const token = 'test-token';

      mockPrisma.emailToken.update.mockResolvedValue({
        id: 'token-1',
        token,
        used: true,
      });

      await tokenService.markTokenAsUsed(token);

      expect(mockPrisma.emailToken.update).toHaveBeenCalledWith({
        where: { token },
        data: { used: true },
      });
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens and return count', async () => {
      mockPrisma.emailToken.deleteMany.mockResolvedValue({ count: 5 });

      const count = await tokenService.cleanupExpiredTokens();

      expect(count).toBe(5);
      expect(mockPrisma.emailToken.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should return 0 when no expired tokens', async () => {
      mockPrisma.emailToken.deleteMany.mockResolvedValue({ count: 0 });

      const count = await tokenService.cleanupExpiredTokens();

      expect(count).toBe(0);
    });
  });
});
