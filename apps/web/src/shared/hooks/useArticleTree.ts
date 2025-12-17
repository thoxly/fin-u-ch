import { useMemo } from 'react';
import {
  useGetArticlesTreeQuery,
  useGetArticlesQuery,
} from '../../store/api/catalogsApi';
import { buildArticleTree, getLeafArticles } from '../lib/articleTree';
import type { ArticleTreeNode, ArticleTreeFilter } from '../types/articleTree';

/**
 * Хук для получения статей в виде дерева
 * @param filters - Фильтры для статей
 * @returns Объект с деревом статей, состоянием загрузки и ошибкой
 *
 * @example
 * ```tsx
 * const { tree, isLoading, error } = useArticleTree({ type: 'expense' });
 *
 * if (isLoading) return <Loader />;
 * if (error) return <Error message={error} />;
 *
 * return <ArticleTree tree={tree} />;
 * ```
 */
export function useArticleTree(filters?: ArticleTreeFilter) {
  const {
    data: treeData = [],
    isLoading,
    error,
    refetch,
  } = useGetArticlesTreeQuery(filters);

  // Преобразуем данные в правильный формат
  const tree = useMemo(() => {
    if (!treeData || treeData.length === 0) {
      return [];
    }

    // Если данные уже в виде дерева (с children), используем как есть
    const hasTreeStructure = treeData.some(
      (article) => 'children' in article && Array.isArray(article.children)
    );

    if (hasTreeStructure) {
      // Статьи уже в виде дерева, но нужно убедиться, что это ArticleTreeNode[]
      return treeData as ArticleTreeNode[];
    }

    // Преобразуем плоский список в дерево (fallback)
    return buildArticleTree(treeData);
  }, [treeData]);

  return {
    tree,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Хук для получения только листьев (статей без дочерних)
 * Полезен для селектов выбора статьи в операциях
 * @param filters - Фильтры для статей
 * @returns Объект с массивом листьев, состоянием загрузки и ошибкой
 *
 * @example
 * ```tsx
 * const { leafArticles, isLoading } = useLeafArticles({ type: 'expense' });
 *
 * <Select
 *   options={leafArticles.map(a => ({ value: a.id, label: a.name }))}
 * />
 * ```
 */
export function useLeafArticles(filters?: ArticleTreeFilter) {
  const {
    data: articles = [],
    isLoading,
    error,
    refetch,
  } = useGetArticlesQuery(filters);

  // Фильтруем только листья
  const leafArticles = useMemo(() => {
    if (!articles || articles.length === 0) {
      return [];
    }

    return getLeafArticles(articles);
  }, [articles]);

  return {
    leafArticles,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Хук для получения плоского списка статей (без преобразования в дерево)
 * @param filters - Фильтры для статей
 * @returns Объект с массивом статей, состоянием загрузки и ошибкой
 */
export function useArticles(filters?: ArticleTreeFilter) {
  const {
    data: articles = [],
    isLoading,
    error,
    refetch,
  } = useGetArticlesQuery(filters);

  return {
    articles,
    isLoading,
    error,
    refetch,
  };
}
