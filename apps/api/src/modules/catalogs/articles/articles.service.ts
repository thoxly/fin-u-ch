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
}

export class ArticlesService {
  async getAll(companyId: string) {
    return prisma.article.findMany({
      where: { companyId, isActive: true },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string, companyId: string) {
    const article = await prisma.article.findFirst({
      where: { id, companyId },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
      },
    });

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    return article;
  }

  async create(companyId: string, data: CreateArticleDTO) {
    validateRequired({ name: data.name, type: data.type });

    if (!['income', 'expense'].includes(data.type)) {
      throw new AppError('Type must be income or expense', 400);
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
      where: { id },
      data,
    });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    // Soft delete
    return prisma.article.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export default new ArticlesService();
