import prisma from '../../../../../config/db';
import logger from '../../../../../config/logger';
import { MatchResult } from '../matching.types';

/**
 * Сопоставляет статью по правилам маппинга
 */
export async function matchArticleByRules(
  companyId: string,
  purpose: string,
  articleTypes: Array<'income' | 'expense'>,
  direction: 'income' | 'expense' | 'transfer' | null
): Promise<MatchResult | null> {
  // Приоритет 1: equals (самый точный)
  const equalsRules = await prisma.mappingRule.findMany({
    where: {
      companyId,
      targetType: 'article',
      sourceField: 'description',
      ruleType: 'equals',
    },
  });

  logger.debug('[ПОИСК ПРАВИЛ] Статья (equals)', {
    companyId,
    purpose,
    articleTypes,
    direction,
    rulesCount: equalsRules.length,
    rules: equalsRules.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      targetId: r.targetId,
      targetName: r.targetName,
    })),
  });

  for (const rule of equalsRules) {
    if (purpose.toLowerCase() === rule.pattern.toLowerCase() && rule.targetId) {
      // Пробуем найти статью для каждого типа
      for (const articleType of articleTypes) {
        const article = await prisma.article.findFirst({
          where: {
            id: rule.targetId,
            companyId,
            type: articleType,
            isActive: true,
          },
        });

        if (article) {
          await prisma.mappingRule.update({
            where: { id: rule.id, companyId },
            data: {
              usageCount: { increment: 1 },
              lastUsedAt: new Date(),
            },
          });

          logger.info('[ПРАВИЛО ПРИМЕНЕНО] Статья (equals)', {
            ruleId: rule.id,
            rulePattern: rule.pattern,
            ruleType: rule.ruleType,
            targetId: rule.targetId,
            targetName: rule.targetName,
            articleId: article.id,
            articleName: article.name,
            articleType: article.type,
            purpose: purpose,
            direction,
          });

          return {
            id: article.id,
            matchedBy: 'rule',
            ruleId: rule.id,
          };
        }
      }
    }
  }

  // Приоритет 2: regex (гибкий, но точный)
  const regexRules = await prisma.mappingRule.findMany({
    where: {
      companyId,
      targetType: 'article',
      sourceField: 'description',
      ruleType: 'regex',
    },
  });

  logger.debug('[ПОИСК ПРАВИЛ] Статья (regex)', {
    companyId,
    purpose,
    articleTypes,
    direction,
    rulesCount: regexRules.length,
    rules: regexRules.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      targetId: r.targetId,
      targetName: r.targetName,
    })),
  });

  for (const rule of regexRules) {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(purpose) && rule.targetId) {
        // Пробуем найти статью для каждого типа
        for (const articleType of articleTypes) {
          const article = await prisma.article.findFirst({
            where: {
              id: rule.targetId,
              companyId,
              type: articleType,
              isActive: true,
            },
          });

          if (article) {
            await prisma.mappingRule.update({
              where: { id: rule.id, companyId },
              data: {
                usageCount: { increment: 1 },
                lastUsedAt: new Date(),
              },
            });

            logger.info('[ПРАВИЛО ПРИМЕНЕНО] Статья (regex)', {
              ruleId: rule.id,
              rulePattern: rule.pattern,
              ruleType: rule.ruleType,
              targetId: rule.targetId,
              targetName: rule.targetName,
              articleId: article.id,
              articleName: article.name,
              articleType: article.type,
              purpose: purpose,
              direction,
            });

            return {
              id: article.id,
              matchedBy: 'rule',
              ruleId: rule.id,
            };
          }
        }
      }
    } catch (e) {
      // Невалидное регулярное выражение - пропускаем
      logger.warn('[ПРАВИЛО ОШИБКА] Невалидное regex правило', {
        ruleId: rule.id,
        rulePattern: rule.pattern,
        error: e instanceof Error ? e.message : String(e),
      });
      continue;
    }
  }

  // Приоритет 3: contains (самый широкий)
  const containsRules = await prisma.mappingRule.findMany({
    where: {
      companyId,
      targetType: 'article',
      sourceField: 'description',
      ruleType: 'contains',
    },
  });

  logger.debug('[ПОИСК ПРАВИЛ] Статья (contains)', {
    companyId,
    purpose,
    articleTypes,
    direction,
    rulesCount: containsRules.length,
    rules: containsRules.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      targetId: r.targetId,
      targetName: r.targetName,
    })),
  });

  for (const rule of containsRules) {
    if (
      purpose.toLowerCase().includes(rule.pattern.toLowerCase()) &&
      rule.targetId
    ) {
      // Пробуем найти статью для каждого типа
      for (const articleType of articleTypes) {
        const article = await prisma.article.findFirst({
          where: {
            id: rule.targetId,
            companyId,
            type: articleType,
            isActive: true,
          },
        });

        if (article) {
          await prisma.mappingRule.update({
            where: { id: rule.id, companyId },
            data: {
              usageCount: { increment: 1 },
              lastUsedAt: new Date(),
            },
          });

          logger.info('[ПРАВИЛО ПРИМЕНЕНО] Статья (contains)', {
            ruleId: rule.id,
            rulePattern: rule.pattern,
            ruleType: rule.ruleType,
            targetId: rule.targetId,
            targetName: rule.targetName,
            articleId: article.id,
            articleName: article.name,
            articleType: article.type,
            purpose: purpose,
            direction,
          });

          return {
            id: article.id,
            matchedBy: 'rule',
            ruleId: rule.id,
          };
        }
      }
    }
  }

  return null;
}
