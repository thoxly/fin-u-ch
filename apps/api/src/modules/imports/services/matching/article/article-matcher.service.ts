import prisma from '../../../../../config/db';
import { ParsedDocument } from '../../../parsers/clientBankExchange.parser';
import { MatchResult } from '../matching.types';
import { matchArticleByRules } from './article-rules-matcher.service';
import { matchArticleByKeywords } from './article-keyword-matcher.service';

/**
 * Сопоставляет статью по правилам и ключевым словам
 */
export async function matchArticle(
  companyId: string,
  operation: ParsedDocument,
  direction: 'income' | 'expense' | 'transfer' | null
): Promise<MatchResult | null> {
  // Определяем тип статьи на основе направления
  // Если direction = null, пробуем оба типа
  const articleTypes: Array<'income' | 'expense'> = [];

  if (direction === 'income') {
    articleTypes.push('income');
  } else if (direction === 'expense') {
    articleTypes.push('expense');
  } else {
    // Если direction не определен, пробуем оба типа
    articleTypes.push('expense', 'income');
  }

  if (articleTypes.length === 0) {
    return null;
  }

  const purpose = operation.purpose || '';

  // 1. Сопоставление по правилам маппинга (с правильным приоритетом)
  const ruleMatch = await matchArticleByRules(
    companyId,
    purpose,
    articleTypes,
    direction
  );

  if (ruleMatch) {
    return ruleMatch;
  }

  // 2. Сопоставление по ключевым словам (предустановленные правила)
  // Предзагружаем все статьи компании для оптимизации
  const articles = await prisma.article.findMany({
    where: {
      companyId,
      isActive: true,
      type: { in: articleTypes },
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  // Создаем карту для быстрого поиска
  const articlesMap = new Map<
    string,
    { id: string; name: string; type: string }
  >();
  for (const article of articles) {
    articlesMap.set(article.id, article);
  }

  const keywordMatch = await matchArticleByKeywords(
    companyId,
    purpose,
    articleTypes,
    direction,
    articlesMap
  );

  if (keywordMatch) {
    return keywordMatch;
  }

  return null;
}
