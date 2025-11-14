import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';
import { validateRequired } from '../../../utils/validation';

export interface CreateCounterpartyDTO {
  name: string;
  inn?: string;
  category: string;
  description?: string;
}

export class CounterpartiesService {
  async getAll(companyId: string) {
    return prisma.counterparty.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string, companyId: string) {
    const counterparty = await prisma.counterparty.findFirst({
      where: { id, companyId },
    });

    if (!counterparty) {
      throw new AppError('Counterparty not found', 404);
    }

    return counterparty;
  }

  async create(companyId: string, data: CreateCounterpartyDTO) {
    validateRequired({ name: data.name, category: data.category });

    const validCategories = [
      'supplier',
      'customer',
      'gov',
      'employee',
      'other',
    ];
    if (!validCategories.includes(data.category)) {
      throw new AppError('Invalid category', 400);
    }

    return prisma.counterparty.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<CreateCounterpartyDTO>
  ) {
    await this.getById(id, companyId);

    return prisma.counterparty.update({
      where: { id, companyId },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    return prisma.counterparty.delete({
      where: { id, companyId },
    });
  }
}

export default new CounterpartiesService();
