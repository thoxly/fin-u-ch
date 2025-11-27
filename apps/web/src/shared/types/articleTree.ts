import type { Article } from '@shared/types/catalogs';

/**
 * Узел дерева статей с обязательным полем children
 * Используется для представления иерархической структуры статей
 */
export interface ArticleTreeNode extends Article {
  children: ArticleTreeNode[];
}

/**
 * Фильтры для получения статей
 */
export interface ArticleTreeFilter {
  type?: 'income' | 'expense';
  activity?: 'operating' | 'investing' | 'financing';
  isActive?: boolean;
}
