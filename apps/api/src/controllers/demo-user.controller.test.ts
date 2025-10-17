import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DemoUserController } from './demo-user.controller';
import { DemoUserService } from '../services/demo-user.service';

// Mock DemoUserService
jest.mock('../services/demo-user.service');

// Mock logger
jest.mock('../config/logger', () => ({
  error: jest.fn(),
}));

describe('DemoUserController', () => {
  let controller: DemoUserController;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockDemoUserService: jest.Mocked<DemoUserService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {} as unknown as jest.Mocked<PrismaClient>;
    mockDemoUserService = {
      getCredentials: jest.fn(),
      exists: jest.fn(),
      getInfo: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<DemoUserService>;

    // Mock DemoUserService constructor
    (DemoUserService as unknown as jest.Mock).mockImplementation(
      () => mockDemoUserService
    );

    controller = new DemoUserController(mockPrisma);

    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getCredentials', () => {
    it('should return demo credentials', async () => {
      const mockCredentials = {
        email: 'demo@example.com',
        password: 'demo123',
        companyName: 'Демо Компания ООО',
      };

      mockDemoUserService.getCredentials.mockReturnValue(mockCredentials);

      await controller.getCredentials(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockDemoUserService.getCredentials).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCredentials,
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      mockDemoUserService.getCredentials.mockImplementation(() => {
        throw error;
      });

      await controller.getCredentials(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get demo credentials',
      });
    });
  });

  describe('getInfo', () => {
    it('should return demo user info when user exists', async () => {
      const mockInfo = {
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
      };

      mockDemoUserService.getInfo.mockResolvedValue(mockInfo);

      await controller.getInfo(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockDemoUserService.getInfo).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockInfo,
      });
    });

    it('should return 404 when user does not exist', async () => {
      mockDemoUserService.getInfo.mockResolvedValue(null);

      await controller.getInfo(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Demo user not found',
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      mockDemoUserService.getInfo.mockRejectedValue(error);

      await controller.getInfo(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get demo user info',
      });
    });
  });

  describe('checkExists', () => {
    it('should return existence status', async () => {
      mockDemoUserService.exists.mockResolvedValue(true);

      await controller.checkExists(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockDemoUserService.exists).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        exists: true,
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      mockDemoUserService.exists.mockRejectedValue(error);

      await controller.checkExists(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to check demo user existence',
      });
    });
  });

  describe('create', () => {
    it('should create demo user', async () => {
      const mockDemoUserData = {
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
      };

      mockDemoUserService.create.mockResolvedValue(mockDemoUserData);

      await controller.create(mockRequest as Request, mockResponse as Response);

      expect(mockDemoUserService.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDemoUserData,
        message: 'Demo user created successfully',
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      mockDemoUserService.create.mockRejectedValue(error);

      await controller.create(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to create demo user',
      });
    });
  });

  describe('delete', () => {
    it('should delete demo user', async () => {
      mockDemoUserService.delete.mockResolvedValue();

      await controller.delete(mockRequest as Request, mockResponse as Response);

      expect(mockDemoUserService.delete).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Demo user deleted successfully',
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      mockDemoUserService.delete.mockRejectedValue(error);

      await controller.delete(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to delete demo user',
      });
    });
  });
});
