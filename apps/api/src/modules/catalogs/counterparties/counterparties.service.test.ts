// Mock env.ts before importing anything that uses it
jest.mock('../../../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
  },
}));

import { CounterpartiesService } from './counterparties.service';
import { AppError } from '../../../middlewares/error';
import prisma from '../../../config/db';

jest.mock('../../../config/db', () => ({
  __esModule: true,
  default: {
    counterparty: {
      findMany: jest.fn() as jest.Mock,
      findFirst: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
    },
  },
}));

jest.mock('../../../utils/validation', () => ({
  validateRequired: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedPrisma = prisma as any;

describe('CounterpartiesService', () => {
  let counterpartiesService: CounterpartiesService;

  beforeEach(() => {
    counterpartiesService = new CounterpartiesService();
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all counterparties for a company', async () => {
      const companyId = 'company-1';
      const mockCounterparties = [
        { id: 'cp-1', name: 'Counterparty 1', companyId, category: 'supplier' },
      ];

      mockedPrisma.counterparty.findMany.mockResolvedValue(mockCounterparties);

      const result = await counterpartiesService.getAll(companyId);

      expect(result).toEqual(mockCounterparties);
      expect(mockedPrisma.counterparty.findMany).toHaveBeenCalledWith({
        where: { companyId },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getById', () => {
    it('should return counterparty by id', async () => {
      const id = 'cp-1';
      const companyId = 'company-1';
      const mockCounterparty = {
        id,
        name: 'Counterparty 1',
        companyId,
        category: 'supplier',
      };

      mockedPrisma.counterparty.findFirst.mockResolvedValue(mockCounterparty);

      const result = await counterpartiesService.getById(id, companyId);

      expect(result).toEqual(mockCounterparty);
    });

    it('should throw AppError if counterparty not found', async () => {
      const id = 'cp-1';
      const companyId = 'company-1';

      mockedPrisma.counterparty.findFirst.mockResolvedValue(null);

      await expect(
        counterpartiesService.getById(id, companyId)
      ).rejects.toThrow(AppError);
      await expect(
        counterpartiesService.getById(id, companyId)
      ).rejects.toThrow('Counterparty not found');
    });
  });

  describe('create', () => {
    it('should create a new counterparty with valid category', async () => {
      const companyId = 'company-1';
      const data = { name: 'New Counterparty', category: 'supplier' };
      const mockCounterparty = { id: 'cp-1', ...data, companyId };

      mockedPrisma.counterparty.create.mockResolvedValue(mockCounterparty);

      const result = await counterpartiesService.create(companyId, data);

      expect(result).toEqual(mockCounterparty);
      expect(mockedPrisma.counterparty.create).toHaveBeenCalledWith({
        data: { ...data, companyId },
      });
    });

    it('should throw AppError for invalid category', async () => {
      const companyId = 'company-1';
      const data = { name: 'New Counterparty', category: 'invalid' };

      await expect(
        counterpartiesService.create(companyId, data)
      ).rejects.toThrow(AppError);
      await expect(
        counterpartiesService.create(companyId, data)
      ).rejects.toThrow('Invalid category');
    });
  });

  describe('update', () => {
    it('should update counterparty', async () => {
      const id = 'cp-1';
      const companyId = 'company-1';
      const data = { name: 'Updated Counterparty' };
      const existingCounterparty = {
        id,
        name: 'Old Name',
        companyId,
        category: 'supplier',
      };
      const updatedCounterparty = { ...existingCounterparty, ...data };

      mockedPrisma.counterparty.findFirst.mockResolvedValue(
        existingCounterparty
      );
      mockedPrisma.counterparty.update.mockResolvedValue(updatedCounterparty);

      const result = await counterpartiesService.update(id, companyId, data);

      expect(result).toEqual(updatedCounterparty);
      expect(mockedPrisma.counterparty.update).toHaveBeenCalledWith({
        where: { id },
        data,
      });
    });
  });

  describe('delete', () => {
    it('should delete counterparty', async () => {
      const id = 'cp-1';
      const companyId = 'company-1';
      const mockCounterparty = {
        id,
        name: 'Counterparty 1',
        companyId,
        category: 'supplier',
      };

      mockedPrisma.counterparty.findFirst.mockResolvedValue(mockCounterparty);
      mockedPrisma.counterparty.delete.mockResolvedValue(mockCounterparty);

      const result = await counterpartiesService.delete(id, companyId);

      expect(result).toEqual(mockCounterparty);
      expect(mockedPrisma.counterparty.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });
});
