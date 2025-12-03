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

import { CompaniesService } from './companies.service';
import { AppError } from '../../middlewares/error';
import prisma from '../../config/db';

// Mock dependencies
jest.mock('../../config/db', () => ({
  __esModule: true,
  default: {
    company: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('CompaniesService', () => {
  let companiesService: CompaniesService;
  const mockCompanyId = 'company-1';

  beforeEach(() => {
    companiesService = new CompaniesService();
    jest.clearAllMocks();
  });

  describe('update', () => {
    const mockCompany = {
      id: mockCompanyId,
      name: 'Test Company',
      currencyBase: 'RUB',
      updatedAt: new Date(),
    };

    it('should successfully update company', async () => {
      const updateData = {
        name: 'Updated Company Name',
        currencyBase: 'USD',
      };

      (prisma.company.update as jest.Mock).mockResolvedValue({
        ...mockCompany,
        ...updateData,
      });

      const result = await companiesService.update(mockCompanyId, updateData);

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: mockCompanyId },
        data: updateData,
        select: expect.objectContaining({
          id: true,
          name: true,
          currencyBase: true,
          updatedAt: true,
        }),
      });
      expect(result.name).toBe(updateData.name);
      expect(result.currencyBase).toBe(updateData.currencyBase);
    });

    it('should allow partial updates - name only', async () => {
      const updateData = {
        name: 'New Company Name',
      };

      (prisma.company.update as jest.Mock).mockResolvedValue({
        ...mockCompany,
        name: updateData.name,
      });

      const result = await companiesService.update(mockCompanyId, updateData);

      expect(result.name).toBe(updateData.name);
    });

    it('should allow partial updates - currencyBase only', async () => {
      const updateData = {
        currencyBase: 'EUR',
      };

      (prisma.company.update as jest.Mock).mockResolvedValue({
        ...mockCompany,
        currencyBase: updateData.currencyBase,
      });

      const result = await companiesService.update(mockCompanyId, updateData);

      expect(result.currencyBase).toBe(updateData.currencyBase);
    });

    it('should handle empty update data', async () => {
      (prisma.company.update as jest.Mock).mockResolvedValue(mockCompany);

      const result = await companiesService.update(mockCompanyId, {});

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: mockCompanyId },
        data: {},
        select: expect.any(Object),
      });
      expect(result).toEqual(mockCompany);
    });
  });

  describe('get', () => {
    it('should successfully get company', async () => {
      const mockCompany = {
        id: mockCompanyId,
        name: 'Test Company',
        currencyBase: 'RUB',
        uiSettings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.company.findUnique as jest.Mock).mockResolvedValue(mockCompany);

      const result = await companiesService.get(mockCompanyId);

      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: mockCompanyId },
        select: expect.objectContaining({
          id: true,
          name: true,
          currencyBase: true,
          uiSettings: true,
          createdAt: true,
          updatedAt: true,
        }),
      });
      expect(result).toEqual(mockCompany);
    });

    it('should throw error if company not found', async () => {
      (prisma.company.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(companiesService.get(mockCompanyId)).rejects.toThrow(
        AppError
      );
      await expect(companiesService.get(mockCompanyId)).rejects.toThrow(
        'Company not found'
      );
    });
  });

  describe('updateUiSettings', () => {
    it('should successfully update UI settings', async () => {
      const mockSettings = {
        theme: 'dark',
        sidebarCollapsed: true,
      };

      (prisma.company.update as jest.Mock).mockResolvedValue({
        uiSettings: mockSettings,
        updatedAt: new Date(),
      });

      const result = await companiesService.updateUiSettings(
        mockCompanyId,
        mockSettings
      );

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: mockCompanyId },
        data: { uiSettings: mockSettings },
        select: expect.objectContaining({
          uiSettings: true,
          updatedAt: true,
        }),
      });
      expect(result).toEqual(mockSettings);
    });

    it('should handle empty UI settings', async () => {
      (prisma.company.update as jest.Mock).mockResolvedValue({
        uiSettings: {},
        updatedAt: new Date(),
      });

      const result = await companiesService.updateUiSettings(mockCompanyId, {});

      expect(result).toEqual({});
    });
  });
});
