import prisma from '../../../../../config/db';
import logger from '../../../../../config/logger';
import { MatchResult } from '../matching.types';

/**
 * Сопоставляет контрагента по правилам маппинга
 */
export async function matchCounterpartyByRules(
  companyId: string,
  name: string,
  field: 'payer' | 'receiver',
  direction: 'income' | 'expense' | 'transfer' | null
): Promise<MatchResult | null> {
  // Приоритет 1: equals (самый точный)
  const equalsRules = await prisma.mappingRule.findMany({
    where: {
      companyId,
      targetType: 'counterparty',
      ruleType: 'equals',
      sourceField: field,
    },
  });

  logger.debug('[ПОИСК ПРАВИЛ] Контрагент (equals)', {
    companyId,
    nameToSearch: name,
    sourceField: field,
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
    if (name.toLowerCase() === rule.pattern.toLowerCase() && rule.targetId) {
      await prisma.mappingRule.update({
        where: { id: rule.id, companyId },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      logger.info('[ПРАВИЛО ПРИМЕНЕНО] Контрагент (equals)', {
        ruleId: rule.id,
        rulePattern: rule.pattern,
        ruleType: rule.ruleType,
        targetId: rule.targetId,
        targetName: rule.targetName,
        sourceField: field,
        operationName: name,
        direction,
      });

      return {
        id: rule.targetId,
        matchedBy: 'rule',
        ruleId: rule.id,
      };
    }
  }

  // Приоритет 2: alias (специальный тип для контрагентов)
  const aliasRules = await prisma.mappingRule.findMany({
    where: {
      companyId,
      targetType: 'counterparty',
      ruleType: 'alias',
      sourceField: field,
    },
  });

  logger.debug('[ПОИСК ПРАВИЛ] Контрагент (alias)', {
    companyId,
    nameToSearch: name,
    sourceField: field,
    direction,
    rulesCount: aliasRules.length,
    rules: aliasRules.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      targetId: r.targetId,
      targetName: r.targetName,
    })),
  });

  for (const rule of aliasRules) {
    if (
      name.toLowerCase().includes(rule.pattern.toLowerCase()) &&
      rule.targetId
    ) {
      await prisma.mappingRule.update({
        where: { id: rule.id, companyId },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      logger.info('[ПРАВИЛО ПРИМЕНЕНО] Контрагент (alias)', {
        ruleId: rule.id,
        rulePattern: rule.pattern,
        ruleType: rule.ruleType,
        targetId: rule.targetId,
        targetName: rule.targetName,
        sourceField: field,
        operationName: name,
        direction,
      });

      return {
        id: rule.targetId,
        matchedBy: 'rule',
        ruleId: rule.id,
      };
    }
  }

  // Приоритет 3: contains (самый широкий)
  const containsRules = await prisma.mappingRule.findMany({
    where: {
      companyId,
      targetType: 'counterparty',
      ruleType: 'contains',
      sourceField: field,
    },
  });

  logger.debug('[ПОИСК ПРАВИЛ] Контрагент (contains)', {
    companyId,
    nameToSearch: name,
    sourceField: field,
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
      name.toLowerCase().includes(rule.pattern.toLowerCase()) &&
      rule.targetId
    ) {
      await prisma.mappingRule.update({
        where: { id: rule.id, companyId },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      logger.info('[ПРАВИЛО ПРИМЕНЕНО] Контрагент (contains)', {
        ruleId: rule.id,
        rulePattern: rule.pattern,
        ruleType: rule.ruleType,
        targetId: rule.targetId,
        targetName: rule.targetName,
        sourceField: field,
        operationName: name,
        direction,
      });

      return {
        id: rule.targetId,
        matchedBy: 'rule',
        ruleId: rule.id,
      };
    }
  }

  return null;
}
