import prisma from '../../../config/db';
import { AppError } from '../../../middlewares/error';
import { validateRequired } from '../../../utils/validation';

export interface CreateArticleDTO {
  name: string;
  parentId?: string;
  type: string;
  activity?: string;
  indicator?: string;
  description?: string;
  counterpartyId?: string;
}

export interface ArticleFilters {
  type?: 'income' | 'expense' | 'transfer';
  activity?: 'operating' | 'investing' | 'financing';
  isActive?: boolean;
}

export class ArticlesService {
  async getAll(companyId: string, filters?: ArticleFilters) {
    const where: any = { companyId };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.activity) {
      where.activity = filters.activity;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.article.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
      } as any,
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string, companyId: string) {
    const article = await prisma.article.findFirst({
      where: { id, companyId },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
      } as any,
    });

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    return article;
  }

  async create(companyId: string, data: CreateArticleDTO) {
    validateRequired({ name: data.name, type: data.type });

    if (!['income', 'expense', 'transfer'].includes(data.type)) {
      throw new AppError('Type must be income, expense, or transfer', 400);
    }

    return prisma.article.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async update(id: string, companyId: string, data: Partial<CreateArticleDTO>) {
    await this.getById(id, companyId);

    return prisma.article.update({
      where: { id, companyId },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    // Soft delete
    return prisma.article.update({
      where: { id, companyId },
      data: { isActive: false },
    });
  }

  async archive(id: string, companyId: string) {
    await this.getById(id, companyId);

    return prisma.article.update({
      where: { id, companyId },
      data: { isActive: false },
    });
  }

  async unarchive(id: string, companyId: string) {
    await this.getById(id, companyId);

    return prisma.article.update({
      where: { id, companyId },
      data: { isActive: true },
    });
  }

  async bulkArchive(companyId: string, ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('ids must be a non-empty array', 400);
    }

    return prisma.article.updateMany({
      where: { companyId, id: { in: ids } },
      data: { isActive: false },
    });
  }
}

export default new ArticlesService();
