import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';
import { validateRequired } from '../../../utils/validation';

export interface CreateAccountDTO {
  name: string;
  number?: string;
  currency?: string;
  openingBalance?: number;
  excludeFromTotals?: boolean;
}

export class AccountsService {
  async getAll(companyId: string) {
    return prisma.account.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string, companyId: string) {
    const account = await prisma.account.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      throw new AppError('Account not found', 404);
    }

    return account;
  }

  async create(companyId: string, data: CreateAccountDTO) {
    validateRequired({ name: data.name });

    return prisma.account.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async update(id: string, companyId: string, data: Partial<CreateAccountDTO>) {
    await this.getById(id, companyId);

    return prisma.account.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    return prisma.account.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export default new AccountsService();

