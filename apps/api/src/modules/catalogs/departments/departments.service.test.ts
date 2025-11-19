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

import { DepartmentsService } from './departments.service';
import { AppError } from '../../../middlewares/error';
import prisma from '../../../config/db';

jest.mock('../../../config/db', () => ({
  __esModule: true,
  default: {
    department: {
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

const mockedPrisma = prisma as any;

describe('DepartmentsService', () => {
  let departmentsService: DepartmentsService;

  beforeEach(() => {
    departmentsService = new DepartmentsService();
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all departments for a company', async () => {
      const companyId = 'company-1';
      const mockDepartments = [
        { id: 'dept-1', name: 'Department 1', companyId },
        { id: 'dept-2', name: 'Department 2', companyId },
      ];

      mockedPrisma.department.findMany.mockResolvedValue(mockDepartments);

      const result = await departmentsService.getAll(companyId);

      expect(result).toEqual(mockDepartments);
      expect(mockedPrisma.department.findMany).toHaveBeenCalledWith({
        where: { companyId },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getById', () => {
    it('should return department by id', async () => {
      const id = 'dept-1';
      const companyId = 'company-1';
      const mockDepartment = { id, name: 'Department 1', companyId };

      mockedPrisma.department.findFirst.mockResolvedValue(mockDepartment);

      const result = await departmentsService.getById(id, companyId);

      expect(result).toEqual(mockDepartment);
      expect(mockedPrisma.department.findFirst).toHaveBeenCalledWith({
        where: { id, companyId },
      });
    });

    it('should throw AppError if department not found', async () => {
      const id = 'dept-1';
      const companyId = 'company-1';

      mockedPrisma.department.findFirst.mockResolvedValue(null);

      await expect(departmentsService.getById(id, companyId)).rejects.toThrow(
        AppError
      );
      await expect(departmentsService.getById(id, companyId)).rejects.toThrow(
        'Department not found'
      );
    });
  });

  describe('create', () => {
    it('should create a new department', async () => {
      const companyId = 'company-1';
      const data = { name: 'New Department', description: 'Description' };
      const mockDepartment = { id: 'dept-1', ...data, companyId };

      mockedPrisma.department.create.mockResolvedValue(mockDepartment);

      const result = await departmentsService.create(companyId, data);

      expect(result).toEqual(mockDepartment);
      expect(mockedPrisma.department.create).toHaveBeenCalledWith({
        data: { ...data, companyId },
      });
    });
  });

  describe('update', () => {
    it('should update department', async () => {
      const id = 'dept-1';
      const companyId = 'company-1';
      const data = { name: 'Updated Department' };
      const existingDepartment = { id, name: 'Old Name', companyId };
      const updatedDepartment = { ...existingDepartment, ...data };

      mockedPrisma.department.findFirst.mockResolvedValue(existingDepartment);
      mockedPrisma.department.update.mockResolvedValue(updatedDepartment);

      const result = await departmentsService.update(id, companyId, data);

      expect(result).toEqual(updatedDepartment);
      expect(mockedPrisma.department.update).toHaveBeenCalledWith({
        where: { id },
        data,
      });
    });
  });

  describe('delete', () => {
    it('should delete department', async () => {
      const id = 'dept-1';
      const companyId = 'company-1';
      const mockDepartment = { id, name: 'Department 1', companyId };

      mockedPrisma.department.findFirst.mockResolvedValue(mockDepartment);
      mockedPrisma.department.delete.mockResolvedValue(mockDepartment);

      const result = await departmentsService.delete(id, companyId);

      expect(result).toEqual(mockDepartment);
      expect(mockedPrisma.department.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });
});
