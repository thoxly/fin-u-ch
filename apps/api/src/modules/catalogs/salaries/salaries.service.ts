import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';
import { validateRequired } from '../../../utils/validation';

export interface CreateSalaryDTO {
  employeeCounterpartyId: string;
  departmentId?: string;
  baseWage: number;
  contributionsPct?: number;
  incomeTaxPct?: number;
  periodicity?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export class SalariesService {
  async getAll(companyId: string) {
    return prisma.salary.findMany({
      where: { companyId },
      include: {
        employeeCounterparty: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async getById(id: string, companyId: string) {
    const salary = await prisma.salary.findFirst({
      where: { id, companyId },
      include: {
        employeeCounterparty: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!salary) {
      throw new AppError('Salary not found', 404);
    }

    return salary;
  }

  async create(companyId: string, data: CreateSalaryDTO) {
    validateRequired({
      employeeCounterpartyId: data.employeeCounterpartyId,
      baseWage: data.baseWage,
      effectiveFrom: data.effectiveFrom,
    });

    return prisma.salary.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async update(id: string, companyId: string, data: Partial<CreateSalaryDTO>) {
    await this.getById(id, companyId);

    return prisma.salary.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    return prisma.salary.delete({
      where: { id },
    });
  }
}

export default new SalariesService();

