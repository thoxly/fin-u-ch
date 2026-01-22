import prisma from '../../../../../config/db';
import logger from '../../../../../config/logger';
import { MatchResult } from '../matching.types';
import {
  KEYWORD_RULES,
  VAT_IN_PAYMENT_PATTERNS,
  PAYMENT_CONTEXT_KEYWORDS,
  TAX_PAYMENT_KEYWORDS,
} from './keyword-rules.config';

/**
 * Проверяет, является ли упоминание НДС частью оплаты, а не налоговым платежом
 */
function isVatInPayment(purpose: string): boolean {
  // Проверяем паттерны НДС в составе оплаты
  if (VAT_IN_PAYMENT_PATTERNS.some((pattern) => pattern.test(purpose))) {
    return true;
  }

  // Специальная проверка: если в тексте есть "т.ч." (в любом виде) и "НДС"
  const hasTchPattern = /т\.?\s*ч\.?/i.test(purpose);
  const purposeLower = purpose.toLowerCase();
  if (hasTchPattern && purposeLower.includes('ндс')) {
    return true;
  }

  // Дополнительная проверка: если в описании есть слова, указывающие на оплату услуг/товаров,
  // и при этом упоминается НДС, то это не налоговый платеж
  const hasPaymentContext = PAYMENT_CONTEXT_KEYWORDS.some((keyword) =>
    purposeLower.includes(keyword)
  );

  if (hasPaymentContext && purposeLower.includes('ндс')) {
    const isTaxPayment = TAX_PAYMENT_KEYWORDS.some((keyword) =>
      purposeLower.includes(keyword)
    );

    // Если нет явных признаков налогового платежа, это НДС в составе оплаты
    if (!isTaxPayment) {
      return true;
    }
  }

  return false;
}

/**
 * Сопоставляет статью по ключевым словам (предустановленные правила)
 */
export async function matchArticleByKeywords(
  companyId: string,
  purpose: string,
  articleTypes: Array<'income' | 'expense'>,
  direction: 'income' | 'expense' | 'transfer' | null,
  articlesMap: Map<string, { id: string; name: string; type: string }>
): Promise<MatchResult | null> {
  for (const keywordRule of KEYWORD_RULES) {
    const hasKeyword = keywordRule.keywords.some((keyword) =>
      purpose.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasKeyword) {
      // Специальная проверка для правила налогов: исключаем упоминания НДС в составе оплаты
      if (
        keywordRule.keywords.includes('ндс') &&
        keywordRule.articleNames.includes('Налоги')
      ) {
        if (isVatInPayment(purpose)) {
          continue;
        }
      }

      // Ищем статью по любому из возможных названий (используем предзагруженные статьи)
      // Пробуем для каждого типа статьи
      for (const articleType of articleTypes) {
        for (const articleName of keywordRule.articleNames) {
          // Ищем в предзагруженной карте статей
          for (const article of articlesMap.values()) {
            if (
              article.type === articleType &&
              article.name.toLowerCase().includes(articleName.toLowerCase())
            ) {
              logger.info('[ПРАВИЛО ПРИМЕНЕНО] Статья (keyword)', {
                articleId: article.id,
                articleName: article.name,
                articleType: article.type,
                keywordRule: keywordRule.keywords.join(', '),
                purpose,
                direction,
              });
              return {
                id: article.id,
                matchedBy: 'keyword',
              };
            }
          }
        }
      }
    }
  }

  return null;
}
