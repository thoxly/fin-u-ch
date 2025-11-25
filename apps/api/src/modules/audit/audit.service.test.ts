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
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../../config/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import auditLogService from './audit.service';
import { LogActionParams, GetLogsParams } from './audit.service';

describe('AuditLogService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logAction', () => {
    it('should create audit log successfully', async () => {
      const params: LogActionParams = {
        userId: 'user-1',
        companyId: 'company-1',
        action: 'create',
        entity: 'operation',
        entityId: 'op-1',
      };

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-1',
        ...params,
        createdAt: new Date(),
      });

      await auditLogService.logAction(params);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          companyId: params.companyId,
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
        },
      });
    });

    it('should handle errors gracefully without throwing', async () => {
      const params: LogActionParams = {
        userId: 'user-1',
        companyId: 'company-1',
        action: 'create',
        entity: 'operation',
        entityId: 'op-1',
      };

      const error = new Error('Database error');
      mockPrisma.auditLog.create.mockRejectedValue(error);

      // Should not throw
      await expect(auditLogService.logAction(params)).resolves.not.toThrow();

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should accept optional changes and metadata', async () => {
      const params: LogActionParams = {
        userId: 'user-1',
        companyId: 'company-1',
        action: 'update',
        entity: 'operation',
        entityId: 'op-1',
        changes: {
          old: { amount: 100 },
          new: { amount: 200 },
        },
        metadata: {
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        },
      };

      mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-1',
        ...params,
        createdAt: new Date(),
      });

      await auditLogService.logAction(params);

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('getLogs', () => {
    it('should return logs with default pagination', async () => {
      const params: GetLogsParams = {
        companyId: 'company-1',
      };

      const mockLogs = [
        {
          id: 'log-1',
          companyId: 'company-1',
          userId: 'user-1',
          action: 'create',
          entity: 'operation',
          entityId: 'op-1',
          createdAt: new Date(),
          user: {
            id: 'user-1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
          },
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await auditLogService.getLogs(params);

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        limit: 100,
        offset: 0,
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
        skip: 0,
      });
    });

    it('should filter by userId when provided', async () => {
      const params: GetLogsParams = {
        companyId: 'company-1',
        userId: 'user-1',
      };

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await auditLogService.getLogs(params);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: 'company-1',
            userId: 'user-1',
          },
        })
      );
    });

    it('should filter by entity and entityId when provided', async () => {
      const params: GetLogsParams = {
        companyId: 'company-1',
        entity: 'operation',
        entityId: 'op-1',
      };

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await auditLogService.getLogs(params);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: 'company-1',
            entity: 'operation',
            entityId: 'op-1',
          },
        })
      );
    });

    it('should filter by action when provided', async () => {
      const params: GetLogsParams = {
        companyId: 'company-1',
        action: 'create',
      };

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await auditLogService.getLogs(params);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: 'company-1',
            action: 'create',
          },
        })
      );
    });

    it('should filter by date range when provided', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      const params: GetLogsParams = {
        companyId: 'company-1',
        dateFrom,
        dateTo,
      };

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await auditLogService.getLogs(params);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: 'company-1',
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
        })
      );
    });

    it('should use custom limit and offset when provided', async () => {
      const params: GetLogsParams = {
        companyId: 'company-1',
        limit: 50,
        offset: 10,
      };

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const result = await auditLogService.getLogs(params);

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 10,
        })
      );
    });
  });

  describe('getEntityLogs', () => {
    it('should call getLogs with entity and entityId', async () => {
      const companyId = 'company-1';
      const entity = 'operation';
      const entityId = 'op-1';

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await auditLogService.getEntityLogs(companyId, entity, entityId);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId,
            entity,
            entityId,
          },
        })
      );
    });
  });

  describe('getUserLogs', () => {
    it('should call getLogs with userId and default limit', async () => {
      const companyId = 'company-1';
      const userId = 'user-1';

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await auditLogService.getUserLogs(companyId, userId);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId,
            userId,
          },
          take: 100,
        })
      );
    });

    it('should use custom limit when provided', async () => {
      const companyId = 'company-1';
      const userId = 'user-1';
      const limit = 50;

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await auditLogService.getUserLogs(companyId, userId, limit);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId,
            userId,
          },
          take: 50,
        })
      );
    });
  });
});
