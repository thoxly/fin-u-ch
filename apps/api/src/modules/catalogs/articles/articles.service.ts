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
  type?: 'income' | 'expense';
  activity?: 'operating' | 'investing' | 'financing';
  isActive?: boolean;
}

export class ArticlesService {
  /**
   * Валидирует иерархию статей перед созданием/обновлением
   * @param articleId - ID статьи, которую проверяем (null для новой статьи)
   * @param parentId - ID родительской статьи (null для корневой)
   * @param companyId - ID компании
   * @throws AppError если обнаружена проблема
   */
  private async validateArticleHierarchy(
    articleId: string | null,
    parentId: string | null,
    companyId: string
  ): Promise<void> {
    // Если parentId не указан, статья корневая - валидация не нужна
    if (!parentId) {
      return;
    }

    // Проверка: статья не может быть родителем самой себя
    if (articleId && articleId === parentId) {
      throw new AppError('Статья не может быть родителем самой себя', 400);
    }

    // Проверка: parentId должен существовать и принадлежать той же компании
    const parent = await prisma.article.findFirst({
      where: {
        id: parentId,
        companyId,
      },
    });

    if (!parent) {
      throw new AppError(
        'Родительская статья не найдена или принадлежит другой компании',
        404
      );
    }

    // Проверка: родительская статья должна быть активна
    if (!parent.isActive) {
      throw new AppError('Нельзя назначить родителем неактивную статью', 400);
    }

    // Проверка на циклы: нельзя, чтобы родитель был потомком текущей статьи
    // Или чтобы текущая статья была потомком нового родителя (это создаст цикл после изменения)
    if (articleId) {
      const hasCycle = await this.checkForCycle(articleId, parentId, companyId);
      if (hasCycle) {
        throw new AppError('Невозможно создать цикл в иерархии статей', 400);
      }
    }
  }

  /**
   * Проверяет, не создаст ли назначение parentId цикл в иерархии
   * @param articleId - ID статьи, которую перемещаем
   * @param newParentId - ID нового родителя
   * @param companyId - ID компании
   * @returns true если цикл будет создан
   */
  private async checkForCycle(
    articleId: string,
    newParentId: string,
    companyId: string
  ): Promise<boolean> {
    // Получаем текущего родителя перемещаемой статьи
    const currentArticle = await prisma.article.findFirst({
      where: { id: articleId, companyId },
      select: { parentId: true },
    });

    const currentParentId = currentArticle?.parentId;

    // Находим путь от нового родителя до текущего родителя (если он существует)
    // Этот путь нужно исключить из проверки, потому что при перемещении он изменится
    // Например: A → B → C, перемещаем B под C
    // Путь от C до A: C → B → A (но B будет перемещена, поэтому этот путь изменится)
    const excludePath = new Set<string>();
    excludePath.add(articleId); // Всегда исключаем перемещаемую статью

    if (currentParentId && newParentId && currentParentId !== newParentId) {
      // Находим путь от нового родителя до текущего родителя через перемещаемую статью
      // Это путь, который будет изменен при перемещении
      const findPathToCurrentParent = async (
        fromId: string,
        toId: string,
        path: Set<string>
      ): Promise<boolean> => {
        if (fromId === toId) {
          return true;
        }
        if (path.has(fromId)) {
          return false; // Цикл в пути
        }
        path.add(fromId);

        // Находим родителя текущей статьи
        const article = await prisma.article.findFirst({
          where: { id: fromId, companyId },
          select: { parentId: true },
        });

        if (article?.parentId) {
          return await findPathToCurrentParent(article.parentId, toId, path);
        }
        return false;
      };

      // Находим путь от нового родителя до текущего родителя
      await findPathToCurrentParent(newParentId, currentParentId, excludePath);
    }

    // Проверяем, является ли новый родитель потомком перемещаемой статьи
    // Исключаем из проверки путь, который изменится при перемещении
    const visited = new Set<string>();
    const maxDepth = 10;

    const checkDescendants = async (
      currentId: string,
      targetId: string,
      excludePath: Set<string>,
      depth: number
    ): Promise<boolean> => {
      if (depth > maxDepth) {
        return false;
      }

      if (visited.has(currentId)) {
        return false;
      }
      visited.add(currentId);

      // Пропускаем статьи из исключаемого пути
      if (excludePath.has(currentId)) {
        return false;
      }

      // Находим все дочерние статьи
      const children = await prisma.article.findMany({
        where: {
          parentId: currentId,
          companyId,
        },
        select: { id: true },
      });

      for (const child of children) {
        // Пропускаем перемещаемую статью и статьи из исключаемого пути
        if (excludePath.has(child.id)) {
          continue;
        }

        if (child.id === targetId) {
          return true; // Цикл будет создан!
        }

        const hasCycle = await checkDescendants(
          child.id,
          targetId,
          excludePath,
          depth + 1
        );
        if (hasCycle) {
          return true;
        }
      }

      return false;
    };

    const hasCycle = await checkDescendants(
      articleId,
      newParentId,
      excludePath,
      0
    );
    return hasCycle;
  }

  /**
   * Получает все статьи в виде дерева (иерархическая структура)
   * @param companyId - ID компании
   * @param filters - Фильтры для статей
   * @returns Массив корневых статей с вложенными children
   */
  async getTree(companyId: string, filters?: ArticleFilters) {
    const where: {
      companyId: string;
      type?: string;
      activity?: string;
      isActive?: boolean;
    } = { companyId };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.activity) {
      where.activity = filters.activity;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Получаем все статьи одним запросом
    const allArticles = await prisma.article.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Преобразуем плоский список в дерево
    return this.buildTree(allArticles);
  }

  /**
   * Проверяет, является ли статья листовой (не имеет дочерних статей)
   * @param articleId - ID статьи для проверки
   * @param companyId - ID компании
   * @returns true если статья листовая (не имеет дочерних), false если родительская
   */
  async isLeafArticle(articleId: string, companyId: string): Promise<boolean> {
    const childrenCount = await prisma.article.count({
      where: {
        parentId: articleId,
        companyId,
        isActive: true, // Учитываем только активные дочерние статьи
      },
    });

    return childrenCount === 0;
  }

  /**
   * Получает все ID потомков статьи (рекурсивно)
   * @param articleId - ID родительской статьи
   * @param companyId - ID компании
   * @returns Массив ID всех потомков (включая вложенные)
   */
  async getDescendantIds(
    articleId: string,
    companyId: string
  ): Promise<string[]> {
    const descendants: string[] = [];

    const collectChildren = async (parentId: string) => {
      const children = await prisma.article.findMany({
        where: {
          parentId,
          companyId,
        },
        select: { id: true },
      });

      for (const child of children) {
        descendants.push(child.id);
        // Рекурсивно собираем потомков
        await collectChildren(child.id);
      }
    };

    await collectChildren(articleId);
    return descendants;
  }

  /**
   * Преобразует плоский список статей в дерево
   * @param articles - Плоский список статей
   * @returns Массив корневых статей с вложенными children
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildTree(articles: any[]): any[] {
    // Создаем Map для быстрого доступа к статьям по ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const articleMap = new Map<string, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rootArticles: any[] = [];

    // Первый проход: создаем копии статей с пустыми массивами children
    articles.forEach((article) => {
      articleMap.set(article.id, {
        ...article,
        children: [],
      });
    });

    // Второй проход: строим дерево
    articles.forEach((article) => {
      const articleWithChildren = articleMap.get(article.id)!;

      if (article.parentId) {
        // Если есть родитель, добавляем в его children
        const parent = articleMap.get(article.parentId);
        if (parent) {
          parent.children.push(articleWithChildren);
        } else {
          // Если родитель не найден (возможно, отфильтрован), делаем корневой
          rootArticles.push(articleWithChildren);
        }
      } else {
        // Если нет родителя, это корневая статья
        rootArticles.push(articleWithChildren);
      }
    });

    // Сортируем корневые статьи и рекурсивно сортируем детей
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortTree = (nodes: any[]): any[] => {
      return nodes
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((node) => ({
          ...node,
          children: sortTree(node.children),
        }));
    };

    return sortTree(rootArticles);
  }

  async getAll(companyId: string, filters?: ArticleFilters) {
    const where: {
      companyId: string;
      type?: string;
      activity?: string;
      isActive?: boolean;
    } = { companyId };

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

    if (!['income', 'expense'].includes(data.type)) {
      throw new AppError('Type must be income or expense', 400);
    }

    // Валидация иерархии
    await this.validateArticleHierarchy(
      null, // Новая статья, articleId еще нет
      data.parentId || null,
      companyId
    );

    return prisma.article.create({
      data: {
        ...data,
        companyId,
      },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
      } as any,
    });
  }

  async update(id: string, companyId: string, data: Partial<CreateArticleDTO>) {
    // Получаем текущую статью для проверки
    const currentArticle = await this.getById(id, companyId);

    // Подготавливаем данные для обновления
    const updateData: Partial<CreateArticleDTO> = { ...data };

    // Если пытаются изменить parentId, валидируем новую иерархию
    if (data.parentId !== undefined) {
      const newParentId = data.parentId || null;

      // Если parentId не изменился, валидация не нужна
      if (currentArticle.parentId !== newParentId) {
        await this.validateArticleHierarchy(
          id, // ID редактируемой статьи
          newParentId,
          companyId
        );
      }

      // Явно устанавливаем parentId (может быть null для корневой статьи)
      updateData.parentId = newParentId === null ? undefined : newParentId;
    }

    return prisma.article.update({
      where: { id, companyId },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        counterparty: { select: { id: true, name: true } },
      } as any,
    });
  }

  async delete(id: string, companyId: string) {
    await this.getById(id, companyId);

    // Если у статьи есть дочерние статьи, делаем их корневыми (parentId = null)
    // Используем рекурсивный подход для обработки всех уровней вложенности
    const makeChildrenRoot = async (parentId: string) => {
      const children = await prisma.article.findMany({
        where: { parentId, companyId },
        select: { id: true },
      });

      if (children.length > 0) {
        // Сначала рекурсивно обрабатываем всех потомков (делаем их корневыми)
        for (const child of children) {
          await makeChildrenRoot(child.id);
        }

        // Затем обновляем прямых детей, делая их корневыми
        await prisma.article.updateMany({
          where: { parentId, companyId },
          data: { parentId: null },
        });
      }
    };

    // Обрабатываем все дочерние статьи (все уровни вложенности)
    await makeChildrenRoot(id);

    // Soft delete самой статьи
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
