import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';
import { validateRequired } from '../../../utils/validation';

export interface CreateDealDTO {
  name: string;
  amount?: number;
  departmentId?: string;
  counterpartyId?: string;
  description?: string;
}

export class DealsService {
  async getAll(companyId: string) {
    return prisma.deal.findMany({
      where: { companyId },
      include: {
        department: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string, companyId: string) {
    const deal = await prisma.deal.findFirst({
      where: { id, companyId },
      include: {
        department: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
      },
    });

    if (!deal) {
      throw new AppError('Deal not found', 404);
    }

    return deal;
  }

  async create(companyId: string, data: CreateDealDTO) {
    validateRequired({ name: data.name });

    return prisma.deal.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async update(id: string, companyId: string, data: Partial<CreateDealDTO>) {
    await this.getById(id, companyId);

    return prisma.deal.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    return prisma.deal.delete({
      where: { id },
    });
  }
}

export default new DealsService();
