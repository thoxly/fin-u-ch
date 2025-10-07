import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';
import { validateRequired } from '../../../utils/validation';

export interface CreateDepartmentDTO {
  name: string;
  description?: string;
}

export class DepartmentsService {
  async getAll(companyId: string) {
    return prisma.department.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string, companyId: string) {
    const department = await prisma.department.findFirst({
      where: { id, companyId },
    });

    if (!department) {
      throw new AppError('Department not found', 404);
    }

    return department;
  }

  async create(companyId: string, data: CreateDepartmentDTO) {
    validateRequired({ name: data.name });

    return prisma.department.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async update(id: string, companyId: string, data: Partial<CreateDepartmentDTO>) {
    await this.getById(id, companyId);

    return prisma.department.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    return prisma.department.delete({
      where: { id },
    });
  }
}

export default new DepartmentsService();

