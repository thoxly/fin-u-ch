import type { Article } from '@shared/types/catalogs';
import type { ArticleTreeNode } from '../types/articleTree';

/**
 * Преобразует плоский список статей в дерево
 * @param articles - Плоский массив статей
 * @returns Массив корневых статей с вложенными children
 */
export function buildArticleTree(articles: Article[]): ArticleTreeNode[] {
  if (!articles || articles.length === 0) {
    return [];
  }

  // Создаем Map для быстрого доступа к статьям по ID
  const articleMap = new Map<string, ArticleTreeNode>();
  const rootArticles: ArticleTreeNode[] = [];

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
  const sortTree = (nodes: ArticleTreeNode[]): ArticleTreeNode[] => {
    return nodes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((node) => ({
        ...node,
        children: sortTree(node.children),
      }));
  };

  return sortTree(rootArticles);
}

/**
 * Проверяет, является ли статья листом (не имеет дочерних статей)
 * @param article - Статья для проверки
 * @param allArticles - Полный список статей для проверки наличия детей (если children не заполнено)
 * @returns true если статья является листом
 */
export function isLeafArticle(
  article: Article,
  allArticles?: Article[]
): boolean {
  // Если в статье уже есть поле children, проверяем его
  if ('children' in article && Array.isArray(article.children)) {
    return article.children.length === 0;
  }

  // Если children нет, проверяем по полному списку статей
  if (allArticles) {
    return !allArticles.some((a) => a.parentId === article.id);
  }

  // Если нет данных для проверки, считаем листом по умолчанию
  return true;
}

/**
 * Возвращает только листья (статьи без дочерних) из плоского списка
 * @param articles - Плоский массив статей
 * @returns Массив только листьев
 */
export function getLeafArticles(articles: Article[]): Article[] {
  if (!articles || articles.length === 0) {
    return [];
  }

  // Создаем Set ID статей, которые имеют детей
  const parentIds = new Set<string>();
  articles.forEach((article) => {
    if (article.parentId) {
      parentIds.add(article.parentId);
    }
  });

  // Возвращаем только те статьи, которые не являются родителями
  return articles.filter((article) => !parentIds.has(article.id));
}

/**
 * Находит статью в дереве по ID
 * @param tree - Дерево статей
 * @param id - ID искомой статьи
 * @returns Найденная статья или null
 */
export function findArticleInTree(
  tree: ArticleTreeNode[],
  id: string
): ArticleTreeNode | null {
  for (const node of tree) {
    if (node.id === id) {
      return node;
    }

    if (node.children && node.children.length > 0) {
      const found = findArticleInTree(node.children, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Преобразует дерево обратно в плоский список
 * @param tree - Дерево статей
 * @returns Плоский массив статей
 */
export function flattenTree(tree: ArticleTreeNode[]): Article[] {
  const result: Article[] = [];

  const traverse = (nodes: ArticleTreeNode[]) => {
    for (const node of nodes) {
      // Создаем копию без children для плоского списка
      const { children, ...article } = node;
      result.push(article);

      if (children && children.length > 0) {
        traverse(children);
      }
    }
  };

  traverse(tree);
  return result;
}

/**
 * Получает все ID потомков статьи (рекурсивно)
 * @param tree - Дерево статей
 * @param articleId - ID статьи
 * @returns Массив ID всех потомков
 */
export function getDescendantIds(
  tree: ArticleTreeNode[],
  articleId: string
): string[] {
  const descendants: string[] = [];

  const findAndCollect = (nodes: ArticleTreeNode[]): boolean => {
    for (const node of nodes) {
      if (node.id === articleId) {
        // Нашли статью, собираем всех потомков
        const collectChildren = (children: ArticleTreeNode[]) => {
          for (const child of children) {
            descendants.push(child.id);
            if (child.children && child.children.length > 0) {
              collectChildren(child.children);
            }
          }
        };
        if (node.children && node.children.length > 0) {
          collectChildren(node.children);
        }
        return true;
      }
      if (node.children && node.children.length > 0) {
        if (findAndCollect(node.children)) {
          return true;
        }
      }
    }
    return false;
  };

  findAndCollect(tree);
  return descendants;
}

/**
 * Проверяет, не создаст ли назначение нового родителя цикл
 * @param tree - Дерево статей
 * @param articleId - ID статьи, которую перемещаем
 * @param newParentId - ID нового родителя
 * @returns true если цикл будет создан
 */
export function wouldCreateCycle(
  tree: ArticleTreeNode[],
  articleId: string,
  newParentId: string
): boolean {
  // Статья не может быть родителем самой себя
  if (articleId === newParentId) {
    return true;
  }

  // Получаем всех потомков статьи, которую перемещаем
  const descendants = getDescendantIds(tree, articleId);

  // Если новый родитель является потомком перемещаемой статьи, будет цикл
  return descendants.includes(newParentId);
}
