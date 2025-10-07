import prisma from '../../config/db';
import { AppError } from '../../middlewares/error';

export class CompaniesService {
  async get(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        currencyBase: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    return company;
  }

  async update(companyId: string, data: { name?: string; currencyBase?: string }) {
    return prisma.company.update({
      where: { id: companyId },
      data,
      select: {
        id: true,
        name: true,
        currencyBase: true,
        updatedAt: true,
      },
    });
  }
}

export default new CompaniesService();

